/**
 * Twilio Integration Module
 * Handles Missed Call → SMS Flow, OTP Verification, and Phone Masking
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const twilioApp = new Hono();

// Initialize Twilio client
let twilioClient: any = null;

const getTwilioClient = async () => {
  if (twilioClient) return twilioClient;

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }

  // Dynamic import of Twilio SDK for Deno
  const twilioModule = await import("npm:twilio@5.3.5");
  const twilio = twilioModule.default || twilioModule;
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
};

const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") || "";
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "";
const BASE_URL = Deno.env.get("BASE_URL") || "https://your-domain.com";
const DEDUPLICATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a call is a missed call
 */
function isMissedCall(callStatus: string, callDuration: string): boolean {
  return callStatus === "no-answer" ||
    callStatus === "busy" ||
    callStatus === "failed" ||
    (parseInt(callDuration) < 2);
}

/**
 * Check if SMS was sent recently (deduplication)
 */
async function wasSmsSentRecently(phone: string): Promise<boolean> {
  const lastSmsKey = `sms:last:${phone}`;
  const lastSms = await kv.get(lastSmsKey);

  if (!lastSms) return false;

  const timeSinceLastSms = Date.now() - lastSms.timestamp;
  return timeSinceLastSms < DEDUPLICATION_WINDOW_MS;
}

/**
 * Get farmer by phone number
 */
async function getFarmerByPhone(phone: string): Promise<any> {
  // Remove + prefix if present and normalize
  const normalizedPhone = phone.replace(/^\+/, "");

  // Try direct lookup
  const phoneIndex = await kv.get(`farmer:phone:${normalizedPhone}`);
  if (phoneIndex?.surveyNumber) {
    return await kv.get(`farmer:survey:${phoneIndex.surveyNumber}`);
  }

  // Fallback: search all farmers (less efficient but works)
  const allFarmers = await kv.getByPrefix("farmer:survey:");
  return allFarmers.find((farmer: any) => {
    const p = String(farmer.phone || "");
    return p === normalizedPhone ||
      p === phone ||
      p.replace(/^\+/, "") === normalizedPhone;
  });
}

/**
 * Get crop prices for farmer's active crops
 */
async function getCropPricesForFarmer(farmer: any): Promise<string[]> {
  const cropRates = await kv.get("crop:rates") || {};
  const farmerCrops = extractFarmerCrops(farmer);
  const prices: string[] = [];

  farmerCrops.forEach((crop: any) => {
    const cropType = crop.cropType;
    const rate = cropRates[cropType];

    if (rate && rate.rate) {
      prices.push(`${cropType} ₹${rate.rate}/quintal`);
    }
  });

  return prices;
}

/**
 * Extract farmer crops (handles both crops array and single crop)
 */
function extractFarmerCrops(farmer: any): any[] {
  if (Array.isArray(farmer?.crops) && farmer.crops.length) {
    return farmer.crops;
  }
  if (farmer?.crop) {
    return [farmer.crop];
  }
  return [];
}

/**
 * Compose SMS message (≤160 characters, DND safe)
 */
function composeSMS(cropPrices: string[], farmer: any): string {
  if (cropPrices.length === 0) {
    return `Hello ${farmer.name || "Farmer"}, no crop rates available. Contact Hobli office: 1800-XXX-XXXX`;
  }

  const pricesText = cropPrices.join(", ");
  const helpline = "1800-XXX-XXXX"; // Update with actual helpline

  // Kannada/Hindi friendly format
  let message = `${pricesText}. Token at Hobli office. Helpline: ${helpline}`;

  // Ensure message is ≤160 characters
  if (message.length > 160) {
    message = `${pricesText.substring(0, 100)}... Helpline: ${helpline}`;
  }

  return message;
}

/**
 * Send SMS using Twilio
 * Supports both MessagingServiceSid (recommended) and phone number (fallback)
 */
async function sendSMS(to: string, body: string): Promise<any> {
  const client = await getTwilioClient();

  try {
    // Use MessagingServiceSid if available (recommended), otherwise use phone number
    const messageParams: any = {
      body,
      to,
      statusCallback: `${BASE_URL}/make-server-e097b8bf/twilio/sms-status`,
    };

    if (TWILIO_MESSAGING_SERVICE_SID) {
      // Preferred: Use Messaging Service (better for multiple numbers, better deliverability)
      messageParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else if (TWILIO_PHONE_NUMBER) {
      // Fallback: Use direct phone number
      messageParams.from = TWILIO_PHONE_NUMBER;
    } else {
      throw new Error("Either TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER must be configured");
    }

    const message = await client.messages.create(messageParams);

    return message;
  } catch (error: any) {
    console.error("Twilio SMS error:", error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}

/**
 * Log SMS message
 */
async function logSMS(
  to: string,
  messageSid: string,
  messageType: string,
  snippet: string,
  status: string = "queued"
): Promise<void> {
  const logEntry = {
    id: `msg_${Date.now()}`,
    to_phone: to,
    service_sid: messageSid,
    message_type: messageType,
    snippet: snippet.substring(0, 100), // Store first 100 chars
    status,
    timestamp: new Date().toISOString(),
  };

  await kv.set(`sms:log:${logEntry.id}`, logEntry);

  // Store last SMS timestamp for deduplication
  await kv.set(`sms:last:${to}`, { timestamp: Date.now() });
}

// ============================================
// MISSED CALL WEBHOOK
// ============================================

/**
 * POST /twilio/calls
 * Twilio webhook for incoming calls
 */
twilioApp.post("/make-server-e097b8bf/twilio/calls", async (c) => {
  try {
    // Parse Twilio form data
    const formData = await c.req.formData();
    const from = formData.get("From")?.toString() || "";
    const callStatus = formData.get("CallStatus")?.toString() || "";
    const callDuration = formData.get("CallDuration")?.toString() || "0";
    const callSid = formData.get("CallSid")?.toString() || "";

    console.log(`Incoming call: ${from}, Status: ${callStatus}, Duration: ${callDuration}s`);

    // Check if it's a missed call
    if (!isMissedCall(callStatus, callDuration)) {
      // Not a missed call, just respond
      return c.xml(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }

    // Check deduplication window
    if (await wasSmsSentRecently(from)) {
      console.log(`SMS already sent to ${from} recently, skipping`);
      return c.xml(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }

    // Get farmer by phone
    const farmer = await getFarmerByPhone(from);
    if (!farmer) {
      console.log(`Farmer not found for phone: ${from}`);
      return c.xml(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }

    // Get crop prices
    const cropPrices = await getCropPricesForFarmer(farmer);

    // Compose SMS
    const smsBody = composeSMS(cropPrices, farmer);

    // Send SMS
    const message = await sendSMS(from, smsBody);

    // Log SMS
    await logSMS(from, message.sid, "missed_call_response", smsBody, "queued");

    console.log(`SMS sent to ${from}: ${message.sid}`);

    // Respond immediately to Twilio (don't wait for SMS)
    return c.xml(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);

  } catch (error: any) {
    console.error("Missed call webhook error:", error);
    // Still respond to Twilio to avoid retries
    return c.xml(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
});

// ============================================
// SEND SMS TO FARMER (Manual/Button Trigger)
// ============================================

/**
 * POST /sms/send
 * Send SMS to a farmer by phone number (triggered by button click)
 * Accepts JSON: {"phone": "+917483507306"}
 */
twilioApp.post("/make-server-e097b8bf/sms/send", async (c) => {
  try {
    let phone: string;
    try {
      const body = await c.req.json();
      phone = body.phone;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return c.json({ success: false, error: "Invalid JSON in request body" }, 400);
    }

    if (!phone) {
      return c.json({ success: false, error: "Phone number is required" }, 400);
    }

    console.log(`Manual SMS request for phone: ${phone}`);

    // Get farmer by phone
    const farmer = await getFarmerByPhone(phone);
    if (!farmer) {
      console.log(`Farmer not found for phone: ${phone}`);
      return c.json({ success: false, error: "Farmer not found for this phone number" }, 404);
    }

    // Get crop prices
    const cropPrices = await getCropPricesForFarmer(farmer);

    // Compose SMS
    const smsBody = composeSMS(cropPrices, farmer);

    // Send SMS
    const message = await sendSMS(phone, smsBody);

    // Log SMS
    await logSMS(phone, message.sid, "manual_send", smsBody, "queued");

    console.log(`SMS sent to ${phone}: ${message.sid}`);

    return c.json({
      success: true,
      message: "SMS sent successfully",
      messageSid: message.sid,
      farmerName: farmer.name,
    });
  } catch (error: any) {
    console.error("Manual SMS send error:", error);
    return c.json({ 
      success: false, 
      error: error.message || "Failed to send SMS. Please try again." 
    }, 500);
  }
});

// ============================================
// ANDROID APP MISSED CALL ENDPOINT
// ============================================

/**
 * POST /api/missed-call
 * Endpoint for Android app to report missed calls
 * Accepts JSON: {"phone": "+919999999999"}
 */
twilioApp.post("/make-server-e097b8bf/api/missed-call", async (c) => {
  try {
    const { phone } = await c.req.json();

    if (!phone) {
      return c.json({ error: "Phone number is required" }, 400);
    }

    console.log(`Android app reported missed call from: ${phone}`);

    // Check deduplication window
    if (await wasSmsSentRecently(phone)) {
      console.log(`SMS already sent to ${phone} recently, skipping`);
      return c.json({ success: true, message: "SMS already sent recently" });
    }

    // Get farmer by phone
    const farmer = await getFarmerByPhone(phone);
    if (!farmer) {
      console.log(`Farmer not found for phone: ${phone}`);
      return c.json({ success: false, message: "Farmer not found" }, 404);
    }

    // Get crop prices
    const cropPrices = await getCropPricesForFarmer(farmer);

    // Compose SMS
    const smsBody = composeSMS(cropPrices, farmer);

    // Send SMS
    const message = await sendSMS(phone, smsBody);

    // Log SMS
    await logSMS(phone, message.sid, "android_missed_call", smsBody, "queued");

    console.log(`SMS sent to ${phone}: ${message.sid}`);

    return c.json({
      success: true,
      message: "SMS sent successfully",
      messageSid: message.sid,
    });
  } catch (error: any) {
    console.error("Android missed call endpoint error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// SMS STATUS WEBHOOK
// ============================================

/**
 * POST /twilio/sms-status
 * Twilio webhook for SMS delivery status updates
 */
twilioApp.post("/make-server-e097b8bf/twilio/sms-status", async (c) => {
  try {
    const formData = await c.req.formData();
    const messageSid = formData.get("MessageSid")?.toString() || "";
    const messageStatus = formData.get("MessageStatus")?.toString() || "";
    const errorCode = formData.get("ErrorCode")?.toString() || "";
    const errorMessage = formData.get("ErrorMessage")?.toString() || "";

    // Find log entry by message SID
    const logs = await kv.getByPrefix("sms:log:");
    const logEntry = logs.find((log: any) => log.service_sid === messageSid);

    if (logEntry) {
      // Update log entry
      const updatedLog = {
        ...logEntry,
        status: messageStatus,
        failure_reason: errorCode ? `${errorCode}: ${errorMessage}` : null,
        updated_at: new Date().toISOString(),
      };

      await kv.set(`sms:log:${logEntry.id}`, updatedLog);
      console.log(`SMS status updated: ${messageSid} -> ${messageStatus}`);
    }

    return c.text("OK", 200);
  } catch (error: any) {
    console.error("SMS status webhook error:", error);
    return c.text("OK", 200); // Always return OK to Twilio
  }
});

// ============================================
// OTP VERIFICATION (Twilio Verify)
// ============================================

/**
 * POST /auth/send-otp
 * Send OTP to phone number using Twilio Verify
 */
twilioApp.post("/make-server-e097b8bf/auth/send-otp", async (c) => {
  try {
    const { phone } = await c.req.json();

    if (!phone) {
      return c.json({ error: "Phone number is required" }, 400);
    }

    const client = await getTwilioClient();
    const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!verifyServiceSid) {
      return c.json({ error: "Twilio Verify service not configured" }, 500);
    }

    // Send OTP
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({
        to: phone,
        channel: "sms",
      });

    return c.json({
      success: true,
      sid: verification.sid,
      status: verification.status,
    });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return c.json({ error: error.message || "Failed to send OTP" }, 500);
  }
});

/**
 * POST /auth/verify-otp
 * Verify OTP code
 */
twilioApp.post("/make-server-e097b8bf/auth/verify-otp", async (c) => {
  try {
    const { phone, code } = await c.req.json();

    if (!phone || !code) {
      return c.json({ error: "Phone number and code are required" }, 400);
    }

    const client = await getTwilioClient();
    const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!verifyServiceSid) {
      return c.json({ error: "Twilio Verify service not configured" }, 500);
    }

    // Verify OTP
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({
        to: phone,
        code,
      });

    if (verificationCheck.status === "approved") {
      return c.json({
        success: true,
        verified: true,
        status: verificationCheck.status,
      });
    } else {
      return c.json({
        success: false,
        verified: false,
        status: verificationCheck.status,
        error: "Invalid or expired OTP",
      }, 400);
    }
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return c.json({ error: error.message || "Failed to verify OTP" }, 500);
  }
});

// ============================================
// PHONE MASKING (Twilio Proxy)
// ============================================

/**
 * POST /twilio/proxy/create-session
 * Create a masked call session between vendor and farmer
 */
twilioApp.post("/make-server-e097b8bf/twilio/proxy/create-session", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { vendorId, farmerId, vendorPhone, farmerPhone } = await c.req.json();

    if (!vendorId || !farmerId || !vendorPhone || !farmerPhone) {
      return c.json({ error: "All fields are required" }, 400);
    }

    const client = await getTwilioClient();
    const proxyServiceSid = Deno.env.get("TWILIO_PROXY_SERVICE_SID");

    if (!proxyServiceSid) {
      return c.json({ error: "Twilio Proxy service not configured" }, 500);
    }

    // Create session
    const session = await client.proxy.v1
      .services(proxyServiceSid)
      .sessions
      .create({
        uniqueName: `session_${vendorId}_${farmerId}_${Date.now()}`,
      });

    // Add vendor participant
    const vendorParticipant = await client.proxy.v1
      .services(proxyServiceSid)
      .sessions(session.sid)
      .participants
      .create({
        identifier: vendorPhone,
        friendlyName: `Vendor ${vendorId}`,
      });

    // Add farmer participant
    const farmerParticipant = await client.proxy.v1
      .services(proxyServiceSid)
      .sessions(session.sid)
      .participants
      .create({
        identifier: farmerPhone,
        friendlyName: `Farmer ${farmerId}`,
      });

    // Get proxy number
    const phoneNumbers = await client.proxy.v1
      .services(proxyServiceSid)
      .phoneNumbers
      .list();

    const proxyNumber = phoneNumbers[0]?.phoneNumber || "N/A";

    // Store session in DB (expires in 2 hours)
    const sessionData = {
      id: `session_${Date.now()}`,
      vendor_id: vendorId,
      farmer_id: farmerId,
      proxy_number: proxyNumber,
      session_sid: session.sid,
      started_at: new Date().toISOString(),
      ended_at: null,
    };

    await kv.set(`proxy:session:${sessionData.id}`, sessionData, 7200); // 2 hours

    return c.json({
      success: true,
      session: sessionData,
    });
  } catch (error: any) {
    console.error("Create proxy session error:", error);
    return c.json({ error: error.message || "Failed to create session" }, 500);
  }
});

/**
 * POST /twilio/proxy/end-session
 * End a masked call session
 */
twilioApp.post("/make-server-e097b8bf/twilio/proxy/end-session", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { sessionId } = await c.req.json();

    if (!sessionId) {
      return c.json({ error: "Session ID is required" }, 400);
    }

    const sessionData = await kv.get(`proxy:session:${sessionId}`);
    if (!sessionData) {
      return c.json({ error: "Session not found" }, 404);
    }

    const client = await getTwilioClient();
    const proxyServiceSid = Deno.env.get("TWILIO_PROXY_SERVICE_SID");

    if (!proxyServiceSid) {
      return c.json({ error: "Twilio Proxy service not configured" }, 500);
    }

    // Delete session from Twilio
    await client.proxy.v1
      .services(proxyServiceSid)
      .sessions(sessionData.session_sid)
      .remove();

    // Update session in DB
    const updatedSession = {
      ...sessionData,
      ended_at: new Date().toISOString(),
    };

    await kv.set(`proxy:session:${sessionId}`, updatedSession);

    return c.json({
      success: true,
      message: "Session ended",
    });
  } catch (error: any) {
    console.error("End proxy session error:", error);
    return c.json({ error: error.message || "Failed to end session" }, 500);
  }
});

// Helper function for auth (matches routes.tsx)
async function verifyAuth(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ============================================
// SMS DIAGNOSTIC ENDPOINT
// ============================================

/**
 * GET /sms/diagnostic
 * Diagnostic endpoint to check SMS configuration
 */
twilioApp.get("/make-server-e097b8bf/sms/diagnostic", async (c) => {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    status: "unknown",
  };

  // Check 1: Twilio Credentials
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  diagnostics.checks.twilioCredentials = {
    accountSid: accountSid ? "✅ Set" : "❌ Missing",
    authToken: authToken ? "✅ Set" : "❌ Missing",
    status: accountSid && authToken ? "ok" : "error",
  };

  // Check 2: Messaging Service / Phone Number
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const phoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
  diagnostics.checks.messagingConfig = {
    messagingServiceSid: messagingServiceSid ? `✅ Set (${messagingServiceSid.substring(0, 10)}...)` : "❌ Missing",
    phoneNumber: phoneNumber ? `✅ Set (${phoneNumber})` : "❌ Missing",
    status: messagingServiceSid || phoneNumber ? "ok" : "error",
  };

  // Check 3: Base URL
  const baseUrl = Deno.env.get("BASE_URL");
  diagnostics.checks.baseUrl = {
    value: baseUrl || "❌ Missing",
    status: baseUrl ? "ok" : "error",
  };

  // Check 4: Supabase Configuration
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  diagnostics.checks.supabaseConfig = {
    url: supabaseUrl ? "✅ Set" : "❌ Missing",
    serviceKey: supabaseServiceKey ? "✅ Set" : "❌ Missing",
    status: supabaseUrl && supabaseServiceKey ? "ok" : "error",
  };

  // Check 5: Test Twilio Client Initialization
  try {
    if (accountSid && authToken) {
      const testClient = await getTwilioClient();
      diagnostics.checks.twilioClient = {
        status: "✅ Initialized successfully",
        canConnect: true,
      };
    } else {
      diagnostics.checks.twilioClient = {
        status: "❌ Cannot initialize (missing credentials)",
        canConnect: false,
      };
    }
  } catch (error: any) {
    diagnostics.checks.twilioClient = {
      status: `❌ Error: ${error.message}`,
      canConnect: false,
    };
  }

  // Overall Status
  const allChecks = Object.values(diagnostics.checks);
  const hasErrors = allChecks.some((check: any) => check.status === "error" || check.canConnect === false);
  diagnostics.status = hasErrors ? "error" : "ok";

  return c.json(diagnostics);
});

export default twilioApp;

