import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth.service";
import { db } from "@/lib/drizzle";
import {
  shops,
  organizations,
  customers,
  inventory,
  appointments,
  invoices,
  orders,
  salesReturns,
  appointmentConfigs,
  subscriptions,
} from "@/db/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional incremental sync ?since= ISO timestamp
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");
    let sinceDate: Date | null = null;
    if (sinceParam) {
      const parsed = new Date(sinceParam);
      if (!isNaN(parsed.getTime())) {
        sinceDate = parsed;
      }
    }

    const organizationId = user.organizationId;
    const isOwner = user.role === "OWNER";

    // Check active shop context (for owner or shop manager)
    let activeShopId = user.shopId;
    if (isOwner) {
      const cookieStore = await cookies();
      const contextShopId = cookieStore.get("active_shop_context_id")?.value;
      if (contextShopId) {
        activeShopId = contextShopId;
      }
    }

    // If activeShopId is still null (e.g. Owner without branch cookie), select first shop in organization
    if (!activeShopId && organizationId) {
      const [firstShop] = await db
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.organizationId, organizationId))
        .limit(1);

      if (firstShop) {
        activeShopId = firstShop.id;
      }
    }

    if (!activeShopId && !isOwner) {
      return NextResponse.json(
        { error: "No active shop outlet associated with your account." },
        { status: 400 }
      );
    }
    if (!activeShopId && isOwner) {
      activeShopId = "owner-all-shops";
    }

    // Filter conditions:
    // When role is OWNER, cache all organization data across all branches!
    // When role is SHOP_MANAGER, scope strictly to the active shop branch.
    const customerWhere = isOwner
      ? [eq(customers.organizationId, organizationId)]
      : [
          eq(customers.shopId, activeShopId!),
          eq(customers.organizationId, organizationId),
        ];
    if (sinceDate) {
      customerWhere.push(gt(customers.updatedAt, sinceDate));
    }

    const inventoryWhere = isOwner
      ? [eq(inventory.organizationId, organizationId)]
      : [eq(inventory.shopId, activeShopId!)];
    if (sinceDate) {
      inventoryWhere.push(gt(inventory.updatedAt, sinceDate));
    }

    const appointmentWhere = isOwner
      ? [eq(appointments.organizationId, organizationId)]
      : [eq(appointments.shopId, activeShopId!)];
    if (sinceDate) {
      appointmentWhere.push(gt(appointments.updatedAt, sinceDate));
    }

    const orderWhere = isOwner
      ? [eq(orders.organizationId, organizationId)]
      : [eq(orders.shopId, activeShopId!)];
    if (sinceDate) {
      orderWhere.push(gt(orders.updatedAt, sinceDate));
    }

    const invoiceWhere = isOwner
      ? [eq(invoices.organizationId, organizationId)]
      : [
          eq(invoices.shopId, activeShopId!),
          eq(invoices.organizationId, organizationId),
        ];
    if (sinceDate) {
      invoiceWhere.push(gt(invoices.updatedAt, sinceDate));
    }

    const returnWhere = isOwner
      ? [eq(salesReturns.organizationId, organizationId)]
      : [
          eq(salesReturns.shopId, activeShopId!),
          eq(salesReturns.organizationId, organizationId),
        ];
    if (sinceDate) {
      returnWhere.push(gt(salesReturns.updatedAt, sinceDate));
    }

    // Execute queries in parallel for zero-latency execution
    const [
      shopRecord,
      orgRecord,
      orgShopsList,
      appointmentConfigRecord,
      subscriptionRecord,
      customerList,
      inventoryList,
      appointmentList,
      orderList,
      recentInvoicesList,
      returnsList,
    ] = await Promise.all([
      activeShopId && activeShopId !== "owner-all-shops"
        ? db
            .select({
              id: shops.id,
              organizationId: shops.organizationId,
              name: shops.name,
              address: shops.address,
              phone: shops.phone,
              email: shops.email,
              gstin: shops.gstin,
              cin: shops.cin,
              msmeUdyam: shops.msmeUdyam,
              bankName: shops.bankName,
              bankBranch: shops.bankBranch,
              bankAccountNumber: shops.bankAccountNumber,
              bankIfsc: shops.bankIfsc,
              settings: shops.settings,
              isActive: shops.isActive,
              createdAt: shops.createdAt,
              updatedAt: shops.updatedAt,
            })
            .from(shops)
            .where(
              and(
                eq(shops.id, activeShopId),
                eq(shops.organizationId, organizationId)
              )
            )
            .limit(1)
            .then((res) => res[0] || null)
        : Promise.resolve(null),

      db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          email: organizations.email,
          phone: organizations.phone,
          address: organizations.address,
          logoUrl: organizations.logoUrl,
          onboardingCompleted: organizations.onboardingCompleted,
          updatedAt: organizations.updatedAt,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1)
        .then((res) => res[0] || null),

      isOwner
        ? db
            .select({
              id: shops.id,
              organizationId: shops.organizationId,
              name: shops.name,
              address: shops.address,
              phone: shops.phone,
              email: shops.email,
              gstin: shops.gstin,
              cin: shops.cin,
              msmeUdyam: shops.msmeUdyam,
              bankName: shops.bankName,
              bankBranch: shops.bankBranch,
              bankAccountNumber: shops.bankAccountNumber,
              bankIfsc: shops.bankIfsc,
              settings: shops.settings,
              isActive: shops.isActive,
              createdAt: shops.createdAt,
              updatedAt: shops.updatedAt,
            })
            .from(shops)
            .where(eq(shops.organizationId, organizationId))
            .orderBy(shops.createdAt)
        : Promise.resolve([]),

      db
        .select()
        .from(appointmentConfigs)
        .where(eq(appointmentConfigs.organizationId, organizationId))
        .limit(1)
        .then((res) => res[0] || null)
        .catch(() => null),

      db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .limit(1)
        .then((res) => res[0] || null)
        .catch(() => null),

      db
        .select({
          id: customers.id,
          shopId: customers.shopId,
          organizationId: customers.organizationId,
          registrationId: customers.registrationId,
          fullName: customers.fullName,
          email: customers.email,
          phone: customers.phone,
          dateOfBirth: customers.dateOfBirth,
          gender: customers.gender,
          bloodGroup: customers.bloodGroup,
          referredBy: customers.referredBy,
          address: customers.address,
          city: customers.city,
          state: customers.state,
          pincode: customers.pincode,
          storeCredit: customers.storeCredit,
          chiefComplaint: customers.chiefComplaint,
          familyHistory: customers.familyHistory,
          systemicIllness: customers.systemicIllness,
          allergies: customers.allergies,
          updatedAt: customers.updatedAt,
        })
        .from(customers)
        .where(and(...customerWhere))
        .orderBy(customers.fullName)
        .limit(isOwner ? 5000 : 1000),

      db
        .select({
          id: inventory.id,
          shopId: inventory.shopId,
          organizationId: inventory.organizationId,
          name: inventory.name,
          category: inventory.category,
          brand: inventory.brand,
          model: inventory.model,
          sku: inventory.sku,
          price: inventory.price,
          quantity: inventory.quantity,
          isActive: inventory.isActive,
          cgstPercent: inventory.cgstPercent,
          sgstPercent: inventory.sgstPercent,
          igstPercent: inventory.igstPercent,
          updatedAt: inventory.updatedAt,
        })
        .from(inventory)
        .where(and(...inventoryWhere))
        .orderBy(inventory.name)
        .limit(isOwner ? 5000 : 2000),

      db
        .select({
          id: appointments.id,
          shopId: appointments.shopId,
          organizationId: appointments.organizationId,
          customerName: appointments.customerName,
          customerPhone: appointments.customerPhone,
          visitTime: appointments.visitTime,
          purposeOfVisit: appointments.purposeOfVisit,
          additionalNotes: appointments.additionalNotes,
          status: appointments.status,
          updatedAt: appointments.updatedAt,
        })
        .from(appointments)
        .where(and(...appointmentWhere))
        .orderBy(desc(appointments.visitTime))
        .limit(isOwner ? 1000 : 200),

      db
        .select({
          id: orders.id,
          shopId: orders.shopId,
          organizationId: orders.organizationId,
          orderNumber: orders.orderNumber,
          invoiceId: orders.invoiceId,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          amountPaid: invoices.amountPaid,
          balanceDue: invoices.balanceDue,
          status: invoices.status,
          customerName: customers.fullName,
          customerPhone: customers.phone,
        })
        .from(orders)
        .innerJoin(invoices, eq(orders.invoiceId, invoices.id))
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(and(...orderWhere))
        .orderBy(desc(orders.createdAt))
        .limit(isOwner ? 500 : 100),

      db
        .select({
          id: invoices.id,
          shopId: invoices.shopId,
          organizationId: invoices.organizationId,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          subtotal: invoices.subtotal,
          discount: invoices.discount,
          tax: invoices.tax,
          total: invoices.total,
          amountPaid: invoices.amountPaid,
          balanceDue: invoices.balanceDue,
          paymentMethod: invoices.paymentMethod,
          status: invoices.status,
          fulfillmentStatus: invoices.fulfillmentStatus,
          estimatedDelivery: invoices.estimatedDelivery,
          notes: invoices.notes,
          customerName: customers.fullName,
          customerPhone: customers.phone,
          customerEmail: customers.email,
          createdAt: invoices.createdAt,
          updatedAt: invoices.updatedAt,
        })
        .from(invoices)
        .innerJoin(customers, eq(invoices.customerId, customers.id))
        .where(and(...invoiceWhere))
        .orderBy(desc(invoices.createdAt))
        .limit(isOwner ? 500 : 100),

      db
        .select({
          id: salesReturns.id,
          shopId: salesReturns.shopId,
          organizationId: salesReturns.organizationId,
          returnNumber: salesReturns.returnNumber,
          invoiceId: salesReturns.invoiceId,
          customerId: salesReturns.customerId,
          totalRefundAmount: salesReturns.totalRefundAmount,
          refundMethod: salesReturns.refundMethod,
          returnType: salesReturns.returnType,
          status: salesReturns.status,
          notes: salesReturns.notes,
          createdAt: salesReturns.createdAt,
          updatedAt: salesReturns.updatedAt,
          invoiceNumber: invoices.invoiceNumber,
          customerName: customers.fullName,
          customerPhone: customers.phone,
        })
        .from(salesReturns)
        .innerJoin(invoices, eq(salesReturns.invoiceId, invoices.id))
        .leftJoin(customers, eq(salesReturns.customerId, customers.id))
        .where(and(...returnWhere))
        .orderBy(desc(salesReturns.createdAt))
        .limit(isOwner ? 500 : 100),
    ]);

    // Format appointments for client consumption
    const formattedAppointments = appointmentList.map((app) => {
      const visitDate = new Date(app.visitTime);
      const dateStr = visitDate.toISOString().split("T")[0];
      const hours = String(visitDate.getHours()).padStart(2, "0");
      const mins = String(visitDate.getMinutes()).padStart(2, "0");
      return {
        id: app.id,
        shopId: app.shopId,
        organizationId: app.organizationId,
        customerId: null,
        patientName: app.customerName,
        patientPhone: app.customerPhone,
        doctorName: app.purposeOfVisit || "Optometrist",
        appointmentDate: dateStr,
        appointmentTime: `${hours}:${mins}`,
        status: app.status as any,
        type: app.purposeOfVisit,
        notes: app.additionalNotes,
        updatedAt: app.updatedAt ? new Date(app.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    // Format orders for client consumption
    const formattedOrders = orderList.map((ord) => ({
      id: ord.id,
      shopId: ord.shopId,
      organizationId: ord.organizationId,
      invoiceId: ord.invoiceId,
      invoiceNumber: ord.invoiceNumber || ord.orderNumber,
      customerId: null,
      customerName: ord.customerName || "Walk-in Patient",
      customerPhone: ord.customerPhone || null,
      totalAmount: String(ord.total || "0.00"),
      paidAmount: String(ord.amountPaid || "0.00"),
      dueAmount: String(ord.balanceDue || "0.00"),
      status: (ord.status === "PAID" ? "DELIVERED" : "PROCESSING") as any,
      paymentStatus: (parseFloat(String(ord.balanceDue || "0")) <= 0 ? "PAID" : "PARTIALLY_PAID") as any,
      itemsCount: 1,
      createdAt: ord.createdAt ? new Date(ord.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: ord.updatedAt ? new Date(ord.updatedAt).toISOString() : new Date().toISOString(),
    }));

    const formattedInvoices = recentInvoicesList.map((inv) => ({
      id: inv.id,
      shopId: inv.shopId,
      organizationId: inv.organizationId,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone || null,
      customerEmail: inv.customerEmail || null,
      subtotal: String(inv.subtotal || "0.00"),
      discount: String(inv.discount || "0.00"),
      tax: String(inv.tax || "0.00"),
      total: String(inv.total || "0.00"),
      amountPaid: String(inv.amountPaid || "0.00"),
      balanceDue: String(inv.balanceDue || "0.00"),
      paymentMethod: inv.paymentMethod || "CASH",
      status: inv.status,
      fulfillmentStatus: inv.fulfillmentStatus,
      estimatedDelivery: inv.estimatedDelivery || null,
      notes: inv.notes || null,
      items: [],
      createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : new Date().toISOString(),
    }));

    // Format returns for client consumption
    const formattedReturns = (returnsList || []).map((ret) => ({
      id: ret.id,
      shopId: ret.shopId,
      organizationId: ret.organizationId,
      returnNumber: ret.returnNumber,
      invoiceId: ret.invoiceId,
      invoiceNumber: ret.invoiceNumber || "",
      customerId: ret.customerId,
      customerName: ret.customerName || "Walk-in Patient",
      customerPhone: ret.customerPhone || null,
      totalRefundAmount: String(ret.totalRefundAmount || "0.00"),
      refundMethod: (ret.refundMethod || "CASH") as any,
      returnType: (ret.returnType || "SELECTED_PRODUCTS") as any,
      status: (ret.status || "COMPLETED") as any,
      itemCount: 1,
      items: [],
      notes: ret.notes || null,
      createdAt: ret.createdAt ? new Date(ret.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: ret.updatedAt ? new Date(ret.updatedAt).toISOString() : new Date().toISOString(),
    }));

    // If shopRecord is null but we have shops in orgShopsList, use first shop for default context
    const resolvedShopRecord =
      shopRecord ||
      (orgShopsList && orgShopsList.length > 0 ? orgShopsList[0] : null);

    const response = NextResponse.json({
      success: true,
      isIncremental: Boolean(sinceDate),
      shopId: activeShopId,
      organizationId: organizationId,
      shop: resolvedShopRecord
        ? {
            id: resolvedShopRecord.id,
            organizationId: resolvedShopRecord.organizationId,
            name: resolvedShopRecord.name,
            address: resolvedShopRecord.address,
            phone: resolvedShopRecord.phone,
            email: resolvedShopRecord.email,
            gstNumber: resolvedShopRecord.gstin || null,
            receiptHeader: null,
            receiptFooter: null,
            invoiceTerms: (resolvedShopRecord.settings as any)?.invoiceTermsNotes || null,
            settings: resolvedShopRecord.settings || null,
            whatsappTemplates: (resolvedShopRecord.settings as any)?.whatsappTemplates || null,
            updatedAt: resolvedShopRecord.updatedAt ? new Date(resolvedShopRecord.updatedAt).toISOString() : new Date().toISOString(),
          }
        : null,
      organization: orgRecord
        ? {
            id: orgRecord.id,
            name: orgRecord.name,
            slug: orgRecord.slug,
            email: orgRecord.email || null,
            phone: orgRecord.phone || null,
            address: orgRecord.address || null,
            logoUrl: orgRecord.logoUrl || null,
            currency: "INR",
            shops: orgShopsList || [],
            appointmentConfig: appointmentConfigRecord || null,
            subscription: subscriptionRecord || null,
            updatedAt: orgRecord.updatedAt ? new Date(orgRecord.updatedAt).toISOString() : new Date().toISOString(),
          }
        : null,
      customers: customerList.map((c) => ({
        ...c,
        dateOfBirth: c.dateOfBirth ? String(c.dateOfBirth) : null,
        storeCredit: c.storeCredit ? String(c.storeCredit) : "0.00",
        updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
      })),
      inventory: inventoryList.map((i) => ({
        ...i,
        price: i.price ? String(i.price) : "0.00",
        quantity: typeof i.quantity === "number" ? i.quantity : 0,
        isActive: Boolean(i.isActive),
        cgstPercent: i.cgstPercent ? String(i.cgstPercent) : "0.00",
        sgstPercent: i.sgstPercent ? String(i.sgstPercent) : "0.00",
        igstPercent: i.igstPercent ? String(i.igstPercent) : "0.00",
        updatedAt: i.updatedAt ? new Date(i.updatedAt).toISOString() : new Date().toISOString(),
      })),
      appointments: formattedAppointments,
      orders: formattedOrders,
      invoices: formattedInvoices,
      returns: formattedReturns,
      timestamp: new Date().toISOString(),
    });

    response.cookies.set(
      "opt_session_profile",
      JSON.stringify({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: organizationId,
        shopId: activeShopId === "owner-all-shops" ? null : activeShopId,
        isActive: user.isActive,
      }),
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      }
    );

    return response;
  } catch (error: any) {
    console.error("[API] Full offline databank sync error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export complete offline databank" },
      { status: 500 }
    );
  }
}
