import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as dotenv from "dotenv";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ Missing DATABASE_URL environment variable.");
  process.exit(1);
}

const queryClient = postgres(databaseUrl, { prepare: false });
const db = drizzle(queryClient, { schema });

async function main() {
  console.log("🚀 Starting data seeding for demo account...");

  // Dynamically resolve organizationId and shopId from active demo profiles in the database
  console.log("🔍 Resolving demo organization and shop IDs from active profiles...");
  
  const [ownerProfile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.email, "demo_opticalmanager@gmail.com"))
    .limit(1);

  const [managerProfile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.email, "demo001_opticalmanager@gmail.com"))
    .limit(1);

  const ORG_ID = ownerProfile?.organizationId || managerProfile?.organizationId;
  const SHOP_ID = managerProfile?.shopId || ownerProfile?.shopId;

  if (!ORG_ID || !SHOP_ID) {
    console.error("❌ Could not resolve demo ORG_ID or SHOP_ID from database profiles.");
    console.log("Profiles found:", { ownerProfile, managerProfile });
    process.exit(1);
  }

  console.log(`📍 Resolved Active ORG_ID: ${ORG_ID}`);
  console.log(`📍 Resolved Active SHOP_ID: ${SHOP_ID}`);

  // Ensure organization exists and settings are updated
  console.log("🏢 Ensuring demo organization exists...");
  const [existingOrg] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, ORG_ID))
    .limit(1);

  if (!existingOrg) {
    console.log("✨ Creating demo organization...");
    await db.insert(schema.organizations).values({
      id: ORG_ID,
      name: "Vision care optics",
      slug: "vision-care-optics",
      onboardingCompleted: true,
    });
  } else {
    console.log("🏢 Organization already exists. Ensuring name is updated...");
    await db
      .update(schema.organizations)
      .set({ name: "Vision care optics" })
      .where(eq(schema.organizations.id, ORG_ID));
  }

  // Ensure shop exists and is named Store 1
  console.log("🏪 Ensuring demo shop exists...");
  const [existingShop] = await db
    .select()
    .from(schema.shops)
    .where(eq(schema.shops.id, SHOP_ID))
    .limit(1);

  if (!existingShop) {
    console.log("✨ Creating demo shop...");
    await db.insert(schema.shops).values({
      id: SHOP_ID,
      organizationId: ORG_ID,
      name: "Store 1",
      email: "demo001_opticalmanager@gmail.com",
      phone: "9999999999",
      address: "Narsapur",
      isActive: true,
    });
  } else {
    console.log("🏪 Shop already exists. Ensuring name is Store 1...");
    await db
      .update(schema.shops)
      .set({ name: "Store 1" })
      .where(eq(schema.shops.id, SHOP_ID));
  }

  // 1. Clean existing records for the demo organization
  console.log("🧹 Cleaning existing demo records...");
  await db.delete(schema.orders).where(eq(schema.orders.organizationId, ORG_ID));
  await db.delete(schema.receipts).where(eq(schema.receipts.organizationId, ORG_ID));
  await db.delete(schema.invoiceItems).where(eq(schema.invoiceItems.organizationId, ORG_ID));
  await db.delete(schema.invoices).where(eq(schema.invoices.organizationId, ORG_ID));
  await db.delete(schema.prescriptions).where(eq(schema.prescriptions.organizationId, ORG_ID));
  await db.delete(schema.customers).where(eq(schema.customers.organizationId, ORG_ID));

  // For details tables, we delete cascade via inventory cascade, but let's delete them cleanly
  const currentInventory = await db
    .select({ id: schema.inventory.id })
    .from(schema.inventory)
    .where(eq(schema.inventory.organizationId, ORG_ID));
  
  const inventoryIds = currentInventory.map(item => item.id);
  if (inventoryIds.length > 0) {
    for (const invId of inventoryIds) {
      await db.delete(schema.frameDetails).where(eq(schema.frameDetails.inventoryId, invId));
      await db.delete(schema.lensDetails).where(eq(schema.lensDetails.inventoryId, invId));
      await db.delete(schema.contactLensDetails).where(eq(schema.contactLensDetails.inventoryId, invId));
      await db.delete(schema.accessoryDetails).where(eq(schema.accessoryDetails.inventoryId, invId));
    }
  }

  await db.delete(schema.inventory).where(eq(schema.inventory.organizationId, ORG_ID));
  console.log("✅ Cleanup complete.");

  // 2. Insert 10 Customers
  console.log("👤 Seeding 10 customers...");
  const customerValues = [
    {
      fullName: "Amit Sharma",
      phone: "9876543210",
      email: "amit.sharma@example.com",
      gender: "MALE" as const,
      address: "123, Sector 15",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      registrationId: "CUST-001",
      referredBy: "Dr. K. Verma",
      chiefComplaint: "Blurry distance vision for the past 6 months.",
    },
    {
      fullName: "Priyanka Patel",
      phone: "9812345678",
      email: "priyanka.p@example.com",
      gender: "FEMALE" as const,
      address: "45, Ring Road",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380015",
      registrationId: "CUST-002",
      referredBy: "Google Search",
      chiefComplaint: "Headaches during prolonged laptop usage.",
    },
    {
      fullName: "Rohan Das",
      phone: "8899001122",
      email: "rohan.das@example.com",
      gender: "MALE" as const,
      address: "Flat 4B, Greenwood Apts",
      city: "Kolkata",
      state: "West Bengal",
      pincode: "700056",
      registrationId: "CUST-003",
      referredBy: "Walk-in",
      chiefComplaint: "Lost previous eyeglasses. Needs new test.",
    },
    {
      fullName: "Meera Nair",
      phone: "7766554433",
      email: "meera.nair@example.com",
      gender: "FEMALE" as const,
      address: "Nair Villa, MG Road",
      city: "Kochi",
      state: "Kerala",
      pincode: "682011",
      registrationId: "CUST-004",
      referredBy: "Friend's Recommendation",
      chiefComplaint: "Trouble reading newspapers or small print.",
    },
    {
      fullName: "Vikram Malhotra",
      phone: "9988776655",
      email: "vikram.m@example.com",
      gender: "MALE" as const,
      address: "102, Gulmohar Enclave",
      city: "South Delhi",
      state: "Delhi",
      pincode: "110049",
      registrationId: "CUST-005",
      referredBy: "Dr. Elias Vance",
      chiefComplaint: "Interested in switching to contact lenses.",
    },
    {
      fullName: "Sunita Rao",
      phone: "9440123456",
      email: "sunita.rao@example.com",
      gender: "FEMALE" as const,
      address: "Apartment 301, Lakeview Res",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      registrationId: "CUST-006",
      referredBy: "Optometrist Refer",
      chiefComplaint: "Dryness in eyes, irritation during driving.",
    },
    {
      fullName: "Harpreet Singh",
      phone: "9814098765",
      email: "harpreet.singh@example.com",
      gender: "MALE" as const,
      address: "House 78, Phase 3B2",
      city: "Mohali",
      state: "Punjab",
      pincode: "160059",
      registrationId: "CUST-007",
      referredBy: "Walk-in",
      chiefComplaint: "Double vision on looking right.",
    },
    {
      fullName: "Sneha Reddy",
      phone: "8886664442",
      email: "sneha.reddy@example.com",
      gender: "FEMALE" as const,
      address: "Plot 120, Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500033",
      registrationId: "CUST-008",
      referredBy: "Instagram Ad",
      chiefComplaint: "Wants colored power contact lenses.",
    },
    {
      fullName: "Arjun Mehta",
      phone: "9123450987",
      email: "arjun.mehta@example.com",
      gender: "MALE" as const,
      address: "55, Marine Drive",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400002",
      registrationId: "CUST-009",
      referredBy: "Walk-in",
      chiefComplaint: "Requires scratch-resistant progressive lenses.",
    },
    {
      fullName: "Deepika Padukone",
      phone: "9900887766",
      email: "deepika.p@example.com",
      gender: "FEMALE" as const,
      address: "Prabhadevi Towers",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400025",
      registrationId: "CUST-010",
      referredBy: "Celebrity Doctor",
      chiefComplaint: "Annual routine vision exam.",
    }
  ];

  const seededCustomers = [];
  for (const c of customerValues) {
    const [inserted] = await db
      .insert(schema.customers)
      .values({
        ...c,
        shopId: SHOP_ID,
        organizationId: ORG_ID,
      })
      .returning();
    seededCustomers.push(inserted);
  }
  console.log(`✅ Seeded ${seededCustomers.length} customers.`);

  // 3. Insert 5 Prescriptions
  console.log("👓 Seeding 5 prescriptions...");
  const prescriptionValues = [
    {
      customerId: seededCustomers[0].id, // Amit Sharma
      prescriptionType: "DISTANCE" as const,
      rightSphere: "-1.50",
      rightCylinder: "-0.50",
      rightAxis: "90.0",
      leftSphere: "-1.25",
      leftCylinder: "-0.75",
      leftAxis: "180.0",
      pd: "63.0",
      doctorName: "Dr. K. Verma",
      frameName: "Aviator Style",
      prescribedBy: "Dr. K. Verma",
      prescribedAt: new Date().toISOString().split("T")[0],
    },
    {
      customerId: seededCustomers[1].id, // Priyanka Patel
      prescriptionType: "DISTANCE" as const,
      rightSphere: "-0.75",
      rightCylinder: "0.00",
      rightAxis: "0.0",
      leftSphere: "-1.00",
      leftCylinder: "-0.25",
      leftAxis: "45.0",
      pd: "61.5",
      doctorName: "Dr. Elias Vance",
      frameName: "Oakley Blue Rect",
      prescribedBy: "Dr. Elias Vance",
      prescribedAt: new Date().toISOString().split("T")[0],
    },
    {
      customerId: seededCustomers[3].id, // Meera Nair
      prescriptionType: "NEAR" as const,
      rightSphere: "+2.00",
      rightCylinder: "0.00",
      rightAxis: "0.0",
      leftSphere: "+2.00",
      leftCylinder: "0.00",
      leftAxis: "0.0",
      pd: "60.0",
      doctorName: "Dr. Sarah Jenks",
      frameName: "Vogue Round Gold",
      prescribedBy: "Dr. Sarah Jenks",
      prescribedAt: new Date().toISOString().split("T")[0],
    },
    {
      customerId: seededCustomers[4].id, // Vikram Malhotra
      prescriptionType: "DISTANCE" as const,
      rightSphere: "-3.50",
      rightCylinder: "-1.25",
      rightAxis: "175.0",
      leftSphere: "-3.25",
      leftCylinder: "-1.50",
      leftAxis: "165.0",
      pd: "64.0",
      doctorName: "Dr. K. Verma",
      frameName: "Carrera Acetate Black",
      prescribedBy: "Dr. K. Verma",
      prescribedAt: new Date().toISOString().split("T")[0],
    },
    {
      customerId: seededCustomers[6].id, // Harpreet Singh
      prescriptionType: "DISTANCE" as const,
      rightSphere: "-2.25",
      rightCylinder: "-0.50",
      rightAxis: "95.0",
      leftSphere: "-2.50",
      leftCylinder: "-0.25",
      leftAxis: "85.0",
      pd: "62.0",
      doctorName: "Dr. Elias Vance",
      frameName: "Ray-Ban Clubmaster",
      prescribedBy: "Dr. Elias Vance",
      prescribedAt: new Date().toISOString().split("T")[0],
    }
  ];

  for (const rx of prescriptionValues) {
    await db.insert(schema.prescriptions).values({
      ...rx,
      shopId: SHOP_ID,
      organizationId: ORG_ID,
    });
  }
  console.log("✅ Seeded 5 prescriptions.");

  // 4. Insert 20 Inventory Items
  console.log("📦 Seeding 20 inventory items across 5 categories...");
  
  const inventoryData = [
    // --- FRAME CATEGORY ---
    {
      name: "Ray-Ban Aviator Classic",
      category: "FRAME" as const,
      brand: "Ray-Ban",
      model: "RB3025",
      sku: "FRM-RB-AVI",
      price: "8500.00",
      costPrice: "4200.00",
      quantity: 15,
      minQuantity: 3,
      hsnCode: "90031900",
      cgstPercent: "9.00",
      sgstPercent: "9.00",
      vendorName: "Luxottica India",
      rackLocation: "Rack A-1",
      detailsType: "frame",
      details: {
        modelNumber: "RB3025-L0205",
        colorCode: "Gold/G-15 Green",
        size: "58-14-135",
        material: "Metal",
        frameShape: "Aviator",
        targetDemographic: "UNISEX"
      }
    },
    {
      name: "Oakley Holbrook Woodgrain",
      category: "FRAME" as const,
      brand: "Oakley",
      model: "OO9102",
      sku: "FRM-OK-HOL",
      price: "9500.00",
      costPrice: "4800.00",
      quantity: 8,
      minQuantity: 2,
      hsnCode: "90031900",
      cgstPercent: "9.00",
      sgstPercent: "9.00",
      vendorName: "Luxottica India",
      rackLocation: "Rack A-2",
      detailsType: "frame",
      details: {
        modelNumber: "OO9102-B7",
        colorCode: "Woodgrain/Prizm Daily",
        size: "57-18-137",
        material: "O-Matter",
        frameShape: "Square",
        targetDemographic: "MALE"
      }
    },
    {
      name: "Vogue Round Metal",
      category: "FRAME" as const,
      brand: "Vogue",
      model: "VO4112",
      sku: "FRM-VG-RND",
      price: "4500.00",
      costPrice: "2100.00",
      quantity: 12,
      minQuantity: 4,
      hsnCode: "90031900",
      cgstPercent: "9.00",
      sgstPercent: "9.00",
      vendorName: "Essilor-Luxottica",
      rackLocation: "Rack A-3",
      detailsType: "frame",
      details: {
        modelNumber: "VO4112-S-352",
        colorCode: "Gold/Black rim",
        size: "50-20-140",
        material: "Metal",
        frameShape: "Round",
        targetDemographic: "FEMALE"
      }
    },
    {
      name: "Carrera Rectangle Acetate",
      category: "FRAME" as const,
      brand: "Carrera",
      model: "CA8822",
      sku: "FRM-CR-RCT",
      price: "6200.00",
      costPrice: "3000.00",
      quantity: 2, // Low stock!
      minQuantity: 3,
      hsnCode: "90031100",
      cgstPercent: "9.00",
      sgstPercent: "9.00",
      vendorName: "Safilo Group",
      rackLocation: "Rack A-4",
      detailsType: "frame",
      details: {
        modelNumber: "CA8822-003",
        colorCode: "Matte Black",
        size: "54-16-145",
        material: "Acetate",
        frameShape: "Rectangle",
        targetDemographic: "MALE"
      }
    },

    // --- LENS CATEGORY ---
    {
      name: "Essilor Crizal Prevencia 1.56",
      category: "LENS" as const,
      brand: "Essilor",
      model: "Crizal Prevencia",
      sku: "LNS-ES-CRZ",
      price: "3500.00",
      costPrice: "1500.00",
      quantity: 50,
      minQuantity: 10,
      hsnCode: "90015000",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Essilor India",
      rackLocation: "Cabinet L-1",
      detailsType: "lens",
      details: {
        design: "Single Vision",
        refractiveIndex: "1.56",
        material: "Plastic (Orma)",
        blankDiameter: 70,
        stockPower: "-4.00 to +4.00",
        isAntiReflective: true,
        isBlueControl: true,
        isHardCoat: true
      }
    },
    {
      name: "Zeiss SV DuraVision BlueProtect 1.6",
      category: "LENS" as const,
      brand: "Zeiss",
      model: "BlueProtect 1.6",
      sku: "LNS-ZS-DVP",
      price: "6800.00",
      costPrice: "3100.00",
      quantity: 30,
      minQuantity: 5,
      hsnCode: "90015000",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Carl Zeiss India",
      rackLocation: "Cabinet L-2",
      detailsType: "lens",
      details: {
        design: "Single Vision (Aspheric)",
        refractiveIndex: "1.60",
        material: "Polycarbonate",
        blankDiameter: 75,
        stockPower: "-6.00 to +4.00",
        isAntiReflective: true,
        isBlueControl: true,
        isHardCoat: true
      }
    },
    {
      name: "Hoya Nulux Active 1.5",
      category: "LENS" as const,
      brand: "Hoya",
      model: "Nulux Active",
      sku: "LNS-HY-NLX",
      price: "4200.00",
      costPrice: "1800.00",
      quantity: 20,
      minQuantity: 5,
      hsnCode: "90015000",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Hoya Lens India",
      rackLocation: "Cabinet L-3",
      detailsType: "lens",
      details: {
        design: "Enhanced Single Vision (Digital Boost)",
        refractiveIndex: "1.50",
        material: "Plastic",
        blankDiameter: 70,
        stockPower: "-3.00 to +3.00",
        isAntiReflective: true,
        isHardCoat: true
      }
    },
    {
      name: "Seiko SuperResistantCoat 1.67",
      category: "LENS" as const,
      brand: "Seiko",
      model: "SRC 1.67",
      sku: "LNS-SK-SRC",
      price: "9800.00",
      costPrice: "4500.00",
      quantity: 0, // Out of Stock!
      minQuantity: 2,
      hsnCode: "90015000",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Seiko Optical",
      rackLocation: "Cabinet L-4",
      detailsType: "lens",
      details: {
        design: "Progressive (Ultra-Thin)",
        refractiveIndex: "1.67",
        material: "MR-10 High Index",
        blankDiameter: 75,
        stockPower: "-8.00 to +6.00",
        isAntiReflective: true,
        isHardCoat: true,
        isPhotochromic: true
      }
    },

    // --- CONTACT LENS CATEGORY ---
    {
      name: "Acuvue Oasys 1-Day",
      category: "CONTACT_LENS" as const,
      brand: "Acuvue",
      model: "Oasys 1-Day Hydraluxe",
      sku: "CTL-AV-OAS",
      price: "2800.00",
      costPrice: "1400.00",
      quantity: 24,
      minQuantity: 6,
      hsnCode: "90013000",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Johnson & Johnson",
      rackLocation: "CL Shelf 1",
      detailsType: "contact_lens",
      details: {
        modality: "Daily Disposable",
        boxQuantity: 30,
        baseCurve: "8.5",
        diameter: "14.3",
        color: "Clear",
        sphere: "-2.50"
      }
    },
    {
      name: "Bausch + Lomb Biotrue",
      category: "CONTACT_LENS" as const,
      brand: "Bausch + Lomb",
      model: "Biotrue ONEday",
      sku: "CTL-BL-BIO",
      price: "1900.00",
      costPrice: "950.00",
      quantity: 40,
      minQuantity: 10,
      hsnCode: "90013000",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Bausch & Lomb India",
      rackLocation: "CL Shelf 2",
      detailsType: "contact_lens",
      details: {
        modality: "Daily Disposable",
        boxQuantity: 30,
        baseCurve: "8.6",
        diameter: "14.2",
        color: "Clear",
        sphere: "-1.50"
      }
    },
    {
      name: "Alcon Dailies Total 1",
      category: "CONTACT_LENS" as const,
      brand: "Alcon",
      model: "Dailies Total 1",
      sku: "CTL-AL-DT1",
      price: "3400.00",
      costPrice: "1750.00",
      quantity: 15,
      minQuantity: 4,
      hsnCode: "90013000",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Alcon India",
      rackLocation: "CL Shelf 3",
      detailsType: "contact_lens",
      details: {
        modality: "Daily Disposable",
        boxQuantity: 30,
        baseCurve: "8.5",
        diameter: "14.1",
        color: "Clear",
        sphere: "-3.00"
      }
    },
    {
      name: "CooperVision Biofinity",
      category: "CONTACT_LENS" as const,
      brand: "CooperVision",
      model: "Biofinity Monthly",
      sku: "CTL-CV-BIO",
      price: "2200.00",
      costPrice: "1100.00",
      quantity: 3, // Low stock!
      minQuantity: 5,
      hsnCode: "90013000",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "CooperVision India",
      rackLocation: "CL Shelf 4",
      detailsType: "contact_lens",
      details: {
        modality: "Monthly Disposable",
        boxQuantity: 6,
        baseCurve: "8.6",
        diameter: "14.0",
        color: "Clear",
        sphere: "-2.00"
      }
    },

    // --- ACCESSORY CATEGORY ---
    {
      name: "Microfiber Cleaning Cloth Pack",
      category: "ACCESSORY" as const,
      brand: "Generic",
      model: "Ultra-Soft Microfiber",
      sku: "ACC-MF-CLH",
      price: "150.00",
      costPrice: "35.00",
      quantity: 100,
      minQuantity: 20,
      hsnCode: "63071090",
      cgstPercent: "9.00",
      sgstPercent: "9.00",
      vendorName: "Local Distributor",
      rackLocation: "Counter Drawer 1",
      detailsType: "accessory",
      details: {
        type: "Microfiber Cloth",
        sizeVolume: "15x15 cm",
        colorPattern: "Solid Light Blue / Grey"
      }
    },
    {
      name: "Premium Leather Hard Case",
      category: "ACCESSORY" as const,
      brand: "Vision Care",
      model: "Luxury Leatherette",
      sku: "ACC-LTH-CSE",
      price: "650.00",
      costPrice: "220.00",
      quantity: 35,
      minQuantity: 5,
      hsnCode: "42023120",
      cgstPercent: "9.00",
      sgstPercent: "9.00",
      vendorName: "Leathercraft Accessories",
      rackLocation: "Display Cabin B",
      detailsType: "accessory",
      details: {
        type: "Hard Eyeglass Case",
        sizeVolume: "Standard (Hard Shell)",
        colorPattern: "Vintage Tan Brown"
      }
    },
    {
      name: "Anti-Fog Cleaning Spray 50ml",
      category: "ACCESSORY" as const,
      brand: "Clarify",
      model: "Anti-Fog Guard",
      sku: "ACC-AF-SPR",
      price: "250.00",
      costPrice: "80.00",
      quantity: 4, // Low stock!
      minQuantity: 10,
      hsnCode: "34022090",
      cgstPercent: "9.00",
      sgstPercent: "9.00",
      vendorName: "Chemical Solutions Ltd",
      rackLocation: "Counter Shelf C",
      detailsType: "accessory",
      details: {
        type: "Cleaner Spray",
        sizeVolume: "50 ml",
        colorPattern: "Transparent Bottle"
      }
    },
    {
      name: "Designer Glasses Cord/Strap",
      category: "ACCESSORY" as const,
      brand: "Vogue Style",
      model: "Fashion Chain",
      sku: "ACC-DS-CRD",
      price: "350.00",
      costPrice: "120.00",
      quantity: 18,
      minQuantity: 5,
      hsnCode: "56090090",
      cgstPercent: "9.00",
      sgstPercent: "9.00",
      vendorName: "Creative Imports",
      rackLocation: "Rack Accessories 1",
      detailsType: "accessory",
      details: {
        type: "Chain / Strap",
        sizeVolume: "70 cm Length",
        colorPattern: "Silver-plated Metal Link"
      }
    },

    // --- SOLUTION CATEGORY ---
    {
      name: "Renu Fresh Solution 355ml",
      category: "SOLUTION" as const,
      brand: "Bausch + Lomb",
      model: "Renu Fresh Multi-Purpose",
      sku: "SOL-RN-FRH",
      price: "490.00",
      costPrice: "240.00",
      quantity: 60,
      minQuantity: 10,
      hsnCode: "33079090",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Bausch & Lomb India",
      rackLocation: "Solution Section 1",
      detailsType: "solution",
      details: {
        type: "Multi-purpose Disinfecting Solution",
        sizeVolume: "355 ml",
        colorPattern: "Blue/White Carton"
      }
    },
    {
      name: "Opti-Free Replenish 300ml",
      category: "SOLUTION" as const,
      brand: "Alcon",
      model: "Opti-Free Replenish",
      sku: "SOL-OF-RPL",
      price: "550.00",
      costPrice: "280.00",
      quantity: 45,
      minQuantity: 10,
      hsnCode: "33079090",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Alcon India",
      rackLocation: "Solution Section 2",
      detailsType: "solution",
      details: {
        type: "Reconditioning Multi-purpose Solution",
        sizeVolume: "300 ml",
        colorPattern: "Green/White Carton"
      }
    },
    {
      name: "Biotrue Solution 300ml",
      category: "SOLUTION" as const,
      brand: "Bausch + Lomb",
      model: "Biotrue Multi-Purpose",
      sku: "SOL-BL-BIO",
      price: "520.00",
      costPrice: "260.00",
      quantity: 1, // Low stock!
      minQuantity: 8,
      hsnCode: "33079090",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Bausch & Lomb India",
      rackLocation: "Solution Section 3",
      detailsType: "solution",
      details: {
        type: "Bio-inspired Disinfecting Solution",
        sizeVolume: "300 ml",
        colorPattern: "Green Clear Carton"
      }
    },
    {
      name: "Alcon AoSept Plus 360ml",
      category: "SOLUTION" as const,
      brand: "Alcon",
      model: "AoSept Plus Hydrogen Peroxide",
      sku: "SOL-AL-AOS",
      price: "850.00",
      costPrice: "420.00",
      quantity: 12,
      minQuantity: 3,
      hsnCode: "33079090",
      cgstPercent: "6.00",
      sgstPercent: "6.00",
      vendorName: "Alcon India",
      rackLocation: "Solution Section 4",
      detailsType: "solution",
      details: {
        type: "Hydrogen Peroxide Cleaning System",
        sizeVolume: "360 ml",
        colorPattern: "Red/White Carton"
      }
    }
  ];

  const seededInventory: any[] = [];
  for (const item of inventoryData) {
    const { detailsType, details, ...core } = item;
    const [inserted] = await db
      .insert(schema.inventory)
      .values({
        ...core,
        shopId: SHOP_ID,
        organizationId: ORG_ID,
      })
      .returning();

    // Seed appropriate details table
    if (detailsType === "frame") {
      await db.insert(schema.frameDetails).values({
        inventoryId: inserted.id,
        ...details
      });
    } else if (detailsType === "lens") {
      await db.insert(schema.lensDetails).values({
        inventoryId: inserted.id,
        ...details
      });
    } else if (detailsType === "contact_lens") {
      await db.insert(schema.contactLensDetails).values({
        inventoryId: inserted.id,
        ...details
      });
    } else if (detailsType === "accessory" || detailsType === "solution") {
      // Both match accessoryDetails schema in database table mapping
      await db.insert(schema.accessoryDetails).values({
        inventoryId: inserted.id,
        type: details.type,
        sizeVolume: details.sizeVolume,
        colorPattern: details.colorPattern
      });
    }

    seededInventory.push(inserted);
  }
  console.log(`✅ Seeded ${seededInventory.length} inventory items.`);

  // Helper function to get an inventory item by SKU
  const getInv = (sku: string) => seededInventory.find(i => i.sku === sku);

  // 5. Seed 10 Invoices + Invoice Items + Orders + Receipts
  console.log("🧾 Seeding 10 invoices, order lists, and payment receipts...");
  
  const invoicesData = [
    // Invoice 1: PAID, DELIVERED
    {
      customerIndex: 0, // Amit Sharma
      invoiceNumber: "INV-2026-0001",
      status: "PAID" as const,
      paymentMethod: "UPI" as const,
      fulfillmentStatus: "DELIVERED" as const,
      discount: "500.00",
      discountPercent: "5.00",
      items: [
        { sku: "FRM-RB-AVI", qty: 1, discountPercent: "0.00" }, // Ray-Ban: 8500
        { sku: "LNS-ES-CRZ", qty: 2, discountPercent: "0.00" }, // Essilor Lens: 3500x2 = 7000
      ],
      amountPaid: "15000.00", // Total: 15500 sub - 500 disc = 15000
      notes: "Delivered on-time. Patient extremely satisfied with blue control coating."
    },
    // Invoice 2: PAID, DELIVERED
    {
      customerIndex: 1, // Priyanka Patel
      invoiceNumber: "INV-2026-0002",
      status: "PAID" as const,
      paymentMethod: "CARD" as const,
      fulfillmentStatus: "DELIVERED" as const,
      discount: "0.00",
      discountPercent: "0.00",
      items: [
        { sku: "FRM-OK-HOL", qty: 1, discountPercent: "0.00" }, // Oakley: 9500
        { sku: "LNS-ZS-DVP", qty: 2, discountPercent: "0.00" }, // Zeiss: 6800x2 = 13600
        { sku: "ACC-LTH-CSE", qty: 1, discountPercent: "0.00" }, // Case: 650
      ],
      amountPaid: "23750.00", // Subtotal & Total: 23750
      notes: "Card payment received. Dispensed with premium leatherette case."
    },
    // Invoice 3: PARTIALLY_PAID, PROCESSING
    {
      customerIndex: 2, // Rohan Das
      invoiceNumber: "INV-2026-0003",
      status: "PENDING" as const, // Drizzle invoices has status "PENDING" for outstanding balance
      paymentMethod: "CASH" as const,
      fulfillmentStatus: "PROCESSING" as const,
      discount: "200.00",
      discountPercent: "4.00",
      items: [
        { sku: "FRM-VG-RND", qty: 1, discountPercent: "0.00" }, // Vogue: 4500
        { sku: "LNS-HY-NLX", qty: 2, discountPercent: "0.00" }, // Hoya: 4200x2 = 8400
        { sku: "ACC-MF-CLH", qty: 2, discountPercent: "0.00" }, // Cloths: 150x2 = 300
      ],
      amountPaid: "5000.00", // Total: 13200 - 200 = 13000. Balance: 8000.
      notes: "Deposit of Rs. 5000 paid. Balance Rs. 8000 due at delivery.",
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 3 days later
    },
    // Invoice 4: PARTIALLY_PAID, READY
    {
      customerIndex: 3, // Meera Nair
      invoiceNumber: "INV-2026-0004",
      status: "PENDING" as const,
      paymentMethod: "UPI" as const,
      fulfillmentStatus: "READY" as const,
      discount: "0.00",
      discountPercent: "0.00",
      items: [
        { sku: "FRM-CR-RCT", qty: 1, discountPercent: "0.00" }, // Carrera: 6200
        { sku: "SOL-RN-FRH", qty: 1, discountPercent: "0.00" }, // Solution: 490
      ],
      amountPaid: "3000.00", // Total: 6690. Balance: 3690.
      notes: "Specs are ready in case. Inwarded to display box. Patient notified.",
      estimatedDelivery: new Date().toISOString().split("T")[0] // Today
    },
    // Invoice 5: PAID, PROCESSING (Delayed)
    {
      customerIndex: 4, // Vikram Malhotra
      invoiceNumber: "INV-2026-0005",
      status: "PAID" as const,
      paymentMethod: "BANK_TRANSFER" as const,
      fulfillmentStatus: "PROCESSING" as const,
      discount: "1000.00",
      discountPercent: "10.00",
      items: [
        { sku: "CTL-AV-OAS", qty: 2, discountPercent: "0.00" }, // Acuvue: 2800x2 = 5600
        { sku: "SOL-BL-BIO", qty: 2, discountPercent: "0.00" }, // Solution: 520x2 = 1040
        { sku: "ACC-MF-CLH", qty: 1, discountPercent: "0.00" }, // Cloth: 150
      ],
      amountPaid: "5790.00", // Total: 6790 - 1000 = 5790.
      notes: "Full payment done. Delivery is delayed due to custom contact power lens production.",
      estimatedDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 2 days ago (DELAYED!)
    },
    // Invoice 6: CANCELLED
    {
      customerIndex: 5, // Sunita Rao
      invoiceNumber: "INV-2026-0006",
      status: "CANCELLED" as const,
      paymentMethod: null,
      fulfillmentStatus: "ON_HOLD" as const,
      discount: "0.00",
      discountPercent: "0.00",
      items: [
        { sku: "FRM-RB-AVI", qty: 1, discountPercent: "0.00" }, // Ray-Ban: 8500
      ],
      amountPaid: "0.00", // Total: 8500. Balance: 8500.
      notes: "Patient cancelled order. Decided to buy later."
    },
    // Invoice 7: UNPAID, PROCESSING
    {
      customerIndex: 6, // Harpreet Singh
      invoiceNumber: "INV-2026-0007",
      status: "PENDING" as const,
      paymentMethod: null,
      fulfillmentStatus: "PROCESSING" as const,
      discount: "0.00",
      discountPercent: "0.00",
      items: [
        { sku: "FRM-VG-RND", qty: 1, discountPercent: "0.00" }, // Vogue: 4500
        { sku: "LNS-HY-NLX", qty: 2, discountPercent: "0.00" }, // Hoya: 4200x2 = 8400
      ],
      amountPaid: "0.00", // Total: 12900. Balance: 12900.
      notes: "Awaiting confirmation deposit. Fabrication not started.",
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 5 days later
    },
    // Invoice 8: PAID, DELIVERED
    {
      customerIndex: 7, // Sneha Reddy
      invoiceNumber: "INV-2026-0008",
      status: "PAID" as const,
      paymentMethod: "UPI" as const,
      fulfillmentStatus: "DELIVERED" as const,
      discount: "150.00",
      discountPercent: "5.00",
      items: [
        { sku: "CTL-BL-BIO", qty: 1, discountPercent: "0.00" }, // Biotrue CL: 1900
        { sku: "SOL-RN-FRH", qty: 2, discountPercent: "0.00" }, // Solution: 490x2 = 980
        { sku: "ACC-MF-CLH", qty: 1, discountPercent: "0.00" }, // Cloth: 150
      ],
      amountPaid: "2880.00", // Total: 3030 - 150 = 2880
      notes: "Seeded for contact lens demo. Delivered."
    },
    // Invoice 9: PARTIALLY_PAID, PROCESSING
    {
      customerIndex: 8, // Arjun Mehta
      invoiceNumber: "INV-2026-0009",
      status: "PENDING" as const,
      paymentMethod: "CARD" as const,
      fulfillmentStatus: "PROCESSING" as const,
      discount: "0.00",
      discountPercent: "0.00",
      items: [
        { sku: "FRM-OK-HOL", qty: 1, discountPercent: "0.00" }, // Oakley: 9500
        { sku: "LNS-ZS-DVP", qty: 2, discountPercent: "0.00" }, // Zeiss: 6800x2 = 13600
      ],
      amountPaid: "10000.00", // Total: 23100. Balance: 13100.
      notes: "Card swipe deposit done. Progressing lens order placed with lab.",
      estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 4 days later
    },
    // Invoice 10: PAID, DELIVERED
    {
      customerIndex: 9, // Deepika Padukone
      invoiceNumber: "INV-2026-0010",
      status: "PAID" as const,
      paymentMethod: "CARD" as const,
      fulfillmentStatus: "DELIVERED" as const,
      discount: "0.00",
      discountPercent: "0.00",
      items: [
        { sku: "SOL-AL-AOS", qty: 2, discountPercent: "0.00" }, // AOSept: 850x2 = 1700
        { sku: "ACC-LTH-CSE", qty: 2, discountPercent: "0.00" }, // Case: 650x2 = 1300
      ],
      amountPaid: "3000.00", // Total: 3000.
      notes: "Counter sale items."
    }
  ];

  for (const invData of invoicesData) {
    const customer = seededCustomers[invData.customerIndex];
    
    // Compute total invoice subtotal
    let subtotal = 0;
    const itemsToInsert = [];
    for (const itemSpec of invData.items) {
      const invItem = getInv(itemSpec.sku);
      if (!invItem) {
        console.error(`SKU ${itemSpec.sku} not found!`);
        continue;
      }
      const itemSubtotal = Number(invItem.price) * itemSpec.qty;
      subtotal += itemSubtotal;
      itemsToInsert.push({
        inventoryId: invItem.id,
        description: invItem.name,
        quantity: itemSpec.qty,
        unitPrice: invItem.price,
        subtotal: itemSubtotal.toFixed(2),
        cgstPercent: invItem.cgstPercent,
        sgstPercent: invItem.sgstPercent,
        igstPercent: invItem.igstPercent,
        // Amounts computed
        cgstAmount: (itemSubtotal * (Number(invItem.cgstPercent) / 100)).toFixed(2),
        sgstAmount: (itemSubtotal * (Number(invItem.sgstPercent) / 100)).toFixed(2),
        igstAmount: (itemSubtotal * (Number(invItem.igstPercent) / 100)).toFixed(2),
      });
    }

    const total = (subtotal - Number(invData.discount)).toFixed(2);
    const amountPaid = Number(invData.amountPaid);
    const balanceDue = (Number(total) - amountPaid).toFixed(2);

    // Insert Invoice
    const [insertedInvoice] = await db
      .insert(schema.invoices)
      .values({
        shopId: SHOP_ID,
        organizationId: ORG_ID,
        customerId: customer.id,
        invoiceNumber: invData.invoiceNumber,
        subtotal: subtotal.toFixed(2),
        discount: invData.discount,
        discountPercent: invData.discountPercent,
        total: total,
        status: invData.status,
        paymentMethod: invData.paymentMethod,
        fulfillmentStatus: invData.fulfillmentStatus,
        estimatedDelivery: invData.estimatedDelivery || null,
        amountPaid: invData.amountPaid,
        balanceDue: balanceDue,
        notes: invData.notes,
      })
      .returning();

    // Insert Invoice Items
    for (const item of itemsToInsert) {
      await db.insert(schema.invoiceItems).values({
        ...item,
        invoiceId: insertedInvoice.id,
        shopId: SHOP_ID,
        organizationId: ORG_ID,
      });
    }

    // Insert Receipt if amountPaid > 0
    let receiptId = null;
    if (amountPaid > 0) {
      const [insertedReceipt] = await db
        .insert(schema.receipts)
        .values({
          shopId: SHOP_ID,
          organizationId: ORG_ID,
          invoiceId: insertedInvoice.id,
          receiptNumber: `RCP-${invData.invoiceNumber.split("-")[2]}`,
          amountPaid: invData.amountPaid,
          balanceDue: balanceDue,
          paymentMethod: invData.paymentMethod || "CASH",
          transactionId: invData.paymentMethod === "UPI" || invData.paymentMethod === "CARD" ? `TXN${Math.floor(Math.random() * 90000000 + 10000000)}` : null,
        })
        .returning();
      receiptId = insertedReceipt.id;
    }

    // Insert corresponding Order
    await db.insert(schema.orders).values({
      shopId: SHOP_ID,
      organizationId: ORG_ID,
      customerId: customer.id,
      invoiceId: insertedInvoice.id,
      receiptId: receiptId,
      orderNumber: `ORD-${invData.invoiceNumber.split("-")[2]}`,
    });
  }

  console.log("✅ Seeded 10 invoices + invoice items + receipts + orders.");

  console.log("\n⭐️ SUCCESS: Database seeding for demo account finished successfully!");
  
  await queryClient.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding script crashed:", err);
  process.exit(1);
});
