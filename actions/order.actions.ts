"use server";

import { db } from "@/lib/drizzle";
import { invoices, customers, shops, orders, receipts, invoiceItems, inventory, stockMovements, orderEditHistory } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/services/auth.service";
import { sendShopEmail } from "@/services/email.service";
import { revalidatePath } from "next/cache";
import { generateReceiptNumber, generateOrderNumber } from "@/services/receipt.service";
import { canUserEditOrders } from "@/utils/permissions";

export type ActionResponse = {
  success: boolean;
  message: string;
};

/**
 * Server Action: Send payment reminder email
 */
export async function sendPaymentReminderAction(
  invoiceId: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized." };
    }

    // Load invoice and join customer/shop
    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        balanceDue: invoices.balanceDue,
        shopId: invoices.shopId,
        customerId: invoices.customerId,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, user.organizationId!)
        )
      )
      .limit(1);

    if (!invoice) {
      return { success: false, message: "Invoice not found or unauthorized." };
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, invoice.customerId))
      .limit(1);

    if (!customer?.email) {
      return {
        success: false,
        message: "This patient does not have a registered email address to receive reminders.",
      };
    }

    // Format currency helper
    const formattedTotal = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(parseFloat(invoice.total));

    const formattedBalance = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(parseFloat(invoice.balanceDue));

    // Construct a beautiful HTML message
    const htmlContent = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0a52c3; margin-bottom: 20px;">Payment Reminder</h2>
        <p>Dear <strong>${customer.fullName}</strong>,</p>
        <p>This is a friendly reminder that you have an outstanding balance due on your recent spectacles/eyewear purchase under Invoice <strong>${invoice.invoiceNumber}</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #64748b; font-size: 13px;">Total Invoice Amount:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">${formattedTotal}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #e11d48; font-size: 13px; font-weight: bold;">Outstanding Balance Due:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #e11d48;">${formattedBalance}</td>
            </tr>
          </table>
        </div>

        <p>Please visit our branch to clear your balance at your earliest convenience. Thank you for choosing us for your vision needs!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">This is an automated notification sent from the Optical Manager system on behalf of your shop.</p>
      </div>
    `;

    // Send email
    const emailResult = await sendShopEmail({
      shopId: invoice.shopId,
      organizationId: user.organizationId!,
      recipientEmail: customer.email,
      recipientName: customer.fullName,
      subject: `Payment Reminder: Balance due for Invoice ${invoice.invoiceNumber}`,
      htmlContent,
    });

    if (emailResult.success) {
      return {
        success: true,
        message: `Reminder email dispatched successfully to ${customer.fullName} (${customer.email}).`,
      };
    } else {
      return {
        success: false,
        message: emailResult.error || "Failed to dispatch email pipeline.",
      };
    }
  } catch (error: any) {
    console.error("Error sending payment reminder action:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred during execution.",
    };
  }
}

/**
 * Server Action: Update the estimated delivery days timeline
 */
export async function updateDeliveryDaysAction(
  invoiceId: string,
  days: number
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized." };
    }

    const [invoice] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, user.organizationId!)
        )
      )
      .limit(1);

    if (!invoice) {
      return { success: false, message: "Invoice not found or unauthorized." };
    }

    // Calculate new estimated date
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const estimatedDelivery = targetDate.toISOString().split("T")[0];
    const fulfillmentStatus = days === 0 ? "DELIVERED" : "PROCESSING";

    // Update invoice record
    await db
      .update(invoices)
      .set({
        estimatedDelivery,
        fulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    revalidatePath("/shop/orders");
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/analytics");

    return {
      success: true,
      message: `Expected delivery timeline extended by ${days} days (Fulfillment status: ${fulfillmentStatus}).`,
    };
  } catch (error: any) {
    console.error("Error updating delivery days action:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred during execution.",
    };
  }
}

/**
 * Server Action: Update Order status and delivery details (Quick Action)
 */
export async function updateOrderStatusAction(
  invoiceId: string,
  data: {
    fulfillmentStatus: "PROCESSING" | "READY" | "DELIVERED" | "ON_HOLD";
    estimatedDelivery: string | null;
  }
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized." };
    }

    const [invoice] = await db
      .select({
        id: invoices.id,
        fulfillmentStatus: invoices.fulfillmentStatus,
        estimatedDelivery: invoices.estimatedDelivery,
        isRescheduled: invoices.isRescheduled,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, user.organizationId!)
        )
      )
      .limit(1);

    if (!invoice) {
      return { success: false, message: "Invoice not found or unauthorized." };
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const isCurrentlyDelayed =
      invoice.fulfillmentStatus !== "DELIVERED" &&
      invoice.estimatedDelivery &&
      invoice.estimatedDelivery < todayStr;

    let nextFulfillmentStatus = data.fulfillmentStatus;
    let nextEstimatedDelivery = data.estimatedDelivery;
    let nextIsRescheduled = invoice.isRescheduled;

    // Check if status changed from Delayed to In Processing or if a new delivery date is selected
    const statusChangedToProcessing =
      isCurrentlyDelayed &&
      data.fulfillmentStatus === "PROCESSING" &&
      invoice.fulfillmentStatus !== "PROCESSING";
    const newDeliveryDateSelected =
      data.estimatedDelivery && data.estimatedDelivery !== invoice.estimatedDelivery;

    if (isCurrentlyDelayed && (statusChangedToProcessing || newDeliveryDateSelected)) {
      nextIsRescheduled = true;
      nextFulfillmentStatus = "PROCESSING";
    }

    await db
      .update(invoices)
      .set({
        fulfillmentStatus: nextFulfillmentStatus,
        estimatedDelivery: nextEstimatedDelivery,
        isRescheduled: nextIsRescheduled,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    revalidatePath("/shop/orders");
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/analytics");

    return {
      success: true,
      message: "Order details updated successfully.",
    };
  } catch (error: any) {
    console.error("Error updating order status action:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred during execution.",
    };
  }
}

/**
 * Server Action: Generate a full payment receipt & complete invoice
 */
export async function generateFullPaymentInvoiceAction(
  invoiceId: string,
  data: {
    paymentMethod?: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";
    transactionId?: string;
  }
): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized." };
    }

    // Load invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, user.organizationId!)
        )
      )
      .limit(1);

    if (!invoice) {
      return { success: false, message: "Invoice not found or unauthorized." };
    }

    const remainingBalance = parseFloat(invoice.balanceDue);
    if (remainingBalance <= 0) {
      return { success: false, message: "Invoice is already fully paid." };
    }

    const payMethod = data.paymentMethod || invoice.paymentMethod || "CASH";

    // Run transaction
    const newReceiptId = await db.transaction(async (tx) => {
      // 1. Update invoice
      await tx
        .update(invoices)
        .set({
          status: "PAID",
          amountPaid: invoice.total,
          balanceDue: "0.00",
          paymentMethod: payMethod,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

      // 2. Generate Receipt
      const receiptNumber = await generateReceiptNumber(invoice.shopId, tx);
      const [receipt] = await tx
        .insert(receipts)
        .values({
          shopId: invoice.shopId,
          organizationId: user.organizationId!,
          invoiceId: invoice.id,
          receiptNumber,
          amountPaid: remainingBalance.toFixed(2),
          balanceDue: "0.00",
          paymentMethod: payMethod,
          transactionId: data.transactionId || null,
        })
        .returning();

      // 3. Update associated Order
      await tx
        .update(orders)
        .set({
          receiptId: receipt.id,
          updatedAt: new Date(),
        })
        .where(eq(orders.invoiceId, invoiceId));

      return receipt.id;
    });

    revalidatePath("/shop/orders");
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/analytics");
    revalidatePath(`/shop/invoices/${invoiceId}`);

    return {
      success: true,
      message: "Invoice fully paid. Redirecting to invoice detail.",
      redirectUrl: `/shop/invoices/${invoiceId}`,
    };
  } catch (error: any) {
    console.error("Error generating full payment invoice action:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred during execution.",
    };
  }
}

/**
 * Server Action: Send rescheduled delivery email notification
 */
export async function sendRescheduledDeliveryEmailAction(
  invoiceId: string,
  newDate: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized." };
    }

    // Load invoice, join customer, order, and shop
    const [info] = await db
      .select({
        invoiceId: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        shopId: invoices.shopId,
        customerName: customers.fullName,
        customerEmail: customers.email,
        orderNumber: orders.orderNumber,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(orders, eq(orders.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, user.organizationId!)
        )
      )
      .limit(1);

    if (!info) {
      return { success: false, message: "Order not found or unauthorized." };
    }

    if (!info.customerEmail) {
      return {
        success: false,
        message: "No registered email found for this patient.",
      };
    }

    const formattedDate = new Date(newDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Construct a beautiful HTML message
    const htmlContent = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #0a52c3; margin-bottom: 20px;">Your Eyewear Order Update</h2>
        <p>Dear <strong>${info.customerName}</strong>,</p>
        <p>We are writing to provide you with an update regarding your eyewear order <strong>#${info.orderNumber || info.invoiceNumber}</strong>.</p>
        <p>Your estimated delivery date has been rescheduled. We are working diligently to prepare your order, and it is now expected to arrive on:</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #0a52c3;">
          <span style="font-size: 16px; font-weight: bold; color: #0a52c3;">${formattedDate}</span>
        </div>

        <p>Once your eyewear is ready and has passed our quality check, we will notify you immediately for pickup or delivery.</p>
        <p>If you have any questions or require further assistance, please feel free to reply to this email or contact our shop directly.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">This is an automated notification sent from the Optical Manager system on behalf of your shop.</p>
      </div>
    `;

    const emailResult = await sendShopEmail({
      shopId: info.shopId,
      organizationId: user.organizationId!,
      recipientEmail: info.customerEmail,
      recipientName: info.customerName,
      subject: `Rescheduled Delivery: Order #${info.orderNumber || info.invoiceNumber}`,
      htmlContent,
    });

    if (emailResult.success) {
      return {
        success: true,
        message: `Notification email sent successfully to ${info.customerName}.`,
      };
    } else {
      return {
        success: false,
        message: emailResult.error || "Failed to send notification email.",
      };
    }
  } catch (error: any) {
    console.error("Error sending rescheduled delivery email action:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred.",
    };
  }
}

/**
 * Server Action: Record an additional partial payment for an order and generate a receipt
 */
export async function recordPartialPaymentAction(
  invoiceId: string,
  data: {
    amountPaid: number;
    paymentMethod?: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";
    transactionId?: string;
  }
): Promise<{ success: boolean; message: string; receiptId?: string; redirectUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized." };
    }

    if (!data.amountPaid || data.amountPaid <= 0) {
      return { success: false, message: "Please enter a valid partial payment amount." };
    }

    // Load invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, user.organizationId!)
        )
      )
      .limit(1);

    if (!invoice) {
      return { success: false, message: "Invoice not found or unauthorized." };
    }

    const currentBalance = parseFloat(invoice.balanceDue);
    if (currentBalance <= 0) {
      return { success: false, message: "This invoice has zero pending balance." };
    }

    if (data.amountPaid > currentBalance + 0.01) {
      return {
        success: false,
        message: `Payment amount (₹${data.amountPaid}) cannot exceed remaining balance due (₹${currentBalance.toFixed(2)}).`,
      };
    }

    const payMethod = data.paymentMethod || invoice.paymentMethod || "CASH";
    const currentPaid = parseFloat(invoice.amountPaid || "0");
    const newAmountPaid = currentPaid + data.amountPaid;
    const newBalanceDue = Math.max(0, currentBalance - data.amountPaid);
    const newStatus = newBalanceDue <= 0 ? "PAID" : "PENDING";

    const newReceiptId = await db.transaction(async (tx) => {
      // 1. Update invoice
      await tx
        .update(invoices)
        .set({
          status: newStatus as any,
          amountPaid: newAmountPaid.toFixed(2),
          balanceDue: newBalanceDue.toFixed(2),
          paymentMethod: payMethod,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

      // 2. Generate Receipt
      const receiptNumber = await generateReceiptNumber(invoice.shopId, tx);
      const [receipt] = await tx
        .insert(receipts)
        .values({
          shopId: invoice.shopId,
          organizationId: user.organizationId!,
          invoiceId: invoice.id,
          receiptNumber,
          amountPaid: data.amountPaid.toFixed(2),
          balanceDue: newBalanceDue.toFixed(2),
          paymentMethod: payMethod,
          transactionId: data.transactionId || null,
        })
        .returning();

      // 3. Link receipt to Order
      await tx
        .update(orders)
        .set({
          receiptId: receipt.id,
          updatedAt: new Date(),
        })
        .where(eq(orders.invoiceId, invoiceId));

      return receipt.id;
    });

    revalidatePath("/shop/orders");
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/analytics");
    revalidatePath(`/shop/invoices/${invoiceId}`);
    revalidatePath(`/shop/receipts/${newReceiptId}`);

    return {
      success: true,
      message: `Partial payment of ₹${data.amountPaid.toFixed(2)} recorded successfully. Receipt generated.`,
      receiptId: newReceiptId,
      redirectUrl: `/shop/receipts/${newReceiptId}`,
    };
  } catch (error: any) {
    console.error("Error recording partial payment action:", error);
    return {
      success: false,
      message: error.message || "Failed to record partial payment.",
    };
  }
}

/**
 * Server Action: Settle remaining order dues with a discount/waiver and mark invoice fully paid
 */
export async function settleDuesWithDiscountAction(
  invoiceId: string,
  data: {
    amountReceived: number;
    discountAmount: number;
    paymentMethod?: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";
    transactionId?: string;
  }
): Promise<{ success: boolean; message: string; receiptId?: string; redirectUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Unauthorized." };
    }

    // Load invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, user.organizationId!)
        )
      )
      .limit(1);

    if (!invoice) {
      return { success: false, message: "Invoice not found or unauthorized." };
    }

    const currentBalance = parseFloat(invoice.balanceDue);
    if (currentBalance <= 0) {
      return { success: false, message: "This invoice is already fully settled." };
    }

    const amountRec = Math.max(0, data.amountReceived || 0);
    const discAmt = Math.max(0, data.discountAmount || 0);

    const totalSettlement = amountRec + discAmt;
    if (Math.abs(totalSettlement - currentBalance) > 0.05) {
      return {
        success: false,
        message: `Settlement total (₹${amountRec.toFixed(2)} paid + ₹${discAmt.toFixed(2)} discount = ₹${totalSettlement.toFixed(2)}) must equal current balance due (₹${currentBalance.toFixed(2)}).`,
      };
    }

    const payMethod = data.paymentMethod || invoice.paymentMethod || "CASH";
    const currentPaid = parseFloat(invoice.amountPaid || "0");
    const currentDiscount = parseFloat(invoice.discount || "0");
    const currentTotal = parseFloat(invoice.total || "0");

    const newDiscount = currentDiscount + discAmt;
    const newTotal = Math.max(0, currentTotal - discAmt);
    const newAmountPaid = currentPaid + amountRec;

    const newReceiptId = await db.transaction(async (tx) => {
      // 1. Update invoice
      await tx
        .update(invoices)
        .set({
          status: "PAID",
          discount: newDiscount.toFixed(2),
          total: newTotal.toFixed(2),
          amountPaid: newAmountPaid.toFixed(2),
          balanceDue: "0.00",
          paymentMethod: payMethod,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

      // 2. Generate Receipt for amount received (if any received)
      const receiptNumber = await generateReceiptNumber(invoice.shopId, tx);
      const [receipt] = await tx
        .insert(receipts)
        .values({
          shopId: invoice.shopId,
          organizationId: user.organizationId!,
          invoiceId: invoice.id,
          receiptNumber,
          amountPaid: amountRec.toFixed(2),
          balanceDue: "0.00",
          paymentMethod: payMethod,
          transactionId: data.transactionId || null,
        })
        .returning();

      // 3. Link receipt to Order
      await tx
        .update(orders)
        .set({
          receiptId: receipt.id,
          updatedAt: new Date(),
        })
        .where(eq(orders.invoiceId, invoiceId));

      return receipt.id;
    });

    revalidatePath("/shop/orders");
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/analytics");
    revalidatePath(`/shop/invoices/${invoiceId}`);

    return {
      success: true,
      message: `Invoice settled successfully! ₹${amountRec.toFixed(2)} received and ₹${discAmt.toFixed(2)} discount applied.`,
      receiptId: newReceiptId,
      redirectUrl: `/shop/invoices/${invoiceId}`,
    };
  } catch (error: any) {
    console.error("Error settling dues with discount action:", error);
    return {
      success: false,
      message: error.message || "Failed to settle dues with discount.",
    };
  }
}

export interface UpdateOrderPayload {
  orderId: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  soldBy?: string | null;
  createdAt?: string | null;
  deliveryDays?: number;
  estimatedDelivery?: string | null;
  fulfillmentStatus?: "PROCESSING" | "READY" | "DELIVERED" | "ON_HOLD";
  notes?: string | null;
  specialInstructions?: string | null;
  items: {
    inventoryId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    cgstPercent?: number;
    cgstAmount?: number;
    sgstPercent?: number;
    sgstAmount?: number;
    igstPercent?: number;
    igstAmount?: number;
  }[];
  paymentType: "FULL" | "PARTIAL";
  paymentMethod: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";
  amountPaid: number;
  balanceDue: number;
}

/**
 * Server Action to completely update an existing order, including customer info,
 * product line items, prices, discounts, GST rates, payment settlement, inventory
 * re-balancing, replacing old receipts, and writing an audit record to order_edit_history.
 */
export async function updateFullOrderAction(
  payload: UpdateOrderPayload
): Promise<{ success: boolean; message: string; orderId?: string; invoiceId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized. Please log in again." };
    }

    // Permission Enforcement
    if (!canUserEditOrders(user)) {
      return {
        success: false,
        message: "Permission denied. You do not have permission to edit orders.",
      };
    }

    if (!payload.orderId) {
      return { success: false, message: "Order ID is required." };
    }

    if (!payload.customer.fullName?.trim() || !payload.customer.phone?.trim()) {
      return { success: false, message: "Customer full name and mobile number are required." };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: "At least one product item is required in the order." };
    }

    // Fetch existing order, invoice, customer, and line items (checking either orders.id, orders.invoiceId, or invoices.id)
    let [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          or(
            eq(orders.id, payload.orderId),
            eq(orders.invoiceId, payload.orderId)
          ),
          eq(orders.organizationId, user.organizationId)
        )
      )
      .limit(1);

    let existingInvoice = null;

    if (order) {
      const [inv] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, order.invoiceId))
        .limit(1);
      existingInvoice = inv;
    } else {
      const [inv] = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, payload.orderId),
            eq(invoices.organizationId, user.organizationId)
          )
        )
        .limit(1);
      existingInvoice = inv;
    }

    if (!existingInvoice) {
      return { success: false, message: "Order or associated invoice not found or access denied." };
    }

    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, existingInvoice.customerId))
      .limit(1);

    const existingItems = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, existingInvoice.id));

    // Calculate New Financial Totals
    const subtotalVal = payload.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const totalDiscount = payload.items.reduce(
      (sum, item) => sum + (item.discountAmount || 0),
      0
    );
    const totalTax = payload.items.reduce(
      (sum, item) =>
        sum + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0),
      0
    );
    const grandTotal = Math.max(0, subtotalVal - totalDiscount + totalTax);

    const discountPercent =
      subtotalVal > 0 ? (totalDiscount / subtotalVal) * 100 : 0;
    const taxableSubtotal = Math.max(0, subtotalVal - totalDiscount);
    const taxPercent =
      taxableSubtotal > 0 ? (totalTax / taxableSubtotal) * 100 : 0;

    let finalAmountPaid = 0;
    let finalBalanceDue = 0;
    let finalInvoiceStatus: "PAID" | "PENDING" = "PENDING";

    if (payload.paymentType === "FULL") {
      finalAmountPaid = grandTotal;
      finalBalanceDue = 0;
      finalInvoiceStatus = "PAID";
    } else {
      finalAmountPaid = Math.max(0, payload.amountPaid || 0);
      finalBalanceDue = Math.max(0, grandTotal - finalAmountPaid);
      finalInvoiceStatus = finalBalanceDue <= 0 ? "PAID" : "PENDING";
    }

    // Determine estimated delivery date
    let estimatedDeliveryDate: Date | null = null;
    const baseDate = payload.createdAt ? new Date(payload.createdAt) : new Date(existingInvoice.createdAt);

    if (payload.estimatedDelivery) {
      estimatedDeliveryDate = new Date(payload.estimatedDelivery);
    } else if (payload.deliveryDays !== undefined) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + (payload.deliveryDays || 0));
      estimatedDeliveryDate = d;
    }

    // Run within atomic database transaction
    await db.transaction(async (tx) => {
      // 1. Inventory Stock Re-balancing
      const oldStockMap = new Map<string, number>();
      for (const item of existingItems) {
        if (item.inventoryId) {
          oldStockMap.set(
            item.inventoryId,
            (oldStockMap.get(item.inventoryId) || 0) + item.quantity
          );
        }
      }

      const newStockMap = new Map<string, number>();
      for (const item of payload.items) {
        if (item.inventoryId) {
          newStockMap.set(
            item.inventoryId,
            (newStockMap.get(item.inventoryId) || 0) + item.quantity
          );
        }
      }

      const allInventoryIds = new Set([
        ...oldStockMap.keys(),
        ...newStockMap.keys(),
      ]);

      for (const invId of allInventoryIds) {
        const oldQty = oldStockMap.get(invId) || 0;
        const newQty = newStockMap.get(invId) || 0;
        const delta = newQty - oldQty;

        if (delta > 0) {
          // Additional quantity sold -> Decrement inventory stock
          const [inv] = await tx
            .update(inventory)
            .set({
              quantity: sql`GREATEST(0, ${inventory.quantity} - ${delta})`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventory.id, invId),
                eq(inventory.organizationId, user.organizationId!)
              )
            )
            .returning();

          if (inv) {
            await tx.insert(stockMovements).values({
              inventoryId: invId,
              shopId: order.shopId,
              organizationId: user.organizationId!,
              movementType: "SOLD",
              quantityChange: -delta,
              balanceAfter: inv.quantity,
              referenceType: "ORDER_EDIT_SALE",
              referenceNumber: existingInvoice.invoiceNumber,
              vendorParty: payload.customer.fullName,
              costPriceAtTime: inv.costPrice || "0.00",
              notes: `Stock debited via Order Edit (quantity increased by ${delta}).`,
              performedBy: user.id,
              createdAt: new Date(),
            });
          }
        } else if (delta < 0) {
          // Items removed or quantity decreased -> Restock inventory
          const restockQty = Math.abs(delta);
          const [inv] = await tx
            .update(inventory)
            .set({
              quantity: sql`${inventory.quantity} + ${restockQty}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventory.id, invId),
                eq(inventory.organizationId, user.organizationId!)
              )
            )
            .returning();

          if (inv) {
            await tx.insert(stockMovements).values({
              inventoryId: invId,
              shopId: order.shopId,
              organizationId: user.organizationId!,
              movementType: "ADJUSTMENT",
              quantityChange: restockQty,
              balanceAfter: inv.quantity,
              referenceType: "ORDER_EDIT_RESTOCK",
              referenceNumber: existingInvoice.invoiceNumber,
              vendorParty: payload.customer.fullName,
              costPriceAtTime: inv.costPrice || "0.00",
              notes: `Stock credited via Order Edit (quantity reduced by ${restockQty}).`,
              performedBy: user.id,
              createdAt: new Date(),
            });
          }
        }
      }

      // 2. Update Customer details
      await tx
        .update(customers)
        .set({
          fullName: payload.customer.fullName.trim(),
          phone: payload.customer.phone.trim(),
          email: payload.customer.email ? payload.customer.email.trim() : null,
          address: payload.customer.address ? payload.customer.address.trim() : null,
          city: payload.customer.city ? payload.customer.city.trim() : null,
          state: payload.customer.state ? payload.customer.state.trim() : null,
          pincode: payload.customer.pincode ? payload.customer.pincode.trim() : null,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, order.customerId));

      // 3. Delete previous receipts for this invoice (replacing with updated data)
      await tx.delete(receipts).where(eq(receipts.invoiceId, existingInvoice.id));

      // 4. Generate new receipt if partial payment
      let newReceiptId: string | null = null;
      if (payload.paymentType === "PARTIAL" && finalAmountPaid > 0) {
        const receiptNumber = await generateReceiptNumber(order.shopId, tx);
        const [receiptRecord] = await tx
          .insert(receipts)
          .values({
            shopId: order.shopId,
            organizationId: user.organizationId!,
            invoiceId: existingInvoice.id,
            receiptNumber,
            amountPaid: finalAmountPaid.toFixed(2),
            balanceDue: finalBalanceDue.toFixed(2),
            paymentMethod: payload.paymentMethod,
            transactionId:
              payload.paymentMethod === "UPI" || payload.paymentMethod === "BANK_TRANSFER"
                ? `TXN-EDIT-${Math.floor(10000 + Math.random() * 90000)}`
                : null,
            createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
            updatedAt: new Date(),
          })
          .returning();

        newReceiptId = receiptRecord.id;
      }

      // 5. Update Invoice record
      await tx
        .update(invoices)
        .set({
          subtotal: subtotalVal.toFixed(2),
          discount: totalDiscount.toFixed(2),
          discountPercent: discountPercent.toFixed(2),
          tax: totalTax.toFixed(2),
          taxPercent: taxPercent.toFixed(2),
          total: grandTotal.toFixed(2),
          amountPaid: finalAmountPaid.toFixed(2),
          balanceDue: finalBalanceDue.toFixed(2),
          status: finalInvoiceStatus,
          paymentMethod: payload.paymentMethod,
          fulfillmentStatus: payload.fulfillmentStatus || existingInvoice.fulfillmentStatus,
          estimatedDelivery: estimatedDeliveryDate
            ? estimatedDeliveryDate.toISOString().split("T")[0]
            : null,
          soldBy: payload.soldBy !== undefined ? (payload.soldBy || null) : existingInvoice.soldBy,
          notes: payload.notes !== undefined ? (payload.notes || null) : existingInvoice.notes,
          specialInstructions:
            payload.specialInstructions !== undefined
              ? (payload.specialInstructions || null)
              : existingInvoice.specialInstructions,
          createdAt: payload.createdAt ? new Date(payload.createdAt) : existingInvoice.createdAt,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, existingInvoice.id));

      // 6. Replace Invoice Line Items
      await tx
        .delete(invoiceItems)
        .where(eq(invoiceItems.invoiceId, existingInvoice.id));

      const invoiceItemDate = payload.createdAt ? new Date(payload.createdAt) : new Date();

      for (const item of payload.items) {
        const itemSubtotal = item.quantity * item.unitPrice;
        await tx.insert(invoiceItems).values({
          invoiceId: existingInvoice.id,
          inventoryId: item.inventoryId || null,
          shopId: order.shopId,
          organizationId: user.organizationId!,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          subtotal: itemSubtotal.toFixed(2),
          discountPercent: (item.discountPercent || 0).toFixed(2),
          discountAmount: (item.discountAmount || 0).toFixed(2),
          cgstPercent: (item.cgstPercent || 0).toFixed(2),
          cgstAmount: (item.cgstAmount || 0).toFixed(2),
          sgstPercent: (item.sgstPercent || 0).toFixed(2),
          sgstAmount: (item.sgstAmount || 0).toFixed(2),
          igstPercent: (item.igstPercent || 0).toFixed(2),
          igstAmount: (item.igstAmount || 0).toFixed(2),
          createdAt: invoiceItemDate,
        });
      }

      // 7. Update Order record (or create if legacy invoice had no order row)
      let resolvedOrderId = order?.id;
      if (order) {
        await tx
          .update(orders)
          .set({
            receiptId: newReceiptId,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));
      } else {
        const orderNumber = await generateOrderNumber(existingInvoice.shopId, tx);
        const [newOrder] = await tx
          .insert(orders)
          .values({
            shopId: existingInvoice.shopId,
            organizationId: user.organizationId!,
            customerId: existingInvoice.customerId,
            invoiceId: existingInvoice.id,
            receiptId: newReceiptId,
            orderNumber,
            createdAt: existingInvoice.createdAt,
            updatedAt: new Date(),
          })
          .returning();
        resolvedOrderId = newOrder.id;
      }

      // 8. Record in Order Edit History
      const summaryParts: string[] = [];
      if (existingCustomer?.fullName !== payload.customer.fullName.trim()) {
        summaryParts.push(`Customer updated to "${payload.customer.fullName.trim()}"`);
      }
      summaryParts.push(
        `Items updated (${payload.items.length} item${payload.items.length !== 1 ? "s" : ""}, Total: ₹${grandTotal.toFixed(2)})`
      );
      if (payload.paymentType === "FULL") {
        summaryParts.push(`Payment settled in full: ₹${grandTotal.toFixed(2)} via ${payload.paymentMethod}`);
      } else {
        summaryParts.push(
          `Payment set to ₹${finalAmountPaid.toFixed(2)} (${payload.paymentMethod}), Balance Due: ₹${finalBalanceDue.toFixed(2)}`
        );
      }
      if (payload.fulfillmentStatus && payload.fulfillmentStatus !== existingInvoice.fulfillmentStatus) {
        summaryParts.push(`Status changed to ${payload.fulfillmentStatus}`);
      }
      if (payload.soldBy) {
        summaryParts.push(`Sold by: ${payload.soldBy}`);
      }

      const summaryText = summaryParts.join(" • ");

      await tx.insert(orderEditHistory).values({
        orderId: resolvedOrderId!,
        shopId: existingInvoice.shopId,
        organizationId: user.organizationId!,
        userId: user.id,
        userName: user.fullName || "Store Staff",
        userRole: user.role || "SHOP_MANAGER",
        summary: summaryText,
        snapshot: {
          previous: {
            total: existingInvoice.total,
            amountPaid: existingInvoice.amountPaid,
            balanceDue: existingInvoice.balanceDue,
            itemsCount: existingItems.length,
            fulfillmentStatus: existingInvoice.fulfillmentStatus,
            customerName: existingCustomer?.fullName || "",
            soldBy: existingInvoice.soldBy,
          },
          updated: {
            total: grandTotal.toFixed(2),
            amountPaid: finalAmountPaid.toFixed(2),
            balanceDue: finalBalanceDue.toFixed(2),
            itemsCount: payload.items.length,
            fulfillmentStatus: payload.fulfillmentStatus || existingInvoice.fulfillmentStatus,
            customerName: payload.customer.fullName.trim(),
            soldBy: payload.soldBy || null,
          },
        },
        createdAt: new Date(),
      });
    });

    // Revalidate paths for zero-latency updates
    revalidatePath("/shop/orders");
    revalidatePath("/shop/dashboard");
    revalidatePath("/shop/analytics");
    revalidatePath(`/shop/invoices/${existingInvoice.id}`);
    revalidatePath(`/shop/orders/${order.id}/edit`);

    return {
      success: true,
      message: "Order updated successfully! Invoice and stock balances synchronized.",
      orderId: order.id,
      invoiceId: existingInvoice.id,
    };
  } catch (error: any) {
    console.error("Error in updateFullOrderAction:", error);
    return {
      success: false,
      message: error.message || "Failed to update order.",
    };
  }
}



