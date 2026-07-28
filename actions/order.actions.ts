"use server";

import { db } from "@/lib/drizzle";
import { invoices, customers, shops, orders, receipts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/services/auth.service";
import { sendShopEmail } from "@/services/email.service";
import { revalidatePath } from "next/cache";
import { generateReceiptNumber } from "@/services/receipt.service";

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


