import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.get("/make-server-e097b8bf/ping", (c) => c.text("pong"));

// Initialize Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
};

// Helper to verify auth
const verifyAuth = async (authHeader: string | null) => {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

const generateCropId = () => {
  // Deno has crypto.randomUUID available
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `crop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const extractFarmerCrops = (farmer: any) => {
  if (Array.isArray(farmer?.crops) && farmer.crops.length) {
    return farmer.crops;
  }
  if (farmer?.crop) {
    return [farmer.crop];
  }
  return [];
};

// ============================================
// AUTH ROUTES
// ============================================

// Signup for Hobli Authority
app.post("/make-server-e097b8bf/auth/signup-authority", async (c) => {
  try {
    const { email, password, name, hobliId, district, taluk } = await c.req.json();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, hobliId, district, taluk, role: "authority" },
      email_confirm: true, // Auto-confirm email since email server isn't configured
    });

    if (error) {
      console.log(`Error creating authority user: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store authority details in KV
    await kv.set(`authority:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      hobliId,
      district,
      taluk,
      role: "authority",
    });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Signup authority error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Signup for Vendor
app.post("/make-server-e097b8bf/auth/signup-vendor", async (c) => {
  try {
    const { email, password, name, vendorId, businessName } = await c.req.json();
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, vendorId, businessName, role: "vendor" },
      email_confirm: true,
    });

    if (error) {
      console.log(`Error creating vendor user: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    await kv.set(`vendor:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      vendorId,
      businessName,
      role: "vendor",
    });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Signup vendor error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Login
app.post("/make-server-e097b8bf/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Login error: ${error.message}`);
      return c.json({ error: error.message }, 401);
    }

    return c.json({
      success: true,
      accessToken: data.session.access_token,
      user: data.user,
    });
  } catch (error) {
    console.log(`Login error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Farmer Login via Survey Number
app.post("/make-server-e097b8bf/auth/farmer-login", async (c) => {
  try {
    const { surveyNumber, phone } = await c.req.json();

    // Check if farmer exists
    const farmer = await kv.get(`farmer:survey:${surveyNumber}`);

    if (!farmer) {
      return c.json({ error: "Farmer not found" }, 404);
    }

    if (phone && farmer.phone !== phone) {
      return c.json({ error: "Phone number does not match" }, 401);
    }

    // Generate a simple token for farmer (in production, use proper JWT)
    const token = `farmer_${surveyNumber}_${Date.now()}`;
    await kv.set(`farmer:token:${token}`, { surveyNumber, createdAt: Date.now() }, 3600);

    return c.json({
      success: true,
      token,
      farmer,
    });
  } catch (error) {
    console.log(`Farmer login error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// FARMER MANAGEMENT ROUTES (Authority)
// ============================================

// Add new farmer
app.post("/make-server-e097b8bf/farmers", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const farmerData = await c.req.json();
    const { surveyNumber } = farmerData;

    // Check if farmer already exists
    const existing = await kv.get(`farmer:survey:${surveyNumber}`);
    if (existing) {
      return c.json({ error: "Farmer with this survey number already exists" }, 400);
    }

    const farmer = {
      ...farmerData,
      id: `farmer_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`farmer:survey:${surveyNumber}`, farmer);
    await kv.set(`farmer:phone:${farmerData.phone}`, { surveyNumber });

    return c.json({ success: true, farmer });
  } catch (error) {
    console.log(`Add farmer error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get farmer by survey number
app.get("/make-server-e097b8bf/farmers/:surveyNumber", async (c) => {
  try {
    const surveyNumber = c.req.param("surveyNumber");
    const farmer = await kv.get(`farmer:survey:${surveyNumber}`);

    if (!farmer) {
      return c.json({ error: "Farmer not found" }, 404);
    }

    return c.json({ success: true, farmer });
  } catch (error) {
    console.log(`Get farmer error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Update farmer details
app.put("/make-server-e097b8bf/farmers/:surveyNumber", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const surveyNumber = c.req.param("surveyNumber");
    const updates = await c.req.json();

    const farmer = await kv.get(`farmer:survey:${surveyNumber}`);
    if (!farmer) {
      return c.json({ error: "Farmer not found" }, 404);
    }

    const updatedFarmer = {
      ...farmer,
      ...updates,
      surveyNumber, // Ensure survey number doesn't change
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`farmer:survey:${surveyNumber}`, updatedFarmer);

    // Update phone index if phone changed
    if (updates.phone && updates.phone !== farmer.phone) {
      await kv.del(`farmer:phone:${farmer.phone}`);
      await kv.set(`farmer:phone:${updates.phone}`, { surveyNumber });
    }

    return c.json({ success: true, farmer: updatedFarmer });
  } catch (error) {
    console.log(`Update farmer error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get all farmers by location (for authority)
app.get("/make-server-e097b8bf/farmers", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const farmers = await kv.getByPrefix("farmer:survey:");
    return c.json({ success: true, farmers });
  } catch (error) {
    console.log(`Get all farmers error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// CROP MANAGEMENT ROUTES
// ============================================

// Update crop details for a farmer
app.post("/make-server-e097b8bf/farmers/:surveyNumber/crop", async (c) => {
  try {
    const surveyNumber = c.req.param("surveyNumber");
    const cropData = await c.req.json();
    const user = await verifyAuth(c.req.header("Authorization"));
    const isAuthority = user?.user_metadata?.role === "authority";

    const farmer = await kv.get(`farmer:survey:${surveyNumber}`);
    if (!farmer) {
      return c.json({ error: "Farmer not found" }, 404);
    }

    // Check if farmer has already updated crop this season (time lock)
    const lastUpdate = farmer.lastCropUpdate || farmer.crop?.lastUpdated;
    const now = Date.now();
    const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in ms

    if (!isAuthority && lastUpdate && (now - new Date(lastUpdate).getTime()) < sixMonths) {
      return c.json({
        error: "Crop details can only be updated once per season. Contact Hobli office for corrections.",
        canUpdate: false,
      }, 400);
    }

    const incomingCrops = Array.isArray(cropData?.crops)
      ? cropData.crops
      : [cropData];

    const timestamp = new Date().toISOString();
    const normalizedCrops = incomingCrops
      .filter((entry: any) => entry && entry.cropType)
      .map((entry: any) => ({
        id: entry.id || generateCropId(),
        cropType: entry.cropType,
        quantity: Number(entry.quantity) || 0,
        plantedDate: entry.plantedDate,
        growthDays: Number(entry.growthDays) || 120,
        lastUpdated: timestamp,
      }))
      .filter((entry: any) => entry.quantity > 0);

    if (!normalizedCrops.length) {
      return c.json({ error: "At least one valid crop entry is required." }, 400);
    }

    const updatedFarmer = {
      ...farmer,
      crop: normalizedCrops[0], // legacy compatibility
      crops: normalizedCrops,
      lastCropUpdate: timestamp,
      updatedAt: timestamp,
    };

    await kv.set(`farmer:survey:${surveyNumber}`, updatedFarmer);

    // Index by crop type for vendor search (best effort)
    const uniqueTypes = Array.from(new Set(normalizedCrops.map((entry: any) => entry.cropType)));
    for (const type of uniqueTypes) {
      const indexKey = `crop:index:${type}`;
      const cropIndex = await kv.get(indexKey) || [];
      if (!cropIndex.includes(surveyNumber)) {
        cropIndex.push(surveyNumber);
        await kv.set(indexKey, cropIndex);
      }
    }

    return c.json({ success: true, farmer: updatedFarmer });
  } catch (error) {
    console.log(`Update crop error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get crop rates
app.get("/make-server-e097b8bf/crops/rates", async (c) => {
  try {
    const rates = await kv.get("crop:rates") || {};
    return c.json({ success: true, rates });
  } catch (error) {
    console.log(`Get crop rates error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Update crop rates (Authority only)
app.put("/make-server-e097b8bf/crops/rates", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const rates = await c.req.json();
    await kv.set("crop:rates", {
      ...rates,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true, rates });
  } catch (error) {
    console.log(`Update crop rates error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// SCHEMES MANAGEMENT ROUTES
// ============================================

// Default Central Government Schemes
const DEFAULT_SCHEMES = [
  {
    id: "scheme_default_1",
    title: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    category: "Income Support",
    shortDescription: "Income support of ₹6,000/- per year for all landholding farmers.",
    detailedDescription: "The Pradhan Mantri Kisan Samman Nidhi (PM-KISAN) is a Central Sector Scheme with 100% funding from the Government of India. Under the scheme, an income support of ₹6,000/- per year is provided to all farmer families having cultivable landholding in their names, irrespective of the size of their landholdings.",
    eligibility: "All landholding farmer families having cultivable landholding in their names are eligible. Institutional landholders, farmer families holding constitutional posts, serving or retired officers/employees of State/Central Government, etc., are excluded.",
    benefit: "₹6,000 per year in three equal installments of ₹2,000 each, credited directly into the bank accounts of the beneficiaries.",
    applicationStartDate: "2024-01-01",
    applicationEndDate: "2024-12-31",
    documentsRequired: ["Aadhaar Card", "Land Holding Documents (RTC)", "Bank Account Details"],
    source: "Central Govt",
    link: "https://pmkisan.gov.in/",
    status: "Active",
    language: "English",
    contactInfo: "pmkisan-ict@gov.in | 155261 / 1800115526",
    createdAt: new Date().toISOString(),
  },
  {
    id: "scheme_default_2",
    title: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    category: "Insurance",
    shortDescription: "Crop insurance scheme providing financial support for crop failure.",
    detailedDescription: "The Pradhan Mantri Fasal Bima Yojana (PMFBY) aims to support sustainable production in agriculture sector by way of providing financial support to farmers suffering crop loss/damage arising out of unforeseen events, stabilizing the income of farmers to ensure their continuance in farming, and encouraging farmers to adopt innovative and modern agricultural practices.",
    eligibility: "All farmers growing notified crops in a notified area during the season who have insurable interest in the crop are eligible. Compulsory for Loanee farmers, voluntary for Non-Loanee farmers.",
    benefit: "Insurance coverage against crop loss due to non-preventable natural risks from pre-sowing to post-harvest. Premium subsidy is shared by Central and State Governments.",
    applicationStartDate: "2024-04-01",
    applicationEndDate: "2024-07-31",
    documentsRequired: ["Aadhaar Card", "Land Records (RTC)", "Bank Passbook", "Sowing Certificate"],
    source: "Central Govt",
    link: "https://pmfby.gov.in/",
    status: "Active",
    language: "English",
    contactInfo: "help.agri-insurance@gov.in | 011-23381092",
    createdAt: new Date().toISOString(),
  },
  {
    id: "scheme_default_3",
    title: "Kisan Credit Card (KCC)",
    category: "Credit Support",
    shortDescription: "Adequate and timely credit support for cultivation and other needs.",
    detailedDescription: "The Kisan Credit Card (KCC) scheme is designed to provide adequate and timely credit support from the banking system under a single window with flexible and simplified procedure to the farmers for their cultivation and other needs like post-harvest expenses, produce marketing loan, consumption requirements of farmer household, working capital for maintenance of farm assets and activities allied to agriculture.",
    eligibility: "All farmers - individual/joint borrowers who are owner cultivators, tenant farmers, oral lessees & sharecroppers, and SHGs or JLGs of farmers including tenant farmers, sharecroppers etc.",
    benefit: "Credit limit based on scale of finance for the crop + 10% for post-harvest/household/consumption + 20% for maintenance of farm assets. Interest subvention available for prompt repayment.",
    applicationStartDate: "2024-01-01",
    applicationEndDate: "2024-12-31",
    documentsRequired: ["Aadhaar Card", "Land Records (RTC)", "Passport Size Photo"],
    source: "Central Govt",
    link: "https://www.myscheme.gov.in/schemes/kcc",
    status: "Active",
    language: "English",
    contactInfo: "Contact your nearest bank branch",
    createdAt: new Date().toISOString(),
  },
  {
    id: "scheme_default_4",
    title: "Soil Health Card Scheme",
    category: "Soil Health",
    shortDescription: "Soil testing to issue Soil Health Cards to farmers.",
    detailedDescription: "The Soil Health Card Scheme is a Government of India's scheme promoted by the Department of Agriculture & Co-operation under the Ministry of Agriculture and Farmers' Welfare. It is being implemented through the Department of Agriculture of all the State and Union Territory Governments. A Soil Health Card is used to assess the current status of soil health and, when used over time, to determine changes in soil health that are affected by land management.",
    eligibility: "All farmers are eligible to get a Soil Health Card for their landholdings.",
    benefit: "Farmers get a report card on nutrient status of their soil and recommendations on appropriate dosage of nutrients to be applied for improving soil health and its fertility.",
    applicationStartDate: "2024-01-01",
    applicationEndDate: "2024-12-31",
    documentsRequired: ["Aadhaar Card", "Land Records (RTC)"],
    source: "Central Govt",
    link: "https://soilhealth.dac.gov.in/",
    status: "Active",
    language: "English",
    contactInfo: "helpdesk-soil@gov.in",
    createdAt: new Date().toISOString(),
  },
  {
    id: "scheme_default_5",
    title: "Pradhan Mantri Krishi Sinchai Yojana (PMKSY)",
    category: "Irrigation",
    shortDescription: "Focuses on 'Har Khet Ko Pani' and 'More Crop Per Drop'.",
    detailedDescription: "Pradhan Mantri Krishi Sinchai Yojana (PMKSY) has been formulated with the vision of extending the coverage of irrigation 'Har Khet ko pani' and improving water use efficiency 'More crop per drop' in a focused manner with end to end solution on source creation, distribution, management, field application and extension activities.",
    eligibility: "Farmers with cultivable land who have potential for micro-irrigation. Priority to small and marginal farmers.",
    benefit: "Subsidy for installation of micro-irrigation systems (drip/sprinkler). 55% subsidy for small & marginal farmers, 45% for other farmers.",
    applicationStartDate: "2024-01-01",
    applicationEndDate: "2024-12-31",
    documentsRequired: ["Aadhaar Card", "Land Records (RTC)", "Bank Passbook"],
    source: "Central Govt",
    link: "https://pmksy.gov.in/",
    status: "Active",
    language: "English",
    contactInfo: "pmksy-mowr@nic.in",
    createdAt: new Date().toISOString(),
  },
  {
    id: "scheme_default_6",
    title: "Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan (PM-KUSUM)",
    category: "Energy",
    shortDescription: "Solar pumps and grid-connected solar power plants for farmers.",
    detailedDescription: "PM-KUSUM scheme aims to ensure energy security for farmers in India, along with honoring India's commitment to increase the share of installed capacity of electric power from non-fossil-fuel sources. It supports installation of standalone solar agriculture pumps and solarisation of existing grid-connected agriculture pumps.",
    eligibility: "Individual farmers, groups of farmers, cooperatives, panchayats, Farmer Producer Organisations (FPO), and Water User Associations (WUA).",
    benefit: "Subsidy up to 60% for standalone solar pumps. 30% subsidy by Central Govt, 30% by State Govt. Farmer pays only 10% (remaining 30% as loan).",
    applicationStartDate: "2024-01-01",
    applicationEndDate: "2024-12-31",
    documentsRequired: ["Aadhaar Card", "Land Records", "Bank Account Details"],
    source: "Central Govt",
    link: "https://pmkusum.mnre.gov.in/",
    status: "Active",
    language: "English",
    contactInfo: "mnre-kusum@gov.in",
    createdAt: new Date().toISOString(),
  },
  {
    id: "scheme_default_7",
    title: "National Agriculture Market (e-NAM)",
    category: "Marketing",
    shortDescription: "Pan-India electronic trading portal for agricultural commodities.",
    detailedDescription: "National Agriculture Market (e-NAM) is a pan-India electronic trading portal which networks the existing APMC mandis to create a unified national market for agricultural commodities. It promotes better marketing opportunities for farmers to sell their produce through an online competitive and transparent price discovery system.",
    eligibility: "Farmers who wish to sell their produce in APMC mandis integrated with e-NAM.",
    benefit: "Transparent price discovery, access to a larger number of buyers, real-time payment settlement, and better prices for produce.",
    applicationStartDate: "2024-01-01",
    applicationEndDate: "2024-12-31",
    documentsRequired: ["Aadhaar Card", "Bank Passbook", "Mobile Number"],
    source: "Central Govt",
    link: "https://enam.gov.in/",
    status: "Active",
    language: "English",
    contactInfo: "enam.helpdesk@gmail.com | 1800 270 0224",
    createdAt: new Date().toISOString(),
  },
  {
    id: "scheme_default_8",
    title: "Paramparagat Krishi Vikas Yojana (PKVY)",
    category: "Organic Farming",
    shortDescription: "Promotes organic farming through cluster approach.",
    detailedDescription: "Paramparagat Krishi Vikas Yojana (PKVY) is an elaborated component of Soil Health Management (SHM) of major project National Mission of Sustainable Agriculture (NMSA). Under PKVY Organic farming is promoted through adoption of organic village by cluster approach and PGS certification.",
    eligibility: "Farmers willing to adopt organic farming in a cluster of 20 hectares or 50 acres.",
    benefit: "Financial assistance of ₹50,000 per hectare/3 years is allowed. Out of this, ₹31,000 is given directly to the farmer through DBT for organic inputs.",
    applicationStartDate: "2024-01-01",
    applicationEndDate: "2024-12-31",
    documentsRequired: ["Aadhaar Card", "Land Records", "Bank Account Details"],
    source: "Central Govt",
    link: "https://pgsindia-ncof.gov.in/pkvy/index.aspx",
    status: "Active",
    language: "English",
    contactInfo: "pkvy.agri@gov.in",
    createdAt: new Date().toISOString(),
  }
];

// Get all schemes
app.get("/make-server-e097b8bf/schemes", async (c) => {
  try {
    let schemes = await kv.get("schemes:all") || [];

    // If no schemes exist, return default Central Government schemes
    if (schemes.length === 0) {
      schemes = DEFAULT_SCHEMES;
      // We don't automatically save them to DB here to avoid side effects on GET,
      // but they will be served to the frontend.
    }

    return c.json({ success: true, schemes });
  } catch (error) {
    console.log(`Get schemes error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Add/Update schemes (Authority only)
app.post("/make-server-e097b8bf/schemes", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const schemeData = await c.req.json();
    const schemes = await kv.get("schemes:all") || [];

    const newScheme = {
      ...schemeData,
      id: `scheme_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    schemes.push(newScheme);
    await kv.set("schemes:all", schemes);

    return c.json({ success: true, scheme: newScheme });
  } catch (error) {
    console.log(`Add scheme error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Update scheme
app.put("/make-server-e097b8bf/schemes/:id", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const updates = await c.req.json();
    const schemes = await kv.get("schemes:all") || [];

    const index = schemes.findIndex((s: any) => s.id === id);
    if (index === -1) {
      return c.json({ error: "Scheme not found" }, 404);
    }

    const updatedScheme = {
      ...schemes[index],
      ...updates,
      id, // Ensure ID doesn't change
    };

    schemes[index] = updatedScheme;
    await kv.set("schemes:all", schemes);

    return c.json({ success: true, scheme: updatedScheme });
  } catch (error) {
    console.log(`Update scheme error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete scheme
app.delete("/make-server-e097b8bf/schemes/:id", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const id = c.req.param("id");
    console.log(`Attempting to delete scheme: ${id}`);
    let schemes = await kv.get("schemes:all") || [];

    const initialLength = schemes.length;
    schemes = schemes.filter((s: any) => s.id !== id);

    if (schemes.length === initialLength) {
      return c.json({ error: "Scheme not found" }, 404);
    }

    await kv.set("schemes:all", schemes);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete scheme error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// FERTILIZER DISTRIBUTION ROUTES
// ============================================

// Record fertilizer distribution
app.post("/make-server-e097b8bf/fertilizers/distribute", async (c) => {
  try {
    const user = await verifyAuth(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { surveyNumber, fertilizerType, quantity, distributionDate } = await c.req.json();

    const farmer = await kv.get(`farmer:survey:${surveyNumber}`);
    if (!farmer) {
      return c.json({ error: "Farmer not found" }, 404);
    }

    const distribution = {
      id: `dist_${Date.now()}`,
      surveyNumber,
      fertilizerType,
      quantity,
      distributionDate,
      createdAt: new Date().toISOString(),
    };

    // Store distribution record
    await kv.set(`fertilizer:${distribution.id}`, distribution);

    // Update farmer's fertilizer history
    const farmerFertilizers = farmer.fertilizers || [];
    farmerFertilizers.push(distribution);

    await kv.set(`farmer:survey:${surveyNumber}`, {
      ...farmer,
      fertilizers: farmerFertilizers,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true, distribution });
  } catch (error) {
    console.log(`Fertilizer distribution error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get fertilizer distribution for a farmer
app.get("/make-server-e097b8bf/fertilizers/:surveyNumber", async (c) => {
  try {
    const surveyNumber = c.req.param("surveyNumber");
    const farmer = await kv.get(`farmer:survey:${surveyNumber}`);

    if (!farmer) {
      return c.json({ error: "Farmer not found" }, 404);
    }

    return c.json({ success: true, fertilizers: farmer.fertilizers || [] });
  } catch (error) {
    console.log(`Get fertilizer history error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// VENDOR SEARCH ROUTES
// ============================================

// Search farmers by location and crop
app.post("/make-server-e097b8bf/vendors/search", async (c) => {
  try {
    const { state, district, taluk, hobli, village, cropType } = await c.req.json();

    // Get all farmers
    const allFarmers = await kv.getByPrefix("farmer:survey:");

    // Filter farmers based on criteria
    let filtered = allFarmers.filter((farmer: any) => {
      if (state && farmer.state !== state) return false;
      if (district && farmer.district !== district) return false;
      if (taluk && farmer.taluk !== taluk) return false;
      if (hobli && farmer.hobli !== hobli) return false;
      if (village && farmer.village !== village) return false;
      const crops = extractFarmerCrops(farmer);
      if (!crops.length) return false;
      if (cropType && !crops.some((crop: any) => crop.cropType === cropType)) return false;
      return crops.some((crop: any) => (crop.quantity || 0) > 0);
    });

    // Calculate demand indicators
    const demandData = calculateDemandIndicators(filtered);

    return c.json({
      success: true,
      farmers: filtered,
      demandData,
    });
  } catch (error) {
    console.log(`Vendor search error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get locations hierarchy
app.get("/make-server-e097b8bf/locations", async (c) => {
  try {
    const allFarmers = await kv.getByPrefix("farmer:survey:");

    const locations = {
      states: new Set(),
      districts: new Map(),
      taluks: new Map(),
      hoblis: new Map(),
      villages: new Map(),
    };

    allFarmers.forEach((farmer: any) => {
      if (farmer.state) locations.states.add(farmer.state);
      if (farmer.district) {
        if (!locations.districts.has(farmer.state)) {
          locations.districts.set(farmer.state, new Set());
        }
        locations.districts.get(farmer.state).add(farmer.district);
      }
      if (farmer.taluk) {
        const key = `${farmer.state}:${farmer.district}`;
        if (!locations.taluks.has(key)) {
          locations.taluks.set(key, new Set());
        }
        locations.taluks.get(key).add(farmer.taluk);
      }
      if (farmer.hobli) {
        const key = `${farmer.state}:${farmer.district}:${farmer.taluk}`;
        if (!locations.hoblis.has(key)) {
          locations.hoblis.set(key, new Set());
        }
        locations.hoblis.get(key).add(farmer.hobli);
      }
      if (farmer.village) {
        const key = `${farmer.state}:${farmer.district}:${farmer.taluk}:${farmer.hobli}`;
        if (!locations.villages.has(key)) {
          locations.villages.set(key, new Set());
        }
        locations.villages.get(key).add(farmer.village);
      }
    });

    return c.json({
      success: true,
      locations: {
        states: Array.from(locations.states),
        districts: Object.fromEntries(
          Array.from(locations.districts.entries()).map(([k, v]) => [k, Array.from(v)])
        ),
        taluks: Object.fromEntries(
          Array.from(locations.taluks.entries()).map(([k, v]) => [k, Array.from(v)])
        ),
        hoblis: Object.fromEntries(
          Array.from(locations.hoblis.entries()).map(([k, v]) => [k, Array.from(v)])
        ),
        villages: Object.fromEntries(
          Array.from(locations.villages.entries()).map(([k, v]) => [k, Array.from(v)])
        ),
      },
    });
  } catch (error) {
    console.log(`Get locations error: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Helper function to calculate demand indicators
function calculateDemandIndicators(farmers: any[]) {
  const cropStats = new Map();

  farmers.forEach((farmer) => {
    const farmerCrops = extractFarmerCrops(farmer);
    const countedTypes = new Set<string>();
    farmerCrops.forEach((crop) => {
      if (!crop) return;

      if (!cropStats.has(crop.cropType)) {
        cropStats.set(crop.cropType, {
          totalQuantity: 0,
          farmerCount: 0,
          avgQuantity: 0,
          nearestHarvest: null,
        });
      }

      const stats = cropStats.get(crop.cropType);
      stats.totalQuantity += crop.quantity || 0;
      if (!countedTypes.has(crop.cropType)) {
        stats.farmerCount += 1;
        countedTypes.add(crop.cropType);
      }

      // Calculate expected harvest date
      if (crop.plantedDate) {
        const plantedDate = new Date(crop.plantedDate);
        const growthPeriod = crop.growthDays || 120; // Default 120 days
        const harvestDate = new Date(plantedDate);
        harvestDate.setDate(harvestDate.getDate() + growthPeriod);

        if (!stats.nearestHarvest || harvestDate < new Date(stats.nearestHarvest)) {
          stats.nearestHarvest = harvestDate.toISOString();
        }
      }
    });
  });

  cropStats.forEach((stats, cropType) => {
    stats.avgQuantity = stats.farmerCount ? stats.totalQuantity / stats.farmerCount : 0;
    stats.demand = stats.totalQuantity > 1000 ? "high" : stats.totalQuantity > 500 ? "medium" : "low";
  });

  return Object.fromEntries(cropStats);
}

export default app;
