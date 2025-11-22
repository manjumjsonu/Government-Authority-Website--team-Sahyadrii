# Android Missed Call Notifier - Setup Instructions

## ✅ What Has Been Created

1. **Complete Android Project Structure** in the `android/` directory
2. **Backend Endpoint** at `/api/missed-call` in your Supabase function
3. **All necessary Kotlin files** for the Android app

## 📁 Project Structure

```
android/
├── settings.gradle
├── build.gradle
├── app/
│   ├── build.gradle
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/example/missedcall/
│       │   ├── MainActivity.kt
│       │   ├── CallReceiver.kt
│       │   └── NetworkHelper.kt
│       └── res/
│           ├── layout/activity_main.xml
│           └── values/styles.xml
└── README.md
```

## 🚀 Setup Steps

### 1. Open in Android Studio

1. Open **Android Studio**
2. Click **File → Open**
3. Navigate to the `android/` folder in this project
4. Click **OK** to open the project

### 2. Sync Gradle

- Android Studio will automatically sync Gradle
- Wait for dependencies to download
- Fix any errors if they appear

### 3. Update Backend URL (if needed)

The backend URL is already configured in:
- `MainActivity.kt` (line ~20)
- `NetworkHelper.kt` (line ~15)

Current URL: `https://wgxbqtdkeqxjgcbycsob.supabase.co/functions/v1/make-server-e097b8bf/api/missed-call`

**Note**: The backend endpoint has been created and is ready to use!

### 4. Build and Install

1. Connect your Android device via USB (or use an emulator)
2. Enable **USB Debugging** on your device
3. Click **Run** (green play button) or press `Shift + F10`
4. Select your device
5. Wait for the app to install and launch

### 5. Grant Permissions

When the app launches, it will request:
- **READ_PHONE_STATE** - To detect call state
- **READ_CALL_LOG** - To read call history

Click **Allow** for both permissions.

## 🧪 Testing

### Test 1: Manual Test Button
1. Open the app
2. Click "Send test (not button looking)"
3. Check the status message
4. Verify the backend received the request

### Test 2: Real Missed Call
1. Call the phone from another device
2. Don't answer the call (let it ring and disconnect)
3. The app should detect the missed call
4. Check the "Last detected" field
5. Verify SMS was sent to the caller

## 📱 How It Works

1. **CallReceiver** listens for phone state changes
2. When a call goes from "RINGING" to "IDLE" without being answered, it's detected as a missed call
3. The phone number is sent to the backend via HTTP POST
4. Backend processes the missed call:
   - Checks if farmer exists
   - Gets crop prices
   - Sends SMS via Twilio
   - Logs the message

## 🔧 Troubleshooting

### App doesn't detect missed calls
- Ensure permissions are granted
- Check if the app is running in background
- Some devices may require the app to be in foreground
- Check Logcat for errors: `adb logcat | grep MissedCall`

### Backend not receiving requests
- Check internet connection
- Verify backend URL is correct
- Check Supabase function logs
- Test with the manual test button first

### SMS not being sent
- Verify Twilio credentials are configured in Supabase
- Check Supabase function logs for errors
- Ensure farmer phone number is registered in the system

## 📝 Next Steps

1. **Test the app** with a real missed call
2. **Monitor backend logs** to ensure requests are received
3. **Verify SMS delivery** to the caller
4. **Deploy to production** when ready

## 🔐 Security Notes

- The app sends phone numbers to the backend
- Backend validates farmer exists before sending SMS
- SMS is only sent if farmer is registered
- 10-minute deduplication window prevents spam

## 📞 Support

If you encounter issues:
1. Check Android Studio Logcat for errors
2. Check Supabase function logs
3. Verify all permissions are granted
4. Test backend endpoint manually with curl/Postman

