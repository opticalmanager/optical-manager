import Dexie, { type Table } from "dexie";

export interface CachedCustomer {
  id: string; // customer UUID
  shopId: string;
  organizationId: string;
  registrationId: string | null;
  fullName: string;
  email: string | null;
  phone: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  referredBy?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  storeCredit: string;
  chiefComplaint?: string | null;
  familyHistory?: string | null;
  systemicIllness?: string | null;
  allergies?: string | null;
  updatedAt: string;
}

export interface CachedInventory {
  id: string; // inventory UUID
  shopId: string;
  organizationId: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  sku: string | null;
  price: string;
  quantity: number;
  isActive: boolean;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
  updatedAt: string;
}

export interface CachedAppointment {
  id: string; // appointment UUID
  shopId: string;
  organizationId: string;
  customerId: string | null;
  patientName: string;
  patientPhone: string;
  doctorName?: string | null;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  status: "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED";
  type?: string | null;
  notes?: string | null;
  updatedAt: string;
}

export interface CachedOrder {
  id: string; // order UUID
  shopId: string;
  organizationId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  status: "PENDING" | "PROCESSING" | "READY" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  itemsCount: number;
  deliveryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CachedShopProfile {
  id: string;
  organizationId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  invoiceTerms?: string | null;
  settings?: any;
  whatsappTemplates?: Record<string, { enabled?: boolean; template?: string }> | null;
  updatedAt: string;
}

export interface CachedOrganization {
  id: string;
  name: string;
  slug?: string | null;
  currency?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  settings?: any;
  subscription?: any;
  appointmentConfig?: any;
  shops?: Array<{
    id: string;
    organizationId?: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    gstin?: string | null;
    cin?: string | null;
    msmeUdyam?: string | null;
    bankName?: string | null;
    bankBranch?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    settings?: any;
    isActive?: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  }>;
  updatedAt: string;
}

export interface CachedInvoice {
  id: string; // invoice UUID
  shopId: string;
  organizationId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  paymentMethod?: string | null;
  status: string;
  fulfillmentStatus: string;
  estimatedDelivery?: string | null;
  notes?: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    category?: string | null;
    brand?: string | null;
    model?: string | null;
    sku?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CachedReturn {
  id: string;
  shopId: string;
  organizationId: string;
  returnNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  totalRefundAmount: string;
  refundMethod: "CASH" | "STORE_CREDIT";
  returnType: "SELECTED_PRODUCTS" | "ENTIRE_INVOICE";
  status: "DRAFT" | "COMPLETED" | "CANCELLED";
  itemCount: number;
  items: any[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineQueuedInvoice {
  id: string; // Client UUID (offlineQueueId)
  shopId: string;
  organizationId: string;
  offlineInvoiceNumber: string; // Temporary OFF-2026-XXXX
  payload: any; // Full patientVisitSchema compatible payload
  syncStatus: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  syncError?: string | null;
  serverInvoiceId?: string | null;
  serverInvoiceNumber?: string | null;
  createdAt: string; // ISO string
  syncedAt?: string | null;
  retryCount: number;
}

export interface OfflineQueuedMutation {
  id: string; // Client UUID
  shopId: string;
  type:
    | "PATIENT_CREATE"
    | "PATIENT_UPDATE"
    | "APPOINTMENT_CREATE"
    | "APPOINTMENT_STATUS"
    | "ORDER_STATUS_UPDATE"
    | "ORDER_PAYMENT_RECORD"
    | "ORDER_SETTLE_DUES"
    | "INVENTORY_CREATE"
    | "INVENTORY_UPDATE"
    | "STOCK_ADJUST"
    | "PRESCRIPTION_CREATE"
    | "RETURN_CREATE";
  payload: any;
  syncStatus: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  syncError?: string | null;
  serverResultId?: string | null;
  createdAt: string; // ISO string
  syncedAt?: string | null;
  retryCount: number;
}

export interface SyncMetadata {
  key: string; // e.g. "last_cache_warm_{shopId}", "offline_counter_{shopId}", "current_shop_id"
  value: string;
  updatedAt: string;
}

export class OpticalManagerOfflineDB extends Dexie {
  cached_customers!: Table<CachedCustomer, string>;
  cached_inventory!: Table<CachedInventory, string>;
  cached_appointments!: Table<CachedAppointment, string>;
  cached_orders!: Table<CachedOrder, string>;
  cached_invoices!: Table<CachedInvoice, string>;
  cached_returns!: Table<CachedReturn, string>;
  cached_shop_profile!: Table<CachedShopProfile, string>;
  cached_organization!: Table<CachedOrganization, string>;
  offline_invoices_queue!: Table<OfflineQueuedInvoice, string>;
  offline_mutations_queue!: Table<OfflineQueuedMutation, string>;
  sync_metadata!: Table<SyncMetadata, string>;

  constructor() {
    super("OpticalManagerDB");

    this.version(1).stores({
      cached_customers: "id, shopId, phone, fullName, registrationId, updatedAt",
      cached_inventory: "id, shopId, name, sku, brand, category, isActive, updatedAt",
      offline_invoices_queue: "id, shopId, offlineInvoiceNumber, syncStatus, createdAt",
      sync_metadata: "key, updatedAt",
    });

    this.version(2).stores({
      cached_customers: "id, shopId, phone, fullName, registrationId, updatedAt",
      cached_inventory: "id, shopId, name, sku, brand, category, isActive, updatedAt",
      cached_appointments: "id, shopId, appointmentDate, status, updatedAt",
      cached_orders: "id, shopId, invoiceNumber, status, paymentStatus, createdAt",
      cached_shop_profile: "id, organizationId, updatedAt",
      cached_organization: "id, updatedAt",
      offline_invoices_queue: "id, shopId, offlineInvoiceNumber, syncStatus, createdAt",
      sync_metadata: "key, updatedAt",
    });

    this.version(3).stores({
      cached_customers: "id, shopId, phone, fullName, registrationId, updatedAt",
      cached_inventory: "id, shopId, name, sku, brand, category, isActive, updatedAt",
      cached_appointments: "id, shopId, appointmentDate, status, updatedAt",
      cached_orders: "id, shopId, invoiceNumber, status, paymentStatus, createdAt",
      cached_shop_profile: "id, organizationId, updatedAt",
      cached_organization: "id, updatedAt",
      offline_invoices_queue: "id, shopId, offlineInvoiceNumber, syncStatus, createdAt",
      offline_mutations_queue: "id, shopId, type, syncStatus, createdAt",
      sync_metadata: "key, updatedAt",
    });

    this.version(4).stores({
      cached_customers: "id, shopId, phone, fullName, registrationId, updatedAt",
      cached_inventory: "id, shopId, name, sku, brand, category, isActive, updatedAt",
      cached_appointments: "id, shopId, appointmentDate, status, updatedAt",
      cached_orders: "id, shopId, invoiceNumber, status, paymentStatus, createdAt",
      cached_invoices: "id, shopId, invoiceNumber, customerId, status, createdAt",
      cached_returns: "id, shopId, returnNumber, invoiceNumber, status, createdAt",
      cached_shop_profile: "id, organizationId, updatedAt",
      cached_organization: "id, updatedAt",
      offline_invoices_queue: "id, shopId, offlineInvoiceNumber, syncStatus, createdAt",
      offline_mutations_queue: "id, shopId, type, syncStatus, createdAt",
      sync_metadata: "key, updatedAt",
    });

    this.version(5).stores({
      cached_customers: "id, shopId, organizationId, phone, fullName, registrationId, updatedAt",
      cached_inventory: "id, shopId, organizationId, name, sku, brand, category, isActive, updatedAt",
      cached_appointments: "id, shopId, organizationId, appointmentDate, status, updatedAt",
      cached_orders: "id, shopId, organizationId, invoiceNumber, status, paymentStatus, createdAt",
      cached_invoices: "id, shopId, organizationId, invoiceNumber, customerId, status, createdAt",
      cached_returns: "id, shopId, organizationId, returnNumber, invoiceNumber, status, createdAt",
      cached_shop_profile: "id, organizationId, updatedAt",
      cached_organization: "id, updatedAt",
      offline_invoices_queue: "id, shopId, offlineInvoiceNumber, syncStatus, createdAt",
      offline_mutations_queue: "id, shopId, type, syncStatus, createdAt",
      sync_metadata: "key, updatedAt",
    });
  }

  /**
   * Retrieves the authenticated user profile cached locally in IndexedDB.
   */
  async getUserSessionOffline(): Promise<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    shopId: string | null;
    organizationId: string;
    shopName?: string;
  } | null> {
    try {
      const rec = await this.sync_metadata.get("cached_user_session");
      if (rec?.value) {
        return JSON.parse(rec.value);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Enforces strict multi-tenant / user data isolation.
   * If a different shop is detected, purges previous shop's cached data.
   * For OWNER accounts with multi-branch management, cross-shop data is preserved.
   */
  async ensureShopDataIsolation(currentShopId: string): Promise<void> {
    if (!currentShopId) return;

    try {
      const userSession = await this.getUserSessionOffline();
      // If user is OWNER, preserve all branches' data without purging
      if (userSession?.role === "OWNER") {
        await this.sync_metadata.put({
          key: "active_shop_id",
          value: currentShopId,
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const storedShopRecord = await this.sync_metadata.get("active_shop_id");
      const previousShopId = storedShopRecord?.value;

      if (previousShopId && previousShopId !== currentShopId) {
        console.warn(`[OfflineDB] Shop change detected (${previousShopId} -> ${currentShopId}). Purging stale shop data.`);
        await this.cached_customers.where("shopId").notEqual(currentShopId).delete();
        await this.cached_inventory.where("shopId").notEqual(currentShopId).delete();
        await this.cached_appointments.where("shopId").notEqual(currentShopId).delete();
        await this.cached_orders.where("shopId").notEqual(currentShopId).delete();
        await this.cached_invoices.where("shopId").notEqual(currentShopId).delete();
        await this.cached_returns.where("shopId").notEqual(currentShopId).delete();
        await this.cached_shop_profile.where("id").notEqual(currentShopId).delete();
      }

      await this.sync_metadata.put({
        key: "active_shop_id",
        value: currentShopId,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[OfflineDB] Error ensuring shop isolation:", err);
    }
  }

  /**
   * Persists the authenticated user profile and active shop context for zero-latency offline access.
   */
  async saveUserSession(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    shopId: string | null;
    organizationId: string;
    shopName?: string;
  }): Promise<void> {
    try {
      await this.sync_metadata.put({
        key: "cached_user_session",
        value: JSON.stringify(user),
        updatedAt: new Date().toISOString(),
      });
      if (user.shopId) {
        await this.sync_metadata.put({
          key: "active_shop_id",
          value: user.shopId,
          updatedAt: new Date().toISOString(),
        });
      }
      if (user.shopName) {
        await this.sync_metadata.put({
          key: "active_shop_name",
          value: user.shopName,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[OfflineDB] Error saving user session:", err);
    }
  }

  /**
   * Atomically bulk saves all user-related, shop, customer, inventory, appointment, and order records.
   */
  async bulkSaveAllShopData(params: {
    shopId: string;
    shop?: CachedShopProfile | null;
    organization?: CachedOrganization | null;
    customers?: CachedCustomer[];
    inventory?: CachedInventory[];
    appointments?: CachedAppointment[];
    orders?: CachedOrder[];
    invoices?: CachedInvoice[];
    returns?: CachedReturn[];
    isIncremental?: boolean;
  }): Promise<void> {
    const {
      shopId,
      shop,
      organization,
      customers,
      inventory,
      appointments,
      orders,
      invoices,
      returns,
      isIncremental = false,
    } = params;
    if (!shopId) return;

    await this.ensureShopDataIsolation(shopId);

    // Write tables sequentially without holding an exclusive lock so UI remains responsive
    if (shop) {
      await this.cached_shop_profile.put(shop);
    }
    if (organization) {
      await this.cached_organization.put(organization);
      if (Array.isArray(organization.shops)) {
        for (const s of organization.shops) {
          await this.cached_shop_profile.put({
            id: s.id,
            organizationId: s.organizationId || organization.id,
            name: s.name,
            address: s.address,
            phone: s.phone,
            email: s.email,
            gstNumber: s.gstin || null,
            receiptHeader: null,
            receiptFooter: null,
            invoiceTerms: s.settings?.invoiceTermsNotes || null,
            settings: s.settings || null,
            whatsappTemplates: s.settings?.whatsappTemplates || null,
            updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
          });
        }
      }
    }

    const userSession = await this.getUserSessionOffline();
    const isOwner = userSession?.role === "OWNER";
    const orgId = organization?.id || userSession?.organizationId;

    if (customers && customers.length > 0) {
      if (!isIncremental) {
        if (isOwner && orgId) {
          await this.cached_customers.where("organizationId").equals(orgId).delete().catch(() => {});
        } else {
          await this.cached_customers.where("shopId").equals(shopId).delete();
        }
      }
      await this.cached_customers.bulkPut(customers);
      await new Promise((r) => setTimeout(r, 0));
    }

    if (inventory && inventory.length > 0) {
      if (!isIncremental) {
        if (isOwner && orgId) {
          await this.cached_inventory.where("organizationId").equals(orgId).delete().catch(() => {});
        } else {
          await this.cached_inventory.where("shopId").equals(shopId).delete();
        }
      }
      await this.cached_inventory.bulkPut(inventory);
      await new Promise((r) => setTimeout(r, 0));
    }

    if (appointments && appointments.length > 0) {
      if (!isIncremental) {
        if (isOwner && orgId) {
          await this.cached_appointments.where("organizationId").equals(orgId).delete().catch(() => {});
        } else {
          await this.cached_appointments.where("shopId").equals(shopId).delete();
        }
      }
      await this.cached_appointments.bulkPut(appointments);
      await new Promise((r) => setTimeout(r, 0));
    }

    if (orders && orders.length > 0) {
      if (!isIncremental) {
        if (isOwner && orgId) {
          await this.cached_orders.where("organizationId").equals(orgId).delete().catch(() => {});
        } else {
          await this.cached_orders.where("shopId").equals(shopId).delete();
        }
      }
      await this.cached_orders.bulkPut(orders);
      await new Promise((r) => setTimeout(r, 0));
    }

    if (invoices && invoices.length > 0) {
      if (!isIncremental) {
        if (isOwner && orgId) {
          await this.cached_invoices.where("organizationId").equals(orgId).delete().catch(() => {});
        } else {
          await this.cached_invoices.where("shopId").equals(shopId).delete();
        }
      }
      await this.cached_invoices.bulkPut(invoices);
      await new Promise((r) => setTimeout(r, 0));
    }

    if (returns && returns.length > 0) {
      if (!isIncremental) {
        if (isOwner && orgId) {
          await this.cached_returns.where("organizationId").equals(orgId).delete().catch(() => {});
        } else {
          await this.cached_returns.where("shopId").equals(shopId).delete();
        }
      }
      await this.cached_returns.bulkPut(returns);
      await new Promise((r) => setTimeout(r, 0));
    }

    await this.sync_metadata.put({
      key: isIncremental ? `last_incremental_sync_${shopId}` : `last_full_sync_${shopId}`,
      value: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async getShopProfileOffline(shopId: string): Promise<CachedShopProfile | null> {
    try {
      const profile = await this.cached_shop_profile.get(shopId);
      return profile || null;
    } catch {
      return null;
    }
  }

  async getAppointmentsOffline(shopId: string): Promise<CachedAppointment[]> {
    try {
      return await this.cached_appointments.where("shopId").equals(shopId).toArray();
    } catch {
      return [];
    }
  }

  async getOrdersOffline(shopId: string): Promise<CachedOrder[]> {
    try {
      return await this.cached_orders.where("shopId").equals(shopId).reverse().sortBy("createdAt");
    } catch {
      return [];
    }
  }

  async getCurrentShopId(): Promise<string | null> {
    try {
      const rec = await this.sync_metadata.get("active_shop_id");
      if (rec?.value) return rec.value;
      if (typeof window !== "undefined") {
        return localStorage.getItem("om_active_shop_id") || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getCurrentOrgId(): Promise<string | null> {
    try {
      const rec = await this.sync_metadata.get("cached_user_session");
      if (rec?.value) {
        const parsed = JSON.parse(rec.value);
        if (parsed.organizationId) return parsed.organizationId;
      }
      const org = await this.cached_organization.toCollection().first();
      return org?.id || null;
    } catch {
      return null;
    }
  }
}

export const offlineDB = new OpticalManagerOfflineDB();
