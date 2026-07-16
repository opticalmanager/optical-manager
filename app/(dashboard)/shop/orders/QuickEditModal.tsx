"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Calendar, AlertTriangle, Mail, Loader2, ChevronDown, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OrderItem } from "@/services/order.service";
import {
  updateOrderStatusAction,
  generateFullPaymentInvoiceAction,
  sendRescheduledDeliveryEmailAction,
} from "@/actions/order.actions";
import { updateCustomerPhoneAction } from "@/actions/customer.actions";
import { getShopSettingsAction } from "@/actions/shop-settings.actions";
import { parseWhatsAppTemplate, openWhatsAppChat } from "@/utils/whatsapp-parser";

interface QuickEditModalProps {
  order: OrderItem;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickEditModal({ order, isOpen, onClose }: QuickEditModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isEmailPending, startEmailTransition] = useTransition();
  const [isInvoicePending, startInvoiceTransition] = useTransition();

  // Get current date string in local YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];

  // Component local states
  const isPaidInitially = parseFloat(order.balanceDue) === 0;
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PARTIALLY_PAID">(
    isPaidInitially ? "PAID" : "PARTIALLY_PAID"
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "CARD" | "UPI" | "BANK_TRANSFER"
  >((order.paymentMethod as any) || "CASH");
  const [paymentReference, setPaymentReference] = useState("");

  const [fulfillmentStatus, setFulfillmentStatus] = useState<
    "PROCESSING" | "READY" | "DELIVERED" | "ON_HOLD"
  >(order.fulfillmentStatus as any);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(
    order.estimatedDelivery || ""
  );

  // WhatsApp prompt local states (declared at top level to respect Rules of Hooks)
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [inputPhone, setInputPhone] = useState("");
  const [whatsappTemplateKey, setWhatsappTemplateKey] = useState<"invoice_sent" | "order_complete" | "delivery_sent" | "delivery_delay" | null>(null);

  // Sync state with order changes when modal opens/changes
  useEffect(() => {
    setPaymentStatus(isPaidInitially ? "PAID" : "PARTIALLY_PAID");
    setPaymentMethod((order.paymentMethod as any) || "CASH");
    setPaymentReference("");
    setFulfillmentStatus(order.fulfillmentStatus as any);
    setEstimatedDelivery(order.estimatedDelivery || "");
  }, [order, isPaidInitially]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen) return null;
  if (!mounted) return null;

  // Inferred Delayed status
  const isDelayed =
    fulfillmentStatus !== "DELIVERED" &&
    estimatedDelivery &&
    estimatedDelivery < todayStr;

  // Date changed check
  const isDateChanged = estimatedDelivery !== (order.estimatedDelivery || "");

  // Custom WhatsApp icon component
  const WhatsAppIcon = () => (
    <svg
      className="w-4 h-4 fill-current shrink-0"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.48-.002 9.932-4.448 9.935-9.923.001-2.652-1.03-5.143-2.905-7.018C16.426 1.79 13.931.758 11.28.758c-5.478 0-9.93 4.447-9.934 9.925-.001 1.84.482 3.633 1.4 5.207L1.687 22.3l6.59-1.737zM18.82 15.09c-.317-.159-1.88-.93-2.171-1.036-.29-.105-.503-.158-.714.159-.211.318-.82 1.036-1.006 1.248-.185.213-.37.24-.688.082-1.815-.91-2.997-1.615-4.14-3.582-.28-.487.323-.452.923-1.65.1-.2.05-.375-.025-.533-.075-.16-.625-1.507-.856-2.07-.225-.544-.452-.47-.62-.478-.153-.008-.33-.008-.507-.008-.178 0-.468.067-.714.34-.246.273-.94.92-.94 2.247 0 1.327.962 2.607 1.096 2.785.134.178 1.895 2.898 4.59 4.067.64.278 1.14.444 1.53.567.644.205 1.23.176 1.693.107.518-.077 1.58-.646 1.802-1.24.22-.593.22-1.102.155-1.21-.065-.108-.24-.159-.556-.32z" />
    </svg>
  );

  const triggerWhatsAppRedirect = async (
    key: "invoice_sent" | "order_complete" | "delivery_sent" | "delivery_delay",
    targetPhone: string
  ) => {
    try {
      const settingsRes = await getShopSettingsAction();
      if (!settingsRes.success || !settingsRes.data) {
        toast.error("Failed to load shop notification templates.");
        return;
      }

      const shopData = settingsRes.data;
      const templateConfig = shopData.settings?.whatsappTemplates?.[key];
      const isEnabled = templateConfig?.enabled ?? true;

      if (!isEnabled) {
        toast.warning(`Notification template for "${key}" is disabled.`);
        return;
      }

      const fallbacks = {
        invoice_sent: "Dear {{customer_name}},\n\nThank you for choosing {{shop_name}}! Your invoice {{invoice_number}} is ready.\n\n*Invoice Summary:*\n• Total Amount: {{amount}}\n• Amount Paid: {{amount_paid}}\n• Balance Due: {{balance_due}}\n• Payment Method: {{payment_method}}\n• Delivery Status: {{fulfillment_status}}\n\nView and download your digital PDF bill here: {{invoice_url}}\n\nHave a great day!",
        order_complete: "Hi {{customer_name}},\n\nYour spectacles/lenses order under order number {{order_number}} is ready for pickup/delivery at {{shop_name}}!\n\nFeel free to visit us or contact us at {{phone}}.",
        delivery_sent: "Hello {{customer_name}},\n\nYour spectacles/lenses order {{order_number}} from {{shop_name}} is in progress.\n\nExpected delivery date: {{estimated_delivery}}.\n\nFeel free to contact us at {{phone}}.",
        delivery_delay: "Dear {{customer_name}},\n\nWe regret to inform you that your spectacles/lenses order {{order_number}} from {{shop_name}} has been delayed.\n\nThe revised expected delivery date is: {{estimated_delivery}}.\n\nWe apologize for the inconvenience. Feel free to contact us at {{phone}}."
      };

      const templateText = templateConfig?.template || fallbacks[key];

      const parsedText = parseWhatsAppTemplate(templateText, {
        customer_name: order.customerName || "Valued Customer",
        shop_name: shopData.name || "Clarity Eyecare",
        phone: shopData.phone || "+91 74161 06064",
        order_number: order.orderNumber || "",
        invoice_number: order.invoiceNumber || "",
        amount: `Rs. ${order.total}`,
        amount_paid: `Rs. ${order.amountPaid || "0.00"}`,
        balance_due: `Rs. ${order.balanceDue || "0.00"}`,
        payment_method: order.paymentMethod || "N/A",
        fulfillment_status: fulfillmentStatus,
        estimated_delivery: estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : "N/A",
        invoice_url: `${window.location.origin}/share/invoice/${order.invoiceId}`
      });

      openWhatsAppChat(targetPhone, parsedText);
      toast.success("WhatsApp message launched!");
    } catch (error) {
      toast.error("Failed to trigger WhatsApp message.");
    }
  };

  const handleSendWhatsApp = (key: "invoice_sent" | "order_complete" | "delivery_sent" | "delivery_delay") => {
    setWhatsappTemplateKey(key);
    const hasPhone = order.customerPhone && order.customerPhone.trim().length >= 10;
    if (hasPhone) {
      triggerWhatsAppRedirect(key, order.customerPhone!);
    } else {
      setInputPhone("");
      setShowPhonePrompt(true);
    }
  };

  const handleConfirmPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim() || inputPhone.trim().length < 10) {
      toast.error("Please enter a valid WhatsApp phone number (minimum 10 digits).");
      return;
    }

    startTransition(async () => {
      const res = await updateCustomerPhoneAction(order.customerId, inputPhone.trim());
      if (res.success) {
        toast.success(res.message);
        setShowPhonePrompt(false);
        router.refresh();
        if (whatsappTemplateKey) {
          triggerWhatsAppRedirect(whatsappTemplateKey, inputPhone.trim());
        }
      } else {
        toast.error(res.message || "Failed to update phone number.");
      }
    });
  };

  // Handle Save (Delivery Status & Date)
  const handleSaveDeliveryDetails = () => {
    startTransition(async () => {
      try {
        const res = await updateOrderStatusAction(order.invoiceId, {
          fulfillmentStatus,
          estimatedDelivery: estimatedDelivery || null,
        });

        if (res.success) {
          toast.success(res.message);
          router.refresh();
          onClose();
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error(err.message || "An error occurred while saving changes.");
      }
    });
  };

  // Handle Send Email
  const handleSendEmail = () => {
    if (!order.customerEmail) {
      toast.warning("No registered email found for this patient");
      return;
    }

    startEmailTransition(async () => {
      try {
        const res = await sendRescheduledDeliveryEmailAction(
          order.invoiceId,
          estimatedDelivery
        );
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to send notification email.");
      }
    });
  };

  // Handle Generate Invoice (Full Payment)
  const handleGenerateInvoice = () => {
    startInvoiceTransition(async () => {
      try {
        const res = await generateFullPaymentInvoiceAction(order.invoiceId, {
          paymentMethod,
          transactionId: paymentReference || undefined,
        });

        if (res.success && res.redirectUrl) {
          toast.success(res.message);
          onClose();
          router.push(res.redirectUrl);
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to process full payment.");
      }
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Container (max-w-3xl for side-by-side columns to prevent scrolling) */}
      <div className="bg-white border border-slate-200/80 shadow-2xl rounded-2xl w-full max-w-3xl overflow-hidden relative z-10 flex flex-col scale-100 animate-in fade-in zoom-in-95 duration-200 max-h-[95vh]">
        
        {/* Header Block */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Quick Action
              </h3>
              <Badge variant="outline" className="text-[11px] font-extrabold uppercase border-slate-200 text-slate-650 bg-white px-2 py-0.5 rounded-md">
                {order.orderNumber}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-bold">
              Patient: <span className="text-slate-900 font-black">{order.customerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-150/50 transition-colors border border-transparent hover:border-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Payment Section */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Noticeable Section Header */}
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <div className="h-2 w-2 rounded-full bg-[#0a52c3]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Payment Details
                  </h4>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">
                      Payment Status
                    </label>
                    <div className="relative">
                      <select
                        disabled={isPaidInitially || isInvoicePending}
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as any)}
                        className="w-full h-10 pl-3.5 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all cursor-pointer shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed appearance-none"
                      >
                        <option value="PARTIALLY_PAID">Partially Paid</option>
                        <option value="PAID">Paid</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {paymentStatus === "PAID" && !isPaidInitially && (
                    <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600">
                          Payment Method
                        </label>
                        <div className="relative">
                          <select
                            disabled={isInvoicePending}
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="w-full h-10 pl-3.5 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all cursor-pointer shadow-sm appearance-none"
                          >
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600">
                          Payment Reference
                        </label>
                        <Input
                          placeholder="Enter reference ID (optional)"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          disabled={isInvoicePending}
                          className="h-10 text-sm font-semibold rounded-xl border-slate-200 focus-visible:ring-[#0a52c3]/20 focus-visible:border-[#0a52c3]"
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 mt-2">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                            Balance Due
                          </span>
                          <span className="text-base font-black text-rose-600">
                            ₹{parseFloat(order.balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <Button
                          onClick={handleGenerateInvoice}
                          disabled={isInvoicePending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors border-none cursor-pointer"
                        >
                          {isInvoicePending ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            "Generate Invoice"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {isPaidInitially && (
                    <div className="p-4 bg-emerald-50/45 border border-emerald-100/70 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
                      <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">
                        ✓
                      </div>
                      <span className="text-xs font-bold text-emerald-800">
                        This order is fully paid. No pending balance.
                      </span>
                    </div>
                  )}

                  {paymentStatus === "PAID" && (
                    <Button
                      type="button"
                      onClick={() => handleSendWhatsApp("invoice_sent")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all border-none cursor-pointer mt-3"
                    >
                      <WhatsAppIcon /> Send Invoice on WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Delivery Section */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Noticeable Section Header */}
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                  <div className="h-2 w-2 rounded-full bg-[#0a52c3]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Fulfillment Details
                  </h4>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">
                      Fulfillment Status
                    </label>
                    <div className="relative">
                      <select
                        disabled={isPending}
                        value={fulfillmentStatus}
                        onChange={(e) => setFulfillmentStatus(e.target.value as any)}
                        className="w-full h-10 pl-3.5 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all cursor-pointer shadow-sm appearance-none"
                      >
                        <option value="PROCESSING">In Processing</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="READY">Ready for Pickup</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Delayed Warning Alert (when estimated delivery is in the past) */}
                  {isDelayed && (
                    <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-rose-900 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="h-4.5 w-4.5 text-rose-550 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <p className="text-xs font-black text-rose-850 uppercase tracking-wider">
                            Delayed Delivery Alert
                          </p>
                          <p className="text-xs text-rose-700 font-bold mt-1 leading-relaxed">
                            Order exceeded its expected delivery date of{" "}
                            <span className="font-extrabold text-rose-900 underline">
                              {order.estimatedDelivery
                                ? new Date(order.estimatedDelivery).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric", year: "numeric" }
                                  )
                                : "N/A"}
                            </span>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-3 pt-2.5 border-t border-rose-100/60">
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[10px] font-black uppercase text-rose-700 flex items-center gap-1.5 tracking-wider">
                            <Calendar className="h-4 w-4" /> New Expected Date
                          </label>
                          <input
                            type="date"
                            value={estimatedDelivery}
                            onChange={(e) => setEstimatedDelivery(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-rose-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all"
                          />
                        </div>

                        {isDateChanged && (
                          <Button
                            onClick={handleSendEmail}
                            disabled={isEmailPending}
                            className="bg-rose-650 hover:bg-rose-700 text-white font-black text-xs h-10 px-3 rounded-xl flex items-center gap-1 transition-all border-none cursor-pointer"
                          >
                            {isEmailPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Mail className="h-3.5 w-3.5" />
                                Email
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Standard date selection when not delayed */}
                  {!isDelayed && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-655 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-[#0a52c3]" /> Expected Delivery Date
                      </label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="date"
                          value={estimatedDelivery}
                          onChange={(e) => setEstimatedDelivery(e.target.value)}
                          disabled={isPending}
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0a52c3]/20 focus:border-[#0a52c3] transition-all"
                        />
                        {isDateChanged && (
                          <Button
                            onClick={handleSendEmail}
                            disabled={isEmailPending}
                            className="bg-[#0a52c3] hover:bg-[#0845a8] text-white font-black text-xs h-10 px-3 rounded-xl flex items-center gap-1 transition-all border-none cursor-pointer shrink-0"
                          >
                            {isEmailPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Mail className="h-3.5 w-3.5" />
                                Email
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => {
                      let key: "order_complete" | "delivery_sent" | "delivery_delay" = "delivery_sent";
                      if (fulfillmentStatus === "DELIVERED") {
                        key = "order_complete";
                      } else {
                        const oldDate = order.estimatedDelivery;
                        const isDelay = oldDate && estimatedDelivery > oldDate;
                        key = isDelay ? "delivery_delay" : "delivery_sent";
                      }
                      handleSendWhatsApp(key);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all border-none cursor-pointer mt-3"
                  >
                    <WhatsAppIcon /> Send Status Update on WhatsApp
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3.5 shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="text-xs font-extrabold uppercase text-slate-500 hover:text-slate-800 hover:bg-slate-150/50 tracking-wider"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveDeliveryDetails}
            disabled={isPending}
            className="bg-[#0a52c3] hover:bg-[#0845a8] text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all border-none cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

      </div>

      {/* PHONE CAPTURE PROMPT OVERLAY */}
      {showPhonePrompt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-sm w-full mx-4 space-y-4 animate-in zoom-in-95 duration-200 relative text-left">
            <button
              onClick={() => setShowPhonePrompt(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-105 transition-colors cursor-pointer border-none"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">WhatsApp Number Required</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Enter phone to send notification</p>
              </div>
            </div>

            <form onSubmit={handleConfirmPhoneSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider">Customer phone number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 917416106064"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 italic">
                  Note: Format with country code, without "+" or dashes (e.g. 91xxxxxxxxxx). Number will be saved to the database.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhonePrompt(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-855 font-black rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Confirm & Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
