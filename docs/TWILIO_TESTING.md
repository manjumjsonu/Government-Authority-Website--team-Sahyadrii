# Twilio Integration Testing Guide

## Postman Collection

### 1. Send OTP

**Request:**
```
POST https://your-domain.com/make-server-e097b8bf/auth/send-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

**Expected Response:**
```json
{
  "success": true,
  "sid": "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "pending"
}
```

### 2. Verify OTP

**Request:**
```
POST https://your-domain.com/make-server-e097b8bf/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "code": "123456"
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "verified": true,
  "status": "approved"
}
```

**Expected Response (Failure):**
```json
{
  "success": false,
  "verified": false,
  "status": "pending",
  "error": "Invalid or expired OTP"
}
```

### 3. Create Proxy Session

**Request:**
```
POST https://your-domain.com/make-server-e097b8bf/twilio/proxy/create-session
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json

{
  "vendorId": "vendor_123",
  "farmerId": "farmer_456",
  "vendorPhone": "+919876543210",
  "farmerPhone": "+919123456789"
}
```

**Expected Response:**
```json
{
  "success": true,
  "session": {
    "id": "session_1234567890",
    "vendor_id": "vendor_123",
    "farmer_id": "farmer_456",
    "proxy_number": "+11111111111",
    "session_sid": "KCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "started_at": "2025-01-21T10:00:00.000Z",
    "ended_at": null
  }
}
```

### 4. End Proxy Session

**Request:**
```
POST https://your-domain.com/make-server-e097b8bf/twilio/proxy/end-session
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json

{
  "sessionId": "session_1234567890"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Session ended"
}
```

## cURL Examples

### Send OTP
```bash
curl -X POST https://your-domain.com/make-server-e097b8bf/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210"
  }'
```

### Verify OTP
```bash
curl -X POST https://your-domain.com/make-server-e097b8bf/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "code": "123456"
  }'
```

### Create Proxy Session
```bash
curl -X POST https://your-domain.com/make-server-e097b8bf/twilio/proxy/create-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "vendorId": "vendor_123",
    "farmerId": "farmer_456",
    "vendorPhone": "+919876543210",
    "farmerPhone": "+919123456789"
  }'
```

## Testing Missed Call Flow

### Manual Testing
1. Ensure a farmer is registered with phone number in the system
2. Ensure the farmer has active crops with prices set
3. Call your Twilio phone number
4. Let it ring once (or less than 2 seconds)
5. Hang up
6. Check farmer's phone for SMS within 30 seconds

### Simulating Webhook (for development)

**Request:**
```
POST https://your-domain.com/make-server-e097b8bf/twilio/calls
Content-Type: application/x-www-form-urlencoded

From=+919876543210&CallStatus=no-answer&CallDuration=1&CallSid=CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Expected Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

### Testing SMS Status Webhook

**Request:**
```
POST https://your-domain.com/make-server-e097b8bf/twilio/sms-status
Content-Type: application/x-www-form-urlencoded

MessageSid=SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&MessageStatus=delivered&ErrorCode=&ErrorMessage=
```

**Expected Response:**
```
OK
```

## Test Scenarios

### Scenario 1: Successful Missed Call → SMS
1. Farmer calls Twilio number
2. Call rings < 2 seconds
3. System detects missed call
4. System finds farmer by phone
5. System gets crop prices
6. System sends SMS
7. ✅ Farmer receives SMS

### Scenario 2: Deduplication Test
1. Farmer calls and receives SMS
2. Farmer calls again within 10 minutes
3. System detects recent SMS
4. System skips sending SMS
5. ✅ No duplicate SMS sent

### Scenario 3: Farmer Not Found
1. Unknown number calls Twilio number
2. System cannot find farmer
3. System logs error
4. ✅ No SMS sent (no error to caller)

### Scenario 4: No Crop Prices
1. Farmer calls Twilio number
2. Farmer found but no crop prices
3. System sends default message
4. ✅ Farmer receives informational SMS

### Scenario 5: OTP Flow
1. User requests OTP
2. System sends OTP via Twilio Verify
3. User enters code
4. System verifies code
5. ✅ User authenticated

### Scenario 6: Proxy Session
1. Vendor creates proxy session
2. System creates Twilio Proxy session
3. System assigns proxy number
4. Vendor calls proxy number
5. System routes to farmer
6. ✅ Both parties see proxy number only

## Monitoring

### Check SMS Logs
Query the `message_log` table:
```sql
SELECT * FROM message_log 
WHERE to_phone = '+919876543210' 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Check Proxy Sessions
Query the `phone_mask_session` table:
```sql
SELECT * FROM phone_mask_session 
WHERE vendor_id = 'vendor_123' 
ORDER BY started_at DESC;
```

### Check OTP Logs
Query the `otp_verification_log` table:
```sql
SELECT * FROM otp_verification_log 
WHERE phone = '+919876543210' 
ORDER BY created_at DESC;
```

## Common Issues

### Issue: SMS Not Received
**Check:**
- Twilio account balance
- Phone number format (must include country code)
- DND status (informational SMS should work)
- Twilio console logs

### Issue: OTP Not Working
**Check:**
- Verify Service SID is correct
- Phone number is verified in Twilio (for trial accounts)
- Code expiration (OTP expires in 10 minutes)

### Issue: Proxy Session Fails
**Check:**
- Proxy Service SID is correct
- Phone numbers are purchased for Proxy Service
- Authentication token is valid

