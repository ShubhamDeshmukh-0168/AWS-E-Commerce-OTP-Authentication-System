-- Create database if not exists
CREATE DATABASE IF NOT EXISTS cloud;

-- Use the database
USE cloud;

-- Drop users table if already exists
DROP TABLE IF EXISTS users;

-- Create users table
-- NOTE: full_name removed (the app never collects or inserts it).
-- If you want a full name field, add it to the signup form AND to the
-- INSERT statement in app.py's signup_verify() at the same time.
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6),
    otp_expiry DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
