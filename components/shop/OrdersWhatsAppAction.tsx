"use client";

import React, { useState } from "react";
import { OrderItem } from "@/services/order.service";
import { offlineDB } from "@/lib/offline/db";
import { getShopSettingsAction } from "@/actions/shop-settings.actions";
import { getCustomerPrescriptionsAction } from "@/actions/prescription.actions";
import { dispatchWhatsAppMessageAction } from "@/actions/desktop-wa.actions";
import { parseWhatsAppTemplate, openWhatsAppChat, sendUniversalWhatsAppMessage } from "@/utils/whatsapp-parser";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Send, 
  FileText, 
  FileCheck, 
  Eye, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  X, 
  PhoneCall, 
  Loader2 
} from "lucide-react";

interface OrdersWhatsAppActionProps {
  order: OrderItem;
}

export const WhatsAppIcon = ({ className = "w-4 h-4 fill-current" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.48-.002 9.932-4.448 9.935-9.923.001-2.652-1.03-5.143-2.905-7.018C16.426 1.79 13.931.758 11.28.758c-5.478 0-9.93 4.447-9.934 9.925-.001 1.84.482 3.633 1.4 5.207L1.687 22.3l6.59-1.737zM18.82 15.09c-.317-.159-1.88-.93-2.171-1.036-.29-.105-.503-.158-.714.159-.211.318-.82 1.036-1.006 1.248-.185.213-.37.24-.688.082-1.815-.91-2.997-1.615-4.14-3.582-.28-.487.323-.452.923-1.65.1-.2.05-.375-.025-.533-.075-.16-.625-1.507-.856-2.07-.225-.544-.452-.47-.62-.478-.153-.008-.33-.008-.507-.008-.178 0-.468.067-.714.34-.246.273-.94.92-.94 2.247 0 1.327.962 2.607 1.096 2.785.134.178 1.895 2.898 4.59 4.067.64.278 1.14.444 1.53.567.644.205 1.23.176 1.693.107.518-.077 1.58-.646 1.802-1.24.22-.593.22-1.102.155-1.21-.065-.108-.24-.159-.556-.32z" />
  </svg>
);

export function OrdersWhatsAppAction({ order }: OrdersWhatsAppActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingTemplateKey, setPendingTemplateKey] = useState<string | null>(null);

  // Fallback Phone Input Modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [inputPhone, setInputPhone] = useState("");

  const isFullyPaid = parseFloat(order.balanceDue) === 0;

  const handleSelectTemplate = (templateKey: string) => {
    setIsOpen(false);
    const targetPhone = order.customerPhone?.replace(/[^\d]/g, "") || "";
    if (targetPhone.length >= 10) {
      executeDispatch(targetPhone, templateKey);
    } else {
      setPendingTemplateKey(templateKey);
      setInputPhone("");
      setShowPhoneModal(true);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = inputPhone.replace(/[^\d]/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit WhatsApp phone number.");
      return;
    }
    setShowPhoneModal(false);
    if (pendingTemplateKey) {
      executeDispatch(cleanPhone, pendingTemplateKey);
      setPendingTemplateKey(null);
    }
  };

  const executeDispatch = async (phoneNumber: string, templateKey: string) => {
    setIsSending(true);
    try {
      // 1. Resolve Shop Settings (from local cache or server)
      let shopData: any = null;
      try {
        const cachedProfiles = await offlineDB.cached_shop_profile.toArray();
        if (cachedProfiles.length > 0) {
          shopData = cachedProfiles[0];
        }
      } catch {}

      if (!shopData && typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const settingsRes = await getShopSettingsAction();
          if (settingsRes.success && settingsRes.data) {
            shopData = settingsRes.data;
          }
        } catch {}
      }

      // 2. Resolve Template Config
      const templateConfig =
        shopData?.settings?.whatsappTemplates?.[templateKey] ||
        shopData?.whatsappTemplates?.[templateKey];

      const isEnabled = templateConfig?.enabled ?? true;
      if (!isEnabled) {
        toast.warning("This notification trigger is currently disabled in Settings.");
        return;
      }

      // 3. Fallback Templates
      const fallbacks: Record<string, string> = {
        order_form_sent:
          "Dear {{customer_name}},\n\nThank you for booking your optical order with {{shop_name}}!\n\n*Order Booking Details:*\n• Order Form #: {{receipt_number}}\n• Amount Paid: {{amount_paid}}\n• Remaining Dues: {{balance_due}}\n• Expected Delivery: {{estimated_delivery}}\n\nAccess your digital Order Form & optical prescription details here:\n{{order_form_url}}\n\nThank you for trusting us with your vision!",
        invoice_sent:
          "Dear {{customer_name}},\n\nThank you for choosing {{shop_name}}! Your invoice {{invoice_number}} is ready.\n\n*Invoice Summary:*\n• Total Amount: {{amount}}\n• Amount Paid: {{amount_paid}}\n• Balance Due: {{balance_due}}\n• Payment Method: {{payment_method}}\n• Delivery Status: {{fulfillment_status}}\n\nView and download your digital PDF bill here: {{invoice_url}}\n\nHave a great day!",
        prescription_sent:
          "Dear {{customer_name}},\n\nHere are your clinical eye prescription details from {{shop_name}}:\n\n*Right Eye (OD):*\n• SPH: {{re_sph}} | CYL: {{re_cyl}} | AXIS: {{re_axis}} | ADD: {{re_add}}\n\n*Left Eye (OS):*\n• SPH: {{le_sph}} | CYL: {{le_cyl}} | AXIS: {{le_axis}} | ADD: {{le_add}}\n\n• P.D.: {{pd}} mm\n• Prescribed By: {{doctor_name}}\n\nView your full optical records & digital card here: {{invoice_url}}\n\nWarm regards,\n{{shop_name}}",
        payment_reminder:
          "Dear {{customer_name}},\n\nThis is a gentle payment reminder from {{shop_name}} regarding your order {{order_number}}.\n\n*Pending Balance:* {{balance_due}}\n*Total Amount:* {{amount}}\n*Amount Paid So Far:* {{amount_paid}}\n\nYou can view your order summary and pay online here: {{invoice_url}}\n\nFeel free to reach out to us at {{phone}} if you have any questions!",
        order_complete:
          "Hi {{customer_name}},\n\nYour spectacles/lenses order under order number {{order_number}} is ready for pickup/delivery at {{shop_name}}!\n\nFeel free to visit us or contact us at {{phone}}.",
      };

      const templateText = templateConfig?.template || fallbacks[templateKey] || fallbacks.order_form_sent;

      // 4. If prescription template, resolve customer optical prescription
      let prescriptionData: any = null;
      if (templateKey === "prescription_sent" && order.customerId) {
        try {
          const rxRes = await getCustomerPrescriptionsAction(order.customerId);
          if (rxRes.success && rxRes.data && rxRes.data.length > 0) {
            prescriptionData = rxRes.data[rxRes.data.length - 1]; // latest prescription
          }
        } catch {}
      }

      // Format template variables
      const invoiceUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/invoice/${order.invoiceId}`;
      const primaryReceiptId = order.receipts?.[0]?.id || order.receiptId || order.invoiceId;
      const orderFormUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/shop/receipts/${primaryReceiptId}`;

      const parsedText = parseWhatsAppTemplate(templateText, {
        customer_name: order.customerName || "Valued Customer",
        shop_name: shopData?.name || "Clarity Eyecare",
        phone: shopData?.phone || "+91 74161 06064",
        order_number: order.orderNumber || "",
        invoice_number: order.invoiceNumber || "",
        receipt_number: order.receipts?.[0]?.receiptNumber || order.orderNumber || "ORDER FORM",
        amount: formatCurrency(parseFloat(order.total)),
        amount_paid: formatCurrency(parseFloat(order.amountPaid || "0")),
        balance_due: formatCurrency(parseFloat(order.balanceDue || "0")),
        payment_method: order.paymentMethod ? order.paymentMethod.replace("_", " ") : "CASH",
        fulfillment_status: order.fulfillmentStatus ? order.fulfillmentStatus.replace("_", " ") : "PROCESSING",
        estimated_delivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A",
        invoice_url: invoiceUrl,
        order_form_url: orderFormUrl,
        re_sph: prescriptionData?.rightSphere ? String(prescriptionData.rightSphere) : "0.00",
        re_cyl: prescriptionData?.rightCylinder ? String(prescriptionData.rightCylinder) : "0.00",
        re_axis: prescriptionData?.rightAxis ? `${prescriptionData.rightAxis}°` : "-",
        re_add: prescriptionData?.rightAdd ? String(prescriptionData.rightAdd) : "-",
        le_sph: prescriptionData?.leftSphere ? String(prescriptionData.leftSphere) : "0.00",
        le_cyl: prescriptionData?.leftCylinder ? String(prescriptionData.leftCylinder) : "0.00",
        le_axis: prescriptionData?.leftAxis ? `${prescriptionData.leftAxis}°` : "-",
        le_add: prescriptionData?.leftAdd ? String(prescriptionData.leftAdd) : "-",
        pd: prescriptionData?.pd ? String(prescriptionData.pd) : "62",
        doctor_name: prescriptionData?.prescribedBy || "Optometrist",
      });

      // 5. Send message via universal dispatcher
      const res = await sendUniversalWhatsAppMessage(
        {
          phoneNumber,
          messageText: parsedText,
          mediaUrl: templateKey === "order_form_sent" ? orderFormUrl : invoiceUrl,
          mediaType: "DOCUMENT",
          templateKey,
          recipientName: order.customerName,
          shopId: shopData?.id,
          shopSettings: shopData?.settings,
          metadata: {
            orderId: order.id,
            invoiceId: order.invoiceId,
            templateKey,
          },
          showToast: false,
        },
        dispatchWhatsAppMessageAction
      );

      if (res.mode === "desktop_assistant") {
        if (res.isDesktopOnline) {
          toast.success("Sent directly via Optical Manager Tool! ✓");
        } else {
          toast.success("Message queued in Optical Manager Tool! (Sent on reconnect)");
        }
      } else {
        toast.success("WhatsApp message opened in browser!");
      }
    } catch (err) {
      console.warn("[OrdersWhatsAppAction] Error:", err);
      toast.error("Failed to send WhatsApp message. Falling back to browser...");
      try {
        openWhatsAppChat(phoneNumber, `Hello ${order.customerName}, details for your order ${order.orderNumber}: ${window.location.origin}/share/invoice/${order.invoiceId}`);
      } catch {}
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      {/* Primary WhatsApp Quick Action Button */}
      <button
        type="button"
        disabled={isSending}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
          isOpen
            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105"
            : "bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 border-emerald-200/70 shadow-xs hover:scale-105"
        } ${isSending ? "opacity-60 cursor-not-allowed" : ""}`}
        title="WhatsApp Customer (Send Order Form, Invoice, Prescription, Reminder)"
      >
        {isSending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <WhatsAppIcon className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          <div
            className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl border border-slate-200/90 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 text-left select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <WhatsAppIcon className="h-3 w-3 text-emerald-600" /> Send WhatsApp
                </span>
                <span className="text-[9px] font-bold text-slate-500">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-800 truncate mt-0.5">
                {order.customerName}
                {order.customerPhone ? (
                  <span className="text-[10px] font-normal text-slate-500 ml-1 font-mono">
                    ({order.customerPhone})
                  </span>
                ) : null}
              </p>
            </div>

            {/* Menu Options */}
            <div className="space-y-0.5">
              {/* 1. Send Order Form */}
              <button
                type="button"
                onClick={() => handleSelectTemplate("order_form_sent")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-900 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-blue-50 text-[#0a52c3] group-hover:bg-blue-100">
                    <FileText className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">Send Order Form</p>
                    <p className="text-[9px] text-slate-400 font-medium">Booking & Rx confirmation</p>
                  </div>
                </div>
                <Send className="h-3 w-3 text-slate-350 group-hover:text-emerald-600 transition-colors" />
              </button>

              {/* 2. Send Tax Invoice - ONLY when invoice is generated (upon full payment / settlement) */}
              {isFullyPaid && (
                <button
                  type="button"
                  onClick={() => handleSelectTemplate("invoice_sent")}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-900 flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
                      <FileCheck className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Send Tax Invoice</p>
                      <p className="text-[9px] text-slate-400 font-medium">Digital PDF bill link</p>
                    </div>
                  </div>
                  <Send className="h-3 w-3 text-slate-350 group-hover:text-emerald-600 transition-colors" />
                </button>
              )}

              {/* 3. Send Eye Prescription */}
              <button
                type="button"
                onClick={() => handleSelectTemplate("prescription_sent")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-900 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100">
                    <Eye className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">Send Prescription</p>
                    <p className="text-[9px] text-slate-400 font-medium">RE/LE powers & PD details</p>
                  </div>
                </div>
                <Send className="h-3 w-3 text-slate-350 group-hover:text-emerald-600 transition-colors" />
              </button>

              {/* 4. Ready for Pickup */}
              <button
                type="button"
                onClick={() => handleSelectTemplate("order_complete")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-900 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-teal-50 text-teal-700 group-hover:bg-teal-100">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">Ready for Pickup</p>
                    <p className="text-[9px] text-slate-400 font-medium">Spectacles ready in-store</p>
                  </div>
                </div>
                <Send className="h-3 w-3 text-slate-350 group-hover:text-emerald-600 transition-colors" />
              </button>

              {/* 5. Payment Reminder (Highlighted if balanceDue > 0) */}
              <button
                type="button"
                onClick={() => handleSelectTemplate("payment_reminder")}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors group cursor-pointer ${
                  parseFloat(order.balanceDue) > 0
                    ? "bg-rose-50/50 hover:bg-rose-100/60 text-rose-900 border border-rose-100"
                    : "hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md ${parseFloat(order.balanceDue) > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                    <DollarSign className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight">Payment Reminder</p>
                    <p className="text-[9px] text-slate-500 font-medium">
                      {parseFloat(order.balanceDue) > 0
                        ? `Dues: ${formatCurrency(parseFloat(order.balanceDue))}`
                        : "No dues pending"}
                    </p>
                  </div>
                </div>
                <Send className="h-3 w-3 text-slate-350 group-hover:text-emerald-600 transition-colors" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fallback Missing Phone Modal */}
      {showPhoneModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setShowPhoneModal(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span>Enter WhatsApp Number</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPhoneModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              No valid 10-digit mobile number found for <strong className="text-slate-800">{order.customerName}</strong>. Please enter the number to send the WhatsApp message.
            </p>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  autoFocus
                  placeholder="9876543210"
                  maxLength={10}
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  className="w-full pl-11 pr-3 py-2 text-sm font-semibold tracking-wider font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inputPhone.length < 10}
                  className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
