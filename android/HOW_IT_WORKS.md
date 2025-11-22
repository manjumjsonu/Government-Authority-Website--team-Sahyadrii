# How the Missed Call Detection System Works

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MISSED CALL FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. 📞 INCOMING CALL
   └─> Someone calls the Android phone (with Jio SIM)
       └─> Android system broadcasts PHONE_STATE intent

2. 📱 ANDROID APP DETECTION
   └─> CallReceiver.kt receives the broadcast
       ├─> State: "RINGING" → Saves caller number
       └─> State: "IDLE" (after ringing) → Detects missed call
           └─> Triggers MainActivity or NetworkHelper

3. 🌐 HTTP POST TO BACKEND
   └─> POST https://wgxbqtdkeqxjgcbycsob.supabase.co/functions/v1/make-server-e097b8bf/api/missed-call
       Body: {"phone": "+919999999999"}
       └─> Backend receives the request

4. 🔍 BACKEND PROCESSING
   └─> Supabase Function (twilio.tsx)
       ├─> Step 1: Check deduplication (10-minute window)
       │   └─> If SMS sent recently → Skip
       │
       ├─> Step 2: Lookup farmer by phone number
       │   └─> Search in KV store: farmer:phone:{phone}
       │   └─> If not found → Return error
       │
       ├─> Step 3: Get farmer's crop information
       │   └─> Extract crops from farmer data
       │
       ├─> Step 4: Get crop prices from database
       │   └─> Match crop types with current rates
       │
       ├─> Step 5: Compose SMS message
       │   └─> Format: "Rice ₹2500/quintal, Wheat ₹2200/quintal. Token at Hobli office. Helpline: 1800-XXX-XXXX"
       │   └─> Ensure ≤160 characters (SMS limit)
       │
       ├─> Step 6: Send SMS via Twilio
       │   └─> Call Twilio API to send SMS
       │   └─> Get message SID (tracking ID)
       │
       └─> Step 7: Log the SMS
           └─> Save to KV store for tracking
           └─> Update last SMS timestamp (for deduplication)

5. 📨 SMS DELIVERY
   └─> Twilio sends SMS to the caller's phone
       └─> Caller receives crop prices and information

6. ✅ COMPLETION
   └─> Backend returns success response
       └─> Android app updates UI (if active)
```

## 📱 Android App Components

### 1. CallReceiver.kt
**Purpose**: Listens for phone state changes

```kotlin
// How it works:
1. Registers as BroadcastReceiver in AndroidManifest.xml
2. Listens for "android.intent.action.PHONE_STATE" broadcasts
3. Tracks call states:
   - RINGING → Saves incoming number
   - IDLE → If previous state was RINGING, it's a missed call
4. When missed call detected:
   - Opens MainActivity OR
   - Calls NetworkHelper.postMissedCall() directly
```

**Key Code**:
```kotlin
if (state == TelephonyManager.EXTRA_STATE_RINGING) {
    lastState = "RINGING"
    savedNumber = incomingNumber  // Save the caller's number
} 
else if (state == TelephonyManager.EXTRA_STATE_IDLE) {
    if (lastState == "RINGING") {
        // Missed call detected!
        // Send to backend
    }
}
```

### 2. MainActivity.kt
**Purpose**: UI and permission handling

```kotlin
// Responsibilities:
1. Requests runtime permissions (READ_PHONE_STATE, READ_CALL_LOG)
2. Displays status and last detected caller
3. Provides test button for manual testing
4. Handles missed call from CallReceiver
5. Sends HTTP POST to backend
```

**Key Flow**:
```kotlin
onCreate() → requestPermissions() → permissionLauncher
  ↓
Permissions granted → CallReceiver can now detect calls
  ↓
Missed call detected → sendMissedCallToServer(phone)
  ↓
HTTP POST to backend → Update UI with response
```

### 3. NetworkHelper.kt
**Purpose**: Network communication

```kotlin
// Simple HTTP client using OkHttp:
1. Creates JSON payload: {"phone": "+919999999999"}
2. POSTs to backend endpoint
3. Handles errors silently (for background operation)
```

## 🔧 Backend Processing (Supabase Function)

### Endpoint: `/api/missed-call`

**Location**: `src/supabase/functions/server/twilio.tsx`

**Step-by-Step Processing**:

#### Step 1: Receive Request
```typescript
POST /api/missed-call
Body: {"phone": "+919999999999"}
```

#### Step 2: Deduplication Check
```typescript
// Prevents sending multiple SMS within 10 minutes
const lastSms = await kv.get(`sms:last:${phone}`);
if (lastSms && (Date.now() - lastSms.timestamp) < 10 * 60 * 1000) {
    return "SMS already sent recently";
}
```

#### Step 3: Farmer Lookup
```typescript
// Search for farmer by phone number
const phoneIndex = await kv.get(`farmer:phone:${phone}`);
const farmer = await kv.get(`farmer:survey:${phoneIndex.surveyNumber}`);

if (!farmer) {
    return "Farmer not found";
}
```

#### Step 4: Get Crop Prices
```typescript
// Get current crop rates
const cropRates = await kv.get("crop:rates");

// Match farmer's crops with rates
const farmerCrops = extractFarmerCrops(farmer);
const prices = [];
farmerCrops.forEach(crop => {
    if (cropRates[crop.cropType]) {
        prices.push(`${crop.cropType} ₹${cropRates[crop.cropType].rate}/quintal`);
    }
});
```

#### Step 5: Compose SMS
```typescript
// Format: "Rice ₹2500/quintal, Wheat ₹2200/quintal. Token at Hobli office. Helpline: 1800-XXX-XXXX"
// Ensure ≤160 characters (SMS limit)
let message = `${prices.join(", ")}. Token at Hobli office. Helpline: ${helpline}`;
if (message.length > 160) {
    message = message.substring(0, 100) + "... Helpline: " + helpline;
}
```

#### Step 6: Send via Twilio
```typescript
const twilioClient = await getTwilioClient();
const message = await twilioClient.messages.create({
    to: phone,
    body: smsBody,
    messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID
});
```

#### Step 7: Log SMS
```typescript
// Save to database for tracking
await kv.set(`sms:log:${messageId}`, {
    to_phone: phone,
    message_type: "android_missed_call",
    snippet: smsBody.substring(0, 100),
    status: "queued",
    timestamp: new Date().toISOString()
});

// Update deduplication timestamp
await kv.set(`sms:last:${phone}`, { timestamp: Date.now() });
```

## 🔐 Security & Deduplication

### Why Deduplication?
- Prevents spam if multiple missed calls happen quickly
- 10-minute window ensures farmers don't get duplicate SMS
- Saves Twilio costs

### How It Works:
```typescript
// When SMS is sent:
await kv.set(`sms:last:${phone}`, { timestamp: Date.now() });

// Before sending new SMS:
const lastSms = await kv.get(`sms:last:${phone}`);
const timeSince = Date.now() - lastSms.timestamp;
if (timeSince < 10 * 60 * 1000) {  // 10 minutes
    return "Skip - too soon";
}
```

## 📊 Data Flow

```
Android Phone
    │
    │ (Missed Call Detected)
    ▼
CallReceiver.kt
    │
    │ (HTTP POST)
    ▼
Supabase Function (/api/missed-call)
    │
    │ (Lookup)
    ▼
KV Store (farmer:phone:{phone})
    │
    │ (Get farmer data)
    ▼
KV Store (farmer:survey:{surveyNumber})
    │
    │ (Get crop rates)
    ▼
KV Store (crop:rates)
    │
    │ (Compose SMS)
    ▼
Twilio API
    │
    │ (Send SMS)
    ▼
Caller's Phone (SMS Received)
```

## 🧪 Testing Flow

### Manual Test:
1. Open Android app
2. Click "Send test" button
3. App sends: `{"phone": "+919999999999"}`
4. Backend processes (if farmer exists)
5. SMS sent to test number

### Real Test:
1. Call the Android phone from another device
2. Don't answer (let it ring)
3. CallReceiver detects missed call
4. App automatically sends to backend
5. Backend sends SMS to caller

## ⚙️ Configuration

### Android App:
- **Backend URL**: Set in `MainActivity.kt` and `NetworkHelper.kt`
- **Permissions**: READ_PHONE_STATE, READ_CALL_LOG

### Backend:
- **Twilio Credentials**: Set in Supabase environment variables
- **Deduplication Window**: 10 minutes (configurable)
- **SMS Length Limit**: 160 characters

## 🐛 Troubleshooting

### If missed calls aren't detected:
1. Check permissions are granted
2. Verify CallReceiver is registered in AndroidManifest.xml
3. Check if app is running (some devices require foreground)
4. Review Logcat: `adb logcat | grep CallReceiver`

### If SMS isn't sent:
1. Verify farmer exists in database
2. Check Twilio credentials in Supabase
3. Review Supabase function logs
4. Verify phone number format (+91XXXXXXXXXX)

### If backend doesn't receive requests:
1. Check internet connection on Android device
2. Verify backend URL is correct
3. Check Supabase function is deployed
4. Review network logs in Android app

## 📈 Performance

- **Detection Time**: < 1 second after call ends
- **Backend Processing**: ~500ms - 2 seconds
- **SMS Delivery**: 1-5 seconds (Twilio)
- **Total Time**: ~2-7 seconds from missed call to SMS received

## 🔄 Alternative: Twilio Webhook (Current System)

The system also supports Twilio webhooks directly:
- When someone calls a Twilio number
- Twilio sends webhook to `/twilio/calls`
- Same processing flow, but triggered by Twilio instead of Android app

Both methods work independently and can be used together!

