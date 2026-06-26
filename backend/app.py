import random
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
import pymysql
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ---------------- CONFIGURATION ----------------
db_config = {
    "host": "database-sd.cpsioqmiq6qc.us-west-2.rds.amazonaws.com",
    "user": "admin",
    "password": "Cloud123",
    "database": "cloud"
}

app.config.update(
    MAIL_SERVER='smtp.gmail.com',
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME='shubhamndeshmukh02@gmail.com',
    MAIL_PASSWORD='ilnrslwqvhhiozep'
)
mail = Mail(app)

DEBUG_MODE = True

# In-memory store for pending signups (dev only — resets on restart)
pending_users = {}


def get_db_connection():
    return pymysql.connect(
        host=db_config["host"],
        user=db_config["user"],
        password=db_config["password"],
        database=db_config["database"],
        cursorclass=pymysql.cursors.DictCursor,
    )


# ---------------- HEALTH CHECK ----------------
@app.route("/api", methods=["GET"])
@app.route("/api/", methods=["GET"])
def api_root():
    return jsonify({
        "message": "API is running successfully",
        "status": "healthy",
        "service": "Google Store Backend",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }), 200


# ---------------- SIGNUP (2 STEPS) ----------------

@app.route("/api/signup/request", methods=["POST"])
def signup_request():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    username = data.get("username")
    password = data.get("password")

    if not email or not username or not password:
        return jsonify({"error": "email, username and password are required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM users WHERE email = %s OR username = %s",
                (email, username),
            )
            if cursor.fetchone():
                return jsonify({"error": "Username or email already in use"}), 400
    except Exception:
        logger.exception("DB error checking existing user during signup_request")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if conn:
            conn.close()

    otp = str(random.randint(100000, 999999))

    pending_users[email] = {
        "username": username,
        "password": generate_password_hash(password),
        "otp": otp,
        "expiry": datetime.now() + timedelta(minutes=10),
    }

    try:
        msg = Message(
            "Google Store - Verify Registration",
            sender=app.config['MAIL_USERNAME'],
            recipients=[email],
        )
        msg.body = f"Hello {username}, your registration OTP is {otp}. It expires in 10 minutes."
        mail.send(msg)
        return jsonify({"message": "OTP sent to email!"}), 200
    except Exception:
        logger.exception("Failed to send signup OTP email")
        pending_users.pop(email, None)
        return jsonify({"error": "Failed to send OTP email"}), 500


@app.route("/api/signup/verify", methods=["POST"])
def signup_verify():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    user_otp = data.get("otp")

    if not email or not user_otp:
        return jsonify({"error": "email and otp are required"}), 400

    user = pending_users.get(email)
    if not (user and user['otp'] == user_otp and datetime.now() < user['expiry']):
        return jsonify({"error": "Invalid or expired OTP"}), 401

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)"
            cursor.execute(sql, (user['username'], email, user['password']))
        conn.commit()
        del pending_users[email]
        return jsonify({"message": "Account created successfully!"}), 201
    except pymysql.err.IntegrityError:
        return jsonify({"error": "Username or email already in use"}), 400
    except Exception:
        logger.exception("DB error during signup_verify")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if conn:
            conn.close()


# ---------------- LOGIN (2 STEPS) ----------------

@app.route("/api/login/request", methods=["POST"])
def login_request():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    conn = None
    otp = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()

            if not user or not check_password_hash(user["password"], password):
                return jsonify({"error": "Invalid credentials"}), 401

            otp = str(random.randint(100000, 999999))
            expiry = datetime.now() + timedelta(minutes=5)

            cursor.execute(
                "UPDATE users SET otp_code = %s, otp_expiry = %s WHERE email = %s",
                (otp, expiry, email),
            )
        conn.commit()
    except Exception:
        logger.exception("DB error during login_request")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if conn:
            conn.close()

    try:
        msg = Message(
            "Google Store - Login OTP",
            sender=app.config['MAIL_USERNAME'],
            recipients=[email],
        )
        msg.body = f"Your login OTP is {otp}. It expires in 5 minutes."
        mail.send(msg)
        return jsonify({"message": "OTP sent to email"}), 200
    except Exception:
        logger.exception("Failed to send login OTP email")
        return jsonify({"error": "Failed to send OTP email"}), 500


@app.route("/api/login/verify", methods=["POST"])
def login_verify():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    user_otp = data.get("otp")

    if not email or not user_otp:
        return jsonify({"error": "email and otp are required"}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM users WHERE email = %s AND otp_code = %s",
                (email, user_otp),
            )
            user = cursor.fetchone()

        if user and user["otp_expiry"] and datetime.now() < user["otp_expiry"]:
            return jsonify({
                "message": "Login successful",
                "user": {"username": user["username"], "email": user["email"]},
            }), 200

        return jsonify({"error": "Invalid or expired OTP"}), 401
    except Exception:
        logger.exception("DB error during login_verify")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=DEBUG_MODE)
