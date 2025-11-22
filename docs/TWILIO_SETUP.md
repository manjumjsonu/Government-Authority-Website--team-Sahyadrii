# Twilio Integration Setup Guide

## Overview
This document explains how to set up and use the Twilio integration for Missed Call → SMS Flow, OTP Verification, and Phone Masking.

## Prerequisites
1. Twilio Account (sign up at https://www.twilio.com)
2. Twilio Phone Number (purchased from Twilio)
3. Twilio Verify Service (for OTP)
4. Twilio Proxy Service (for phone masking)

## Setup Steps

### 1. Twilio Account Setup

1. Sign up for a Twilio account
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number that supports SMS

### 2. Configure Twilio Verify Service

1. Go to Twilio Console → Verify → Services
2. Create a new Verify Service
3. Copy the Service SID (starts with `VA`)
4. Set this as `TWILIO_VERIFY_SERVICE_SID` in your environment

### 3. Configure Twilio Proxy Service

1. Go to Twilio Console → Proxy → Services
2. Create a new Proxy Service
3. Copy the Service SID (starts with `KS`)
4. Purchase at least one phone number for the Proxy Service
5. Set this as `TWILIO_PROXY_SERVICE_SID` in your environment

### 3.5. Configure Twilio Messaging Service (Recommended)

1. Go to Twilio Console → Messaging → Services
2. Create a new Messaging Service or use existing one
3. Copy the Service SID (starts with `MG`)
4. Add phone numbers to the messaging service
5. Set this as `TWILIO_MESSAGING_SERVICE_SID` in your environment

**Current Configuration:**
- **Service Name**: My New Notifications Service
- **Service SID**: `MGee7dd1461de71cc4b1a6a5b9f1637ada`
- **Use Case**: Notify my users
- **Phone Number**: `+1 314 248 4184` (formatted as `+13142484184` in API)

**Benefits of using Messaging Service:**
- Better deliverability rates
- Support for multiple phone numbers
- Automatic number selection
- Better compliance handling

### 4. Configure Webhook URLs

#### Missed Call Webhook
1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. Select your Twilio phone number: **+1 314 248 4184**
3. Under "Voice & Fax", set the webhook URL:
   ```
   https://wgxbqtdkeqxjgcbycsob.supabase.co/functions/v1/make-server-e097b8bf/twilio/calls
   ```
4. Set HTTP method to `POST`
5. Click **Save**

#### SMS Status Callback (Optional)
The status callback is automatically set in the code when sending SMS.

### 5. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=MGee7dd1461de71cc4b1a6a5b9f1637ada
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PROXY_SERVICE_SID=KSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BASE_URL=https://your-domain.com
```

**Note:** `TWILIO_MESSAGING_SERVICE_SID` is recommended for better SMS deliverability. The code will automatically use it if configured, otherwise it will fall back to `TWILIO_PHONE_NUMBER`.

## API Endpoints

### 1. Missed Call Webhook
- **Endpoint**: `POST /make-server-e097b8bf/twilio/calls`
- **Description**: Twilio webhook for incoming calls
- **Authentication**: None (Twilio webhook)
- **Request**: Twilio form data
- **Response**: TwiML XML

### 2. SMS Status Webhook
- **Endpoint**: `POST /make-server-e097b8bf/twilio/sms-status`
- **Description**: Twilio webhook for SMS delivery status
- **Authentication**: None (Twilio webhook)
- **Request**: Twilio form data
- **Response**: `OK`

### 3. Send OTP
- **Endpoint**: `POST /make-server-e097b8bf/auth/send-otp`
- **Description**: Send OTP to phone number
- **Authentication**: None (public endpoint)
- **Request Body**:
  ```json
  {
    "phone": "+1234567890"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "sid": "VE...",
    "status": "pending"
  }
  ```

### 4. Verify OTP
- **Endpoint**: `POST /make-server-e097b8bf/auth/verify-otp`
- **Description**: Verify OTP code
- **Authentication**: None (public endpoint)
- **Request Body**:
  ```json
  {
    "phone": "+1234567890",
    "code": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "verified": true,
    "status": "approved"
  }
  ```

### 5. Create Proxy Session
- **Endpoint**: `POST /make-server-e097b8bf/twilio/proxy/create-session`
- **Description**: Create masked call session
- **Authentication**: Required (Bearer token)
- **Request Body**:
  ```json
  {
    "vendorId": "vendor123",
    "farmerId": "farmer456",
    "vendorPhone": "+1234567890",
    "farmerPhone": "+0987654321"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "session": {
      "id": "session_...",
      "proxy_number": "+1111111111",
      "session_sid": "KC..."
    }
  }
  ```

### 6. End Proxy Session
- **Endpoint**: `POST /make-server-e097b8bf/twilio/proxy/end-session`
- **Description**: End masked call session
- **Authentication**: Required (Bearer token)
- **Request Body**:
  ```json
  {
    "sessionId": "session_123"
  }
  ```

## Testing

### Test Missed Call Flow

1. Call your Twilio phone number
2. Let it ring once and hang up
3. Check logs for SMS being sent
4. Farmer should receive SMS with crop prices

### Test OTP Flow

```bash
# Send OTP
curl -X POST https://your-domain.com/make-server-e097b8bf/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# Verify OTP
curl -X POST https://your-domain.com/make-server-e097b8bf/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "code": "123456"}'
```

### Test Proxy Session

```bash
curl -X POST https://your-domain.com/make-server-e097b8bf/twilio/proxy/create-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vendorId": "vendor123",
    "farmerId": "farmer456",
    "vendorPhone": "+1234567890",
    "farmerPhone": "+0987654321"
  }'
```

## SMS Templates

### English Template
```
Ragi ₹28/kg, Rice ₹25/kg. Token available at Hobli office. Helpline: 1800-XXX-XXXX
```

### Kannada Template (for future)
```
ರಾಗಿ ₹28/ಕೆಜಿ, ಅಕ್ಕಿ ₹25/ಕೆಜಿ. ಹೊಬಳಿ ಕಚೇರಿಯಲ್ಲಿ ಟೋಕನ್ ಲಭ್ಯ. ಸಹಾಯ ಸಾಲು: 1800-XXX-XXXX
```

### Hindi Template (for future)
```
रागी ₹28/किलो, चावल ₹25/किलो. होबली कार्यालय में टोकन उपलब्ध. हेल्पलाइन: 1800-XXX-XXXX
```

## Troubleshooting

### SMS Not Sending
1. Check Twilio credentials in environment variables
2. Verify phone number format (must include country code)
3. Check Twilio console for error logs
4. Verify webhook URL is accessible

### OTP Not Working
1. Verify Twilio Verify Service SID is correct
2. Check phone number format
3. Verify service is active in Twilio console

### Proxy Session Not Creating
1. Verify Proxy Service SID is correct
2. Ensure phone numbers are purchased for Proxy Service
3. Check authentication token

## Security Notes

1. **DND Compliance**: All SMS messages are informational only, no promotional content
2. **Deduplication**: 10-minute window prevents spam from multiple missed calls
3. **Phone Validation**: Phone numbers are normalized and validated
4. **Rate Limiting**: Consider adding rate limiting for OTP endpoints

## Cost Considerations

- **Missed Call SMS**: ~₹0.50-1.00 per SMS (varies by country)
- **OTP SMS**: ~₹0.50-1.00 per SMS
- **Proxy Calls**: ~₹1.00-2.00 per minute
- **Phone Number**: ~₹500-1000/month (one-time setup)

## Support

For issues or questions:
1. Check Twilio Console logs
2. Review application logs
3. Contact Twilio support for account issues

