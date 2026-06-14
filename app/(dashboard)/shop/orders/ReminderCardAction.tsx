"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendPaymentReminderAction, updateDeliveryDaysAction } from "@/actions/order.actions";

interface ReminderCardActionProps {
  invoiceId: string;
  type: "payment" | "delivery";
}

export function ReminderCardAction({ invoiceId, type }: ReminderCardActionProps) {
  const [isPending, startTransition] = useTransition();

  const handleSendReminder = () => {
    const toastId = toast.loading("Sending payment reminder email...");
    startTransition(async () => {
      try {
        const res = await sendPaymentReminderAction(invoiceId);
        if (res.success) {
          toast.success(res.message, { id: toastId });
        } else {
          toast.error(res.message, { id: toastId });
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to send reminder email.", { id: toastId });
      }
    });
  };

  const handleUpdateDelivery = () => {
    const daysStr = prompt("Enter expected delivery days from today (0 = Delivered):");
    if (daysStr === null) return;
    
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 0) {
      toast.error("Please enter a valid non-negative number of days.");
      return;
    }

    const toastId = toast.loading("Updating expected delivery estimation...");
    startTransition(async () => {
      try {
        const res = await updateDeliveryDaysAction(invoiceId, days);
        if (res.success) {
          toast.success(res.message, { id: toastId });
        } else {
          toast.error(res.message, { id: toastId });
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update delivery timeline.", { id: toastId });
      }
    });
  };

  if (type === "payment") {
    return (
      <Button
        disabled={isPending}
        onClick={handleSendReminder}
        className="text-xs font-black uppercase bg-rose-600 hover:bg-rose-700 text-white rounded-lg h-8 px-4 cursor-pointer shrink-0 transition-colors border-none"
      >
        {isPending ? "Sending..." : "Send Reminder"}
      </Button>
    );
  }

  return (
    <Button
      disabled={isPending}
      onClick={handleUpdateDelivery}
      variant="outline"
      className="text-xs font-black uppercase border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg h-8 px-4 cursor-pointer shrink-0 bg-white transition-colors"
    >
      {isPending ? "Updating..." : "Update Delivery Estimation"}
    </Button>
  );
}
