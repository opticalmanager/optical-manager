"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Send, X, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCustomerPhoneAction } from "@/actions/customer.actions";
import { parseWhatsAppTemplate, openWhatsAppChat } from "@/utils/whatsapp-parser";

interface DocumentActionBarProps {
  documentType: "Invoice" | "Receipt";
  data?: any;
}

const WhatsAppIcon = () => (
  <svg
    className="w-4 h-4 fill-current"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.48-.002 9.932-4.448 9.935-9.923.001-2.652-1.03-5.143-2.905-7.018C16.426 1.79 13.931.758 11.28.758c-5.478 0-9.93 4.447-9.934 9.925-.001 1.84.482 3.633 1.4 5.207L1.687 22.3l6.59-1.737zM18.82 15.09c-.317-.159-1.88-.93-2.171-1.036-.29-.105-.503-.158-.714.159-.211.318-.82 1.036-1.006 1.248-.185.213-.37.24-.688.082-1.815-.91-2.997-1.615-4.14-3.582-.28-.487.323-.452.923-1.65.1-.2.05-.375-.025-.533-.075-.16-.625-1.507-.856-2.07-.225-.544-.452-.47-.62-.478-.153-.008-.33-.008-.507-.008-.178 0-.468.067-.714.34-.246.273-.94.92-.94 2.247 0 1.327.962 2.607 1.096 2.785.134.178 1.895 2.898 4.59 4.067.64.278 1.14.444 1.53.567.644.205 1.23.176 1.693.107.518-.077 1.58-.646 1.802-1.24.22-.593.22-1.102.155-1.21-.065-.108-.24-.159-.556-.32z" />
  </svg>
);

export function DocumentActionBar({ documentType, data }: DocumentActionBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for missing phone number dialog
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [inputPhone, setInputPhone] = useState("");

  const isInvoice = documentType === "Invoice";

  // Build & open WhatsApp redirection link
  const triggerWhatsAppRedirect = (phoneNumber: string) => {
    if (!data) return;

    // 1. Resolve template from shop settings (with robust default fallback)
    const templateKey = isInvoice ? "invoice_sent" : "receipt_sent";
    const templateConfig = data.shop?.settings?.whatsappTemplates?.[templateKey];
    const isEnabled = templateConfig?.enabled ?? true;

    if (!isEnabled) {
      toast.warning(`${documentType} notification trigger is disabled in settings.`);
      return;
    }

    const defaultInvoiceTemplate = 
      "Dear {{customer_name}},\n\nThank you for choosing {{shop_name}}! Your invoice {{invoice_number}} is ready.\n\n*Invoice Summary:*\n• Total Amount: {{amount}}\n• Amount Paid: {{amount_paid}}\n• Balance Due: {{balance_due}}\n• Payment Method: {{payment_method}}\n• Delivery Status: {{fulfillment_status}}\n\nView and download your digital PDF bill here: {{invoice_url}}\n\nHave a great day!";

    const defaultReceiptTemplate =
      "Dear {{customer_name}},\n\nThank you for your payment at {{shop_name}}! Here is your payment receipt {{receipt_number}}.\n\n*Receipt Summary:*\n• Receipt Slip #: {{receipt_number}}\n• Amount Received: {{amount_paid}}\n• Remaining Balance: {{balance_due}}\n• Payment Mode: {{payment_method}}\n\nView and download your digital receipt & bill here: {{invoice_url}}\n\nThank you for visiting!";

    const templateText = templateConfig?.template || (isInvoice ? defaultInvoiceTemplate : defaultReceiptTemplate);

    // 2. Parse template with variables
    const formattedMessage = parseWhatsAppTemplate(templateText, {
      customer_name: data.customer?.fullName || "Valued Customer",
      shop_name: data.shop?.name || "Clarity Eyecare",
      phone: data.shop?.phone || "",
      invoice_number: data.invoice?.invoiceNumber || "",
      receipt_number: data.receipt?.receiptNumber || data.invoice?.invoiceNumber || "",
      amount: `Rs. ${data.invoice?.total || 0}`,
      amount_paid: `Rs. ${data.receipt?.amountPaid ?? data.invoice?.amountPaid ?? 0}`,
      balance_due: `Rs. ${data.invoice?.balanceDue || 0}`,
      payment_method: data.receipt?.paymentMethod || data.invoice?.paymentMethod || "N/A",
      fulfillment_status: data.invoice?.fulfillmentStatus || "PROCESSING",
      estimated_delivery: data.invoice?.estimatedDelivery ? new Date(data.invoice.estimatedDelivery).toLocaleDateString() : "N/A",
      invoice_url: `${window.location.origin}/share/invoice/${data.invoice?.id}`
    });

    // 3. Dispatch via universal multi-platform WhatsApp dispatcher (Desktop app + web fallback + mobile)
    openWhatsAppChat(phoneNumber, formattedMessage);
    toast.success("WhatsApp message launched!");
  };

  const handleWhatsAppSendClick = () => {
    if (!data) return;

    const customerPhone = data.customer?.phone;
    if (customerPhone && customerPhone.trim().length >= 10) {
      triggerWhatsAppRedirect(customerPhone);
    } else {
      // Phone is missing or invalid: show input prompt
      setInputPhone("");
      setShowPhoneModal(true);
    }
  };

  const handleConfirmPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !inputPhone.trim() || inputPhone.trim().length < 10) {
      toast.error("Please enter a valid WhatsApp phone number (minimum 10 digits).");
      return;
    }

    startTransition(async () => {
      // Save phone number in DB via Server Action
      const res = await updateCustomerPhoneAction(data.customer.id, inputPhone.trim());
      if (res.success) {
        toast.success(res.message);
        setShowPhoneModal(false);
        // Refresh router context and trigger the WhatsApp link
        router.refresh();
        triggerWhatsAppRedirect(inputPhone.trim());
      } else {
        toast.error(res.message || "Failed to update phone number.");
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-3.5 print:hidden mb-6 items-center">
      <Button
        variant="outline"
        onClick={() => router.push("/shop/invoices")}
        className="h-11 px-5 font-bold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer bg-white"
      >
        <ArrowLeft className="h-4 w-4 text-slate-500" /> Back to Invoices
      </Button>

      <Button
        onClick={() => window.print()}
        className={`h-11 px-5 font-bold text-white rounded-xl shadow-lg active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer ${
          isInvoice
            ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 hover:shadow-indigo-600/20"
            : "bg-[#0a52c3] hover:bg-[#004bb5] shadow-[#0a52c3]/10 hover:shadow-[#0a52c3]/20"
        }`}
      >
        <Printer className="h-4 w-4" /> Print {documentType}
      </Button>

      {data && (
        <Button
          onClick={handleWhatsAppSendClick}
          className="h-11 px-5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 rounded-xl active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer"
        >
          <WhatsAppIcon /> Send on WhatsApp
        </Button>
      )}

      {/* MISSING PHONE NUMBER MODAL DIALOG */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-sm w-full mx-4 space-y-4 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShowPhoneModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">WhatsApp Number Required</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Enter phone to send invoice notification</p>
              </div>
            </div>

            <form onSubmit={handleConfirmPhoneSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Customer phone number</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 917416106064"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 italic">
                  Note: Format with country code, without "+" or dashes (e.g. 91xxxxxxxxxx). Number will be saved to the database.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-850 font-black rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> {isPending ? "Saving..." : "Confirm & Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
