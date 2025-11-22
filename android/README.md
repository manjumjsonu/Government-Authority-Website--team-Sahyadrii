# MissedCallNotifier Android App

This Android app detects missed calls and sends the caller's phone number to your backend API.

## Setup Instructions

1. **Open Android Studio** → New Project → Empty Activity
2. **Replace the generated files** with the files in this directory (keep package name `com.example.missedcall`)
3. **Update Backend URL**: In `MainActivity.kt` and `NetworkHelper.kt`, replace `BACKEND_URL` with your real endpoint
4. **Build and install** APK on the Android phone where your Jio SIM is placed
5. **Grant runtime permissions** when prompted (READ_PHONE_STATE and READ_CALL_LOG)
6. **Keep the app running** in background (Android may keep the receiver active even if UI closed)

## Backend Endpoint

The app POSTs to: `https://wgxbqtdkeqxjgcbycsob.supabase.co/functions/v1/make-server-e097b8bf/api/missed-call`

**Note**: You need to create this endpoint in your Supabase function to handle the Android POST requests. The endpoint should:
- Accept POST requests with JSON body: `{"phone": "+919999999999"}`
- Process the missed call and trigger SMS sending (similar to the Twilio webhook)

## Project Structure

```
android/
├── settings.gradle
├── build.gradle
├── app/
│   ├── build.gradle
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── java/com/example/missedcall/
│           │   ├── MainActivity.kt
│           │   ├── CallReceiver.kt
│           │   └── NetworkHelper.kt
│           └── res/
│               ├── layout/activity_main.xml
│               └── values/styles.xml
└── README.md
```

## Features

- ✅ Detects missed calls automatically
- ✅ Sends phone number to backend via HTTP POST
- ✅ Test button for manual testing
- ✅ Displays last detected caller
- ✅ Runtime permission handling

## Troubleshooting

- If `EXTRA_INCOMING_NUMBER` is null on some devices, use CallLog polling (query call log every few seconds) as a fallback
- On Android 10+, some call permissions are restricted; ensure `minSdk 23` and runtime permission flows
- Test by calling the phone from another device and not answering; check app logs (Logcat) for detection

## Next Steps

1. Create the `/api/missed-call` endpoint in your Supabase function
2. Test the app with a real missed call
3. Monitor backend logs to ensure requests are received

