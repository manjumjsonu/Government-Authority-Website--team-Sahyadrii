# Twilio Integration - Complete Implementation

## 📋 Overview

This implementation provides a complete Twilio integration for:
1. **Missed Call → SMS Flow**: Farmers call, get SMS with crop prices
2. **OTP Verification**: Using Twilio Verify service
3. **Phone Masking**: Using Twilio Proxy for vendor-farmer calls

## 🚀 Quick Start

### 1. Install Dependencies

The Twilio SDK is already included via npm imports in Deno. No additional installation needed.

### 2. Environment Variables

Create a `.env` file or set these in your deployment environment:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PROXY_SERVICE_SID=KSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Application
BASE_URL=https://your-domain.com

# Supabase (existing)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database Setup

Run the SQL schema from `database/twilio_schema.sql` in your database.

### 4. Configure Twilio Webhooks

1. Go to Twilio Console → Phone Numbers
2. Select your phone number
3. Set Voice webhook URL to:
   ```
   https://your-domain.com/make-server-e097b8bf/twilio/calls
   ```
4. Method: POST

## 📁 File Structure

```
src/supabase/functions/server/
├── twilio.tsx          # Main Twilio integration
├── routes.tsx          # Existing routes
└── index.tsx           # Server entry point

database/
└── twilio_schema.sql   # Database schema

docs/
├── TWILIO_SETUP.md     # Detailed setup guide
├── TWILIO_TESTING.md   # Testing guide
├── SMS_TEMPLATES.md    # SMS message templates
└── TWILIO_README.md    # This file
```

## 🔌 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/make-server-e097b8bf/twilio/calls` | Twilio webhook for missed calls |
| POST | `/make-server-e097b8bf/twilio/sms-status` | Twilio webhook for SMS status |
| POST | `/make-server-e097b8bf/auth/send-otp` | Send OTP to phone |
| POST | `/make-server-e097b8bf/auth/verify-otp` | Verify OTP code |

### Protected Endpoints (Require Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/make-server-e097b8bf/twilio/proxy/create-session` | Create masked call session |
| POST | `/make-server-e097b8bf/twilio/proxy/end-session` | End masked call session |

## 🔄 Flow Diagrams

### Missed Call → SMS Flow

```
1. Farmer calls Twilio number
   ↓
2. Call rings < 2 seconds (missed call)
   ↓
3. Twilio sends webhook to /twilio/calls
   ↓
4. System checks:
   - Is it a missed call? ✓
   - SMS sent recently? (10 min window)
   - Farmer exists? ✓
   ↓
5. Get farmer's crop prices from DB
   ↓
6. Compose SMS (≤160 chars, DND safe)
   ↓
7. Send SMS via Twilio
   ↓
8. Log message in DB
   ↓
9. Respond to Twilio immediately
   ↓
10. SMS delivered to farmer
```

### OTP Verification Flow

```
1. User requests OTP
   POST /auth/send-otp { phone: "+123..." }
   ↓
2. System calls Twilio Verify API
   ↓
3. Twilio sends OTP SMS
   ↓
4. User enters code
   POST /auth/verify-otp { phone: "+123...", code: "123456" }
   ↓
5. System verifies with Twilio
   ↓
6. Return success/failure
```

### Phone Masking Flow

```
1. Vendor creates proxy session
   POST /twilio/proxy/create-session
   ↓
2. System creates Twilio Proxy session
   ↓
3. Add vendor and farmer as participants
   ↓
4. Get proxy phone number
   ↓
5. Store session in DB (2 hour expiry)
   ↓
6. Vendor calls proxy number
   ↓
7. Twilio routes to farmer
   ↓
8. Both see proxy number only
```

## 🧪 Testing

See `docs/TWILIO_TESTING.md` for detailed testing instructions.

### Quick Test

```bash
# Test OTP
curl -X POST https://your-domain.com/make-server-e097b8bf/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

## 📊 Database Tables

### message_log
Stores all SMS messages sent via Twilio.

### phone_mask_session
Stores Twilio Proxy sessions for masked calls.

### otp_verification_log
Tracks OTP verification attempts.

See `database/twilio_schema.sql` for full schema.

## 🔒 Security Features

1. **Deduplication**: 10-minute window prevents SMS spam
2. **DND Compliance**: All SMS are informational only
3. **Phone Validation**: Numbers are normalized and validated
4. **Authentication**: Proxy endpoints require auth tokens
5. **Error Handling**: Graceful failures, no data leaks

## 💰 Cost Estimates

- **SMS**: ~₹0.50-1.00 per message
- **OTP**: ~₹0.50-1.00 per OTP
- **Proxy Calls**: ~₹1.00-2.00 per minute
- **Phone Number**: ~₹500-1000/month

## 🐛 Troubleshooting

### SMS Not Sending
- Check Twilio account balance
- Verify phone number format (+country code)
- Check Twilio console logs
- Verify webhook URL is accessible

### OTP Not Working
- Verify Service SID is correct
- Check phone number verification (trial accounts)
- Verify code expiration (10 minutes)

### Proxy Session Fails
- Proxy Service SID is correct
- Phone numbers purchased for Proxy Service
- Authentication token valid

## 📚 Additional Documentation

- `TWILIO_SETUP.md` - Detailed setup instructions
- `TWILIO_TESTING.md` - Testing guide with examples
- `SMS_TEMPLATES.md` - SMS message templates

## 🔄 Integration with Existing System

The Twilio integration seamlessly integrates with:
- Existing farmer management system
- Crop price management
- Authentication system
- KV store for session management

## 📝 Notes

- All SMS messages are DND compliant (informational only)
- Deduplication prevents spam from multiple missed calls
- Proxy sessions auto-expire after 2 hours
- OTP codes expire after 10 minutes
- All webhooks respond immediately to Twilio

## 🆘 Support

For issues:
1. Check application logs
2. Check Twilio Console logs
3. Review error messages in responses
4. Contact Twilio support for account issues

