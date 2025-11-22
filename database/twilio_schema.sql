-- ============================================
-- Twilio Integration Database Schema
-- ============================================

-- MessageLog Table
-- Stores all SMS messages sent via Twilio
CREATE TABLE IF NOT EXISTS message_log (
    id VARCHAR(255) PRIMARY KEY,
    to_phone VARCHAR(20) NOT NULL,
    service_sid VARCHAR(100) NOT NULL UNIQUE,
    message_type VARCHAR(50) NOT NULL, -- 'missed_call_response', 'otp', 'transactional'
    snippet TEXT, -- First 100 chars of message
    status VARCHAR(50) NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'failed'
    failure_reason TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_to_phone (to_phone),
    INDEX idx_service_sid (service_sid),
    INDEX idx_timestamp (timestamp)
);

-- PhoneMaskSession Table
-- Stores Twilio Proxy sessions for masked calls between vendors and farmers
CREATE TABLE IF NOT EXISTS phone_mask_session (
    id VARCHAR(255) PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL,
    farmer_id VARCHAR(255) NOT NULL,
    proxy_number VARCHAR(20) NOT NULL,
    session_sid VARCHAR(100) NOT NULL UNIQUE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_farmer_id (farmer_id),
    INDEX idx_session_sid (session_sid),
    INDEX idx_started_at (started_at)
);

-- CropPrice Table (if not exists)
-- Stores crop prices by hobli
CREATE TABLE IF NOT EXISTS crop_price (
    id VARCHAR(255) PRIMARY KEY,
    crop_id VARCHAR(255) NOT NULL,
    crop_type VARCHAR(100) NOT NULL,
    hobli_id VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_crop_type (crop_type),
    INDEX idx_hobli_id (hobli_id)
);

-- Farmers Table (if not exists)
-- Main farmers table
CREATE TABLE IF NOT EXISTS farmers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    survey_number VARCHAR(100) NOT NULL UNIQUE,
    hobli_id VARCHAR(255),
    village VARCHAR(255),
    district VARCHAR(255),
    taluk VARCHAR(255),
    state VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_survey_number (survey_number),
    INDEX idx_hobli_id (hobli_id)
);

-- OTP Verification Log (optional, for tracking)
CREATE TABLE IF NOT EXISTS otp_verification_log (
    id VARCHAR(255) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    verification_sid VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'expired', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    INDEX idx_phone (phone),
    INDEX idx_verification_sid (verification_sid)
);

