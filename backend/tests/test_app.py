import sys
import os
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import app as flask_app


@pytest.fixture
def client():
    flask_app.app.config["TESTING"] = True
    with flask_app.app.test_client() as client:
        yield client


def test_health_check(client):
    response = client.get("/api")
    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"


def test_signup_request_missing_fields(client):
    response = client.post("/api/signup/request", json={"email": "test@example.com"})
    assert response.status_code == 400


@patch("app.mail.send")
@patch("app.get_db_connection")
def test_signup_request_success(mock_get_conn, mock_mail_send, client):
    mock_cursor = MagicMock()
    mock_cursor.__enter__.return_value = mock_cursor
    mock_cursor.fetchone.return_value = None  # no existing user

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_get_conn.return_value = mock_conn

    response = client.post("/api/signup/request", json={
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "securepass123"
    })

    assert response.status_code == 200
    assert "OTP sent" in response.get_json()["message"]
    mock_mail_send.assert_called_once()


@patch("app.get_db_connection")
def test_signup_request_existing_user(mock_get_conn, client):
    mock_cursor = MagicMock()
    mock_cursor.__enter__.return_value = mock_cursor
    mock_cursor.fetchone.return_value = {"id": 1}  # already exists

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_get_conn.return_value = mock_conn

    response = client.post("/api/signup/request", json={
        "email": "existing@example.com",
        "username": "existing",
        "password": "securepass123"
    })

    assert response.status_code == 400
    assert "already in use" in response.get_json()["error"]


def test_signup_verify_missing_fields(client):
    response = client.post("/api/signup/verify", json={"email": "test@example.com"})
    assert response.status_code == 400


def test_signup_verify_no_pending_user(client):
    response = client.post("/api/signup/verify", json={
        "email": "nopending@example.com",
        "otp": "123456"
    })
    assert response.status_code == 401


@patch("app.get_db_connection")
def test_signup_verify_success(mock_get_conn, client):
    # Seed a pending signup directly, bypassing the request step.
    from datetime import datetime, timedelta
    flask_app.pending_users["verifyme@example.com"] = {
        "username": "verifyme",
        "password": "hashedpw",
        "otp": "111111",
        "expiry": datetime.now() + timedelta(minutes=10),
    }

    mock_cursor = MagicMock()
    mock_cursor.__enter__.return_value = mock_cursor

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_get_conn.return_value = mock_conn

    response = client.post("/api/signup/verify", json={
        "email": "verifyme@example.com",
        "otp": "111111"
    })

    assert response.status_code == 201
    assert "successfully" in response.get_json()["message"]
    mock_conn.commit.assert_called_once()


def test_login_request_missing_fields(client):
    response = client.post("/api/login/request", json={"email": "test@example.com"})
    assert response.status_code == 400


@patch("app.get_db_connection")
def test_login_request_invalid_credentials(mock_get_conn, client):
    mock_cursor = MagicMock()
    mock_cursor.__enter__.return_value = mock_cursor
    mock_cursor.fetchone.return_value = None  # no user found

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_get_conn.return_value = mock_conn

    response = client.post("/api/login/request", json={
        "email": "nouser@example.com",
        "password": "wrongpass"
    })

    assert response.status_code == 401


def test_login_verify_missing_fields(client):
    response = client.post("/api/login/verify", json={"email": "test@example.com"})
    assert response.status_code == 400


@patch("app.get_db_connection")
def test_login_verify_invalid_otp(mock_get_conn, client):
    mock_cursor = MagicMock()
    mock_cursor.__enter__.return_value = mock_cursor
    mock_cursor.fetchone.return_value = None

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_get_conn.return_value = mock_conn

    response = client.post("/api/login/verify", json={
        "email": "someone@example.com",
        "otp": "000000"
    })

    assert response.status_code == 401
