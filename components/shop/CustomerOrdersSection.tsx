"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Receipt,
  FileCheck,
  ChevronDown,
  Pencil,
  Lock,
  SlidersHorizontal,
  X,
  Plus,
  Clock,
  CheckCircle2,
  Send,
  ArrowUpDown,
  FileSpreadsheet
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { OrderItem } from "@/services/order.service";
import { SKUDetailsDropdown } from "@/app/(dashboard)/shop/orders/SKUDetailsDropdown";
import { QuickEditModal } from "@/app/(dashboard)/shop/orders/QuickEditModal";
import { parseWhatsAppTemplate, sendUniversalWhatsAppMessage } from "@/utils/whatsapp-parser";
import { dispatchWhatsAppMessageAction } from "@/actions/desktop-wa.actions";
import { getShopSettingsAction } from "@/actions/shop-settings.actions";
import { offlineDB } from "@/lib/offline/db";

// WhatsApp Brand Icon
function WhatsAppIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={`${className} fill-current shrink-0`}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.48-.002 9.932-4.448 9.935-9.923.001-2.652-1.03-5.143-2.905-7.018C16.426 1.79 13.931.758 11.28.758c-5.478 0-9.93 4.447-9.934 9.925-.001 1.84.482 3.633 1.4 5.207L1.687 22.3l6.59-1.737zM18.82 15.09c-.317-.159-1.88-.93-2.171-1.036-.29-.105-.503-.158-.714.159-.211.318-.82 1.036-1.006 1.248-.185.213-.37.24-.688.082-1.815-.91-2.997-1.615-4.14-3.582-.28-.487.323-.452.923-1.65.1-.2.05-.375-.025-.533-.075-.16-.625-1.507-.856-2.07-.225-.544-.452-.47-.62-.478-.153-.008-.33-.008-.507-.008-.178 0-.468.067-.714.34-.246.273-.94.92-.94 2.247 0 1.327.962 2.607 1.096 2.785.134.178 1.895 2.898 4.59 4.067.64.278 1.14.444 1.53.567.644.205 1.23.176 1.693.107.518-.077 1.58-.646 1.802-1.24.22-.593.22-1.102.155-1.21-.065-.108-.24-.159-.556-.32z" />
    </svg>
  );
}

// Receipts and Invoices Dropdown component
function ReceiptsDropdown({
  order,
  isFullyPaid,
}: {
  order: OrderItem;
  isFullyPaid: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const receiptsList = order.receipts || [];

  const chronologicalReceipts = [...receiptsList].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const latestReceipt = receiptsList[0] || null;

  const invoiceTargetUrl = order.invoiceId.startsWith("off-")
    ? `/shop/invoices/offline/${order.invoiceId}`
    : `/shop/invoices/${order.invoiceId}`;

  const primaryUrl = isFullyPaid
    ? invoiceTargetUrl
    : latestReceipt
    ? `/shop/receipts/${latestReceipt.id}`
    : order.receiptId
    ? `/shop/receipts/${order.receiptId}`
    : invoiceTargetUrl;

  return (
    <div className="relative inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Link
        href={primaryUrl}
        className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
          isFullyPaid
            ? "text-emerald-600 hover:bg-emerald-50"
            : "text-[#0a52c3] hover:bg-blue-50"
        }`}
        title={isFullyPaid ? "View Final Tax Invoice" : "View Payment Receipt"}
      >
        {isFullyPaid ? (
          <FileCheck className="h-4 w-4 shrink-0" />
        ) : (
          <Receipt className="h-4 w-4 shrink-0" />
        )}
      </Link>

      {!isFullyPaid && receiptsList.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className={`p-1 rounded-md transition-all cursor-pointer border ${
              isOpen
                ? "bg-[#0a52c3] text-white border-[#0a52c3]"
                : "bg-slate-50 text-slate-500 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
            }`}
            title="View invoice & payment receipts list"
          >
            <ChevronDown className="h-3 w-3" />
          </button>

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
                className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl border border-slate-200/90 shadow-xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Receipt className="h-3 w-3 text-[#0a52c3]" />
                    Order Documents
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {order.orderNumber}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {isFullyPaid && (
                    <Link
                      href={invoiceTargetUrl}
                      className="block p-2 rounded-lg bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-150 transition-all group/inv"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-800 flex items-center gap-1 group-hover/inv:underline">
                          <FileCheck className="h-3.5 w-3.5 text-emerald-600" /> Tax Invoice
                        </span>
                        <span className="font-extrabold text-xs text-emerald-700">
                          {formatCurrency(parseFloat(order.total))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-semibold text-emerald-600/80 mt-1">
                        <span>
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="uppercase font-bold text-emerald-700">PAID IN FULL</span>
                      </div>
                    </Link>
                  )}

                  {chronologicalReceipts.map((r, idx) => (
                    <Link
                      key={r.id}
                      href={`/shop/receipts/${r.id}`}
                      className="block p-2 rounded-lg bg-slate-50/70 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-150 transition-all group/rcp"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#0a52c3] group-hover/rcp:underline flex items-center gap-1">
                          <Receipt className="h-3.5 w-3.5 text-[#0a52c3]" />
                          Receipt {idx + 1}
                        </span>
                        <span className="font-extrabold text-xs text-slate-900">
                          {formatCurrency(parseFloat(r.amountPaid))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 mt-1">
                        <span>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="uppercase text-slate-500 font-bold">{r.paymentMethod}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Quick WhatsApp Dispatch Menu on table row
function WhatsAppRowAction({
  order,
  customerPhone,
  customerName,
}: {
  order: OrderItem;
  customerPhone?: string | null;
  customerName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (key: "invoice_sent" | "order_complete" | "delivery_sent") => {
    setIsOpen(false);
    const targetPhone = customerPhone || order.customerPhone;
    if (!targetPhone || targetPhone.replace(/[^\d]/g, "").length < 10) {
      toast.error("Customer does not have a valid 10-digit phone number.");
      return;
    }

    setIsSending(true);
    try {
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

      const templateConfig =
        shopData?.settings?.whatsappTemplates?.[key] || shopData?.whatsappTemplates?.[key];

      const fallbacks = {
        invoice_sent: "Dear {{customer_name}},\n\nThank you for choosing {{shop_name}}! Your invoice {{invoice_number}} is ready.\n\n*Invoice Summary:*\n• Total Amount: {{amount}}\n• Amount Paid: {{amount_paid}}\n• Balance Due: {{balance_due}}\n• Payment Method: {{payment_method}}\n• Delivery Status: {{fulfillment_status}}\n\nView and download your digital PDF bill here: {{invoice_url}}\n\nHave a great day!",
        order_complete: "Hi {{customer_name}},\n\nYour spectacles/lenses order under order number {{order_number}} is ready for pickup/delivery at {{shop_name}}!\n\nFeel free to visit us or contact us at {{phone}}.",
        delivery_sent: "Hello {{customer_name}},\n\nYour spectacles/lenses order {{order_number}} from {{shop_name}} is in progress.\n\nExpected delivery date: {{estimated_delivery}}.\n\nFeel free to contact us at {{phone}}.",
      };

      const templateText = templateConfig?.template || fallbacks[key];

      const parsedText = parseWhatsAppTemplate(templateText, {
        customer_name: customerName || order.customerName || "Valued Customer",
        shop_name: shopData?.name || "Clarity Eyecare",
        phone: shopData?.phone || "+91 74161 06064",
        order_number: order.orderNumber || "",
        invoice_number: order.invoiceNumber || "",
        amount: `Rs. ${order.total}`,
        amount_paid: `Rs. ${order.amountPaid || "0.00"}`,
        balance_due: `Rs. ${order.balanceDue || "0.00"}`,
        payment_method: order.paymentMethod || "N/A",
        fulfillment_status: order.fulfillmentStatus,
        estimated_delivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : "N/A",
        invoice_url: `${window.location.origin}/share/invoice/${order.invoiceId}`
      });

      const res = await sendUniversalWhatsAppMessage(
        {
          phoneNumber: targetPhone,
          messageText: parsedText,
          mediaUrl: `${window.location.origin}/share/invoice/${order.invoiceId}`,
          mediaType: "DOCUMENT",
          templateKey: key,
          recipientName: customerName || order.customerName,
          shopId: shopData?.id,
          shopSettings: shopData?.settings,
          metadata: {
            orderId: order.id,
            invoiceId: order.invoiceId,
            templateKey: key,
          },
          showToast: false,
        },
        dispatchWhatsAppMessageAction
      );

      if (res.mode === "desktop_assistant") {
        if (res.isDesktopOnline) {
          toast.success("Sent directly via Optical Manager Tool! ✓");
        } else {
          toast.success("Message queued in Optical Manager Tool! (Will send on reconnect)");
        }
      } else {
        toast.success("WhatsApp message opened in browser!");
      }
    } catch (err) {
      console.error("[WhatsAppRowAction] Error:", err);
      toast.error("Failed to trigger WhatsApp message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={isSending}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200/80"
        } ${isSending ? "opacity-60 cursor-not-allowed" : ""}`}
        title="Send WhatsApp Message"
      >
        <WhatsAppIcon className="h-3.5 w-3.5" />
      </button>

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
            className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-200/90 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 text-left select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 border-b border-slate-100 mb-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <WhatsAppIcon className="h-3 w-3 text-emerald-600" /> Send WhatsApp
              </span>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSend("invoice_sent")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between transition-colors"
              >
                <span>Digital Bill & Invoice</span>
                <Send className="h-3 w-3 text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => handleSend("order_complete")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between transition-colors"
              >
                <span>Ready for Pickup</span>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => handleSend("delivery_sent")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between transition-colors"
              >
                <span>In-Progress Update</span>
                <Clock className="h-3 w-3 text-emerald-600" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface CustomerOrdersSectionProps {
  orders: OrderItem[];
  customer: {
    id: string;
    fullName: string;
    phone: string;
  };
  canEditOrders?: boolean;
  onOrderUpdated?: () => void;
}

export function CustomerOrdersSection({
  orders: initialOrders,
  customer,
  canEditOrders = false,
  onOrderUpdated,
}: CustomerOrdersSectionProps) {
  const [ordersList, setOrdersList] = useState<OrderItem[]>(initialOrders || []);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"ALL" | "PAID" | "DUE" | "PROCESSING" | "READY" | "DELIVERED">("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "AMOUNT_HIGH">("NEWEST");

  // Keep ordersList in sync if parent props change
  useEffect(() => {
    if (initialOrders) {
      setOrdersList(initialOrders);
    }
  }, [initialOrders]);

  // Telemetry Aggregates
  const aggregates = useMemo(() => {
    let paidCount = 0;
    let dueCount = 0;
    let totalDueAmount = 0;
    let totalOrderValue = 0;
    let processingCount = 0;
    let readyCount = 0;
    let deliveredCount = 0;

    for (const ord of ordersList) {
      const balance = parseFloat(ord.balanceDue) || 0;
      const orderTotal = parseFloat(ord.total) || 0;

      // Only count non-cancelled orders towards total order value
      if (ord.fulfillmentStatus !== "CANCELLED") {
        totalOrderValue += orderTotal;
      }

      if (balance === 0) {
        paidCount++;
      } else {
        dueCount++;
        totalDueAmount += balance;
      }

      if (ord.fulfillmentStatus === "DELIVERED") {
        deliveredCount++;
      } else if (ord.fulfillmentStatus === "READY") {
        readyCount++;
      } else {
        processingCount++;
      }
    }

    return {
      total: ordersList.length,
      paidCount,
      dueCount,
      totalDueAmount,
      totalOrderValue,
      processingCount,
      readyCount,
      deliveredCount,
    };
  }, [ordersList]);

  // Filtered and Sorted Orders
  const filteredOrders = useMemo(() => {
    let result = [...ordersList];

    // Filter by Tab
    if (statusTab === "PAID") {
      result = result.filter((o) => parseFloat(o.balanceDue) === 0);
    } else if (statusTab === "DUE") {
      result = result.filter((o) => parseFloat(o.balanceDue) > 0);
    } else if (statusTab === "PROCESSING") {
      result = result.filter((o) => o.fulfillmentStatus === "PROCESSING" || o.fulfillmentStatus === "ON_HOLD");
    } else if (statusTab === "READY") {
      result = result.filter((o) => o.fulfillmentStatus === "READY");
    } else if (statusTab === "DELIVERED") {
      result = result.filter((o) => o.fulfillmentStatus === "DELIVERED");
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim().replace(/^#/, "");
      result = result.filter((o) => {
        const orderNum = (o.orderNumber || "").toLowerCase();
        const invNum = (o.invoiceNumber || "").toLowerCase();
        const skusText = o.skus.map((s) => `${s.description} ${s.sku || ""}`).join(" ").toLowerCase();
        return orderNum.includes(q) || invNum.includes(q) || skusText.includes(q);
      });
    }

    // Sort Orders
    if (sortBy === "NEWEST") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "OLDEST") {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "AMOUNT_HIGH") {
      result.sort((a, b) => (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0));
    }

    return result;
  }, [ordersList, statusTab, searchQuery, sortBy]);

  // Client-Side CSV Export (RFC 4180 Compliant with UTF-8 BOM)
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.warning("No orders available to export.");
      return;
    }

    const escapeCSV = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
      }
      return str;
    };

    const headers = [
      "Order Number",
      "Invoice Number",
      "Order Date",
      "Customer Name",
      "Customer Phone",
      "Items Purchased",
      "Total Amount (INR)",
      "Amount Paid (INR)",
      "Balance Due (INR)",
      "Payment Status",
      "Payment Method",
      "Delivery Status",
      "Estimated Delivery",
      "Receipts Count",
      "Invoice Link",
    ];

    const rows = filteredOrders.map((ord) => {
      const isPaid = parseFloat(ord.balanceDue) === 0;
      const paymentStatusText = isPaid ? "PAID" : parseFloat(ord.amountPaid) > 0 ? "PARTIALLY_PAID" : "UNPAID";
      const itemsPurchased = ord.skus
        .map((s) => `${s.quantity}x ${s.description}${s.sku ? ` (${s.sku})` : ""}`)
        .join(" | ");

      const invoiceUrl = `${window.location.origin}/share/invoice/${ord.invoiceId}`;

      return [
        escapeCSV(ord.orderNumber),
        escapeCSV(ord.invoiceNumber),
        escapeCSV(new Date(ord.createdAt).toISOString().split("T")[0]),
        escapeCSV(customer.fullName),
        escapeCSV(customer.phone),
        escapeCSV(itemsPurchased),
        escapeCSV(ord.total),
        escapeCSV(ord.amountPaid),
        escapeCSV(ord.balanceDue),
        escapeCSV(paymentStatusText),
        escapeCSV(ord.paymentMethod || "CASH"),
        escapeCSV(ord.fulfillmentStatus),
        escapeCSV(ord.estimatedDelivery ? ord.estimatedDelivery.split("T")[0] : ""),
        escapeCSV(ord.receipts ? ord.receipts.length.toString() : "0"),
        escapeCSV(invoiceUrl),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedName = customer.fullName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Orders_${sanitizedName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredOrders.length} orders to CSV!`);
  };

  const openQuickEdit = (order: OrderItem) => {
    setSelectedOrder(order);
    setIsQuickEditOpen(true);
  };

  return (
    <div className="space-y-3">
      {/* 04 Header & Telemetry Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-1 bg-[#0a52c3] rounded" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0a52c3]">
            04. Customer Orders & Invoices History ({ordersList.length})
          </h2>
        </div>

        {/* Action Buttons: Export CSV & New Invoice */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs cursor-pointer active:scale-98"
            title="Export customer orders to CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <Link
            href={`/shop/invoices/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.fullName)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0a52c3] hover:bg-[#08429e] transition-all shadow-xs active:scale-98"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Order / Invoice</span>
          </Link>
        </div>
      </div>

      {/* Telemetry Summary Cards / Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
            <p className="text-base font-extrabold text-slate-900">{aggregates.total}</p>
          </div>
          <div className="h-7 w-7 rounded-lg bg-blue-100 text-[#0a52c3] flex items-center justify-center font-bold text-xs">
            {aggregates.total}
          </div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-150 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Fully Paid</p>
            <p className="text-base font-extrabold text-emerald-700">{aggregates.paidCount}</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>

        <div className="bg-blue-50/50 border border-blue-150 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#0a52c3] uppercase tracking-wider">Total Order Value</p>
            <p className="text-base font-extrabold text-slate-900">
              {formatCurrency(aggregates.totalOrderValue)}
            </p>
          </div>
          <div className="text-[11px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-[#0a52c3]">
            {aggregates.total} {aggregates.total === 1 ? "Order" : "Orders"}
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-150 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Fulfillment</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">
              {aggregates.deliveredCount} Delivered · {aggregates.processingCount + aggregates.readyCount} Active
            </p>
          </div>
          <Clock className="h-5 w-5 text-[#0a52c3]" />
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "ALL", label: "All Orders", count: aggregates.total },
            { id: "PAID", label: "Paid", count: aggregates.paidCount },
            { id: "DUE", label: "Dues", count: aggregates.dueCount },
            { id: "PROCESSING", label: "Processing", count: aggregates.processingCount },
            { id: "READY", label: "Ready", count: aggregates.readyCount },
            { id: "DELIVERED", label: "Delivered", count: aggregates.deliveredCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                statusTab === tab.id
                  ? "bg-[#0a52c3] text-white border-[#0a52c3] shadow-xs scale-[1.01]"
                  : "bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded font-extrabold ${
                  statusTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, SKU..."
              className="w-full pl-8 pr-7 py-1 text-xs font-medium rounded-lg border border-slate-200/90 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0a52c3] focus:border-[#0a52c3]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-lg px-2.5 py-1 appearance-none pr-7 focus:outline-none focus:ring-1 focus:ring-[#0a52c3] cursor-pointer"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="AMOUNT_HIGH">Highest Amount</option>
            </select>
            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* High-Density Orders Table */}
      <Card className="border-slate-200/80 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100 tracking-wider">
                <th className="px-4 py-2.5">Order ID</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">SKU Details</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5 text-center">Payment Status</th>
                <th className="px-4 py-2.5 text-center">Delivery Status</th>
                <th className="px-4 py-2.5 text-center">Invoice / Receipts</th>
                <th className="px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const itemsCount = order.skus.reduce((sum, s) => sum + s.quantity, 0);
                  const isFullyPaid = parseFloat(order.balanceDue) === 0;
                  const isDelayed =
                    order.fulfillmentStatus !== "DELIVERED" &&
                    order.estimatedDelivery &&
                    order.estimatedDelivery < new Date().toISOString().split("T")[0];

                  return (
                    <tr
                      key={order.id}
                      onClick={() => openQuickEdit(order)}
                      className="group hover:bg-blue-50/30 transition-colors align-middle cursor-pointer"
                    >
                      {/* Order ID */}
                      <td className="px-4 py-2.5 font-bold text-slate-900 text-xs">
                        <span className="font-mono text-[#0a52c3] group-hover:underline">
                          {order.orderNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-2.5 font-semibold text-slate-600 text-xs whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* SKU Details Dropdown */}
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <SKUDetailsDropdown
                          label={`${itemsCount} SKU${itemsCount !== 1 ? "s" : ""}`}
                          skus={order.skus}
                        />
                      </td>

                      {/* Amount with Balance Due Subtext */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="font-extrabold text-slate-900 text-xs">
                          {formatCurrency(parseFloat(order.total))}
                        </p>
                        {!isFullyPaid && (
                          <p className="text-[10px] font-semibold text-rose-600 mt-0.5">
                            Due: {formatCurrency(parseFloat(order.balanceDue))}
                          </p>
                        )}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isFullyPaid
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : parseFloat(order.amountPaid) > 0
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          }`}
                        >
                          {isFullyPaid
                            ? "PAID"
                            : parseFloat(order.amountPaid) > 0
                            ? "PARTIALLY PAID"
                            : "UNPAID"}
                        </span>
                      </td>

                      {/* Delivery Status Badge */}
                      <td className="px-4 py-2.5 text-center space-y-0.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            order.fulfillmentStatus === "DELIVERED"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : order.isRescheduled
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : order.fulfillmentStatus === "READY"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-blue-50 text-[#2563eb] border-blue-100"
                          }`}
                        >
                          {order.fulfillmentStatus === "DELIVERED"
                            ? "DELIVERED"
                            : order.fulfillmentStatus === "PROCESSING"
                            ? (order.isRescheduled ? "In Processing (Delayed)" : "UNDER PROCESSING")
                            : order.fulfillmentStatus.replace("_", " ")}
                        </span>
                        {isDelayed && (
                          <div className="block">
                            <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-100">
                              DELAYED
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Invoice/Receipt Download/Print link with Dropdown */}
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <ReceiptsDropdown order={order} isFullyPaid={isFullyPaid} />
                      </td>

                      {/* Interactive Action Buttons */}
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {/* 1-Click WhatsApp Button with Menu */}
                          <WhatsAppRowAction
                            order={order}
                            customerPhone={customer.phone}
                            customerName={customer.fullName}
                          />

                          {/* Quick Change Status Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => openQuickEdit(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0a52c3] bg-blue-50 hover:bg-blue-100 border border-blue-200/90 rounded-lg transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            title="Update status, payment, or delivery date"
                          >
                            <SlidersHorizontal className="h-3 w-3 text-[#0a52c3]" />
                            <span>Status</span>
                          </button>

                          {/* Full Edit Order Action Button */}
                          {canEditOrders ? (
                            <Link
                              href={`/shop/orders/${order.id}/edit`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 border border-amber-200/90 rounded-lg transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                              title="Edit Order, Products & Billing"
                            >
                              <Pencil className="h-3 w-3 text-amber-600" />
                              <span>Edit</span>
                            </Link>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-350 bg-slate-50 border border-slate-200/60 rounded-md cursor-not-allowed select-none"
                              title="Permission required to edit orders"
                            >
                              <Lock className="h-2.5 w-2.5 text-slate-350" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                        <Search className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {searchQuery ? "No matching orders found" : "No orders found in this category"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {searchQuery
                          ? `No orders matched "${searchQuery}". Try a different keyword.`
                          : "This customer has no orders recorded under this status filter."}
                      </p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* QuickEditModal Integration */}
      {selectedOrder && (
        <QuickEditModal
          order={selectedOrder}
          isOpen={isQuickEditOpen}
          onClose={() => {
            setIsQuickEditOpen(false);
            setSelectedOrder(null);
            if (onOrderUpdated) {
              onOrderUpdated();
            }
          }}
        />
      )}
    </div>
  );
}
