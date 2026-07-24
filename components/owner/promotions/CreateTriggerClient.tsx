"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Check, 
  ChevronDown, 
  Gift, 
  ShoppingBag, 
  Calendar, 
  RefreshCw, 
  Plus, 
  MessageSquare, 
  HelpCircle, 
  ExternalLink,
  Info,
  Loader2,
  Sparkles
} from "lucide-react";
import { createTriggerAction } from "@/actions/promotion.actions";
import { toast } from "sonner";

export function CreateTriggerClient() {
  const router = useRouter();

  // Form states
  const [selectedEvent, setSelectedEvent] = useState<"BIRTHDAY" | "PURCHASE" | "APPOINTMENT" | "RE_ENGAGEMENT">("BIRTHDAY");
  const [timingValue, setTimingValue] = useState<number>(1);
  const [timingUnit, setTimingUnit] = useState<string>("Day");
  const [timingDirection, setTimingDirection] = useState<string>("Before");
  const [triggerTime, setTriggerTime] = useState<string>("09:00 AM");
  const [triggerName, setTriggerName] = useState<string>("Birthday Wishes Trigger");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("Birthday Wishes Template");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template preview definitions
  const templatesMap: Record<string, { body: string; variables: Array<{ key: string; name: string }> }> = {
    "Birthday Wishes Template": {
      body: `Hi {{1}} 🥳

Wishing you a very Happy Birthday! 🎉

May your day be filled with happiness and clarity (perfect vision 😊).

Here's a special gift just for you!

Use code: *BIRTHDAY20*

Get 20% OFF on your next purchase. Valid till {{2}}.

Have a great day!
— Team The Optika`,
      variables: [
        { key: "{{1}}", name: "Customer Name" },
        { key: "{{2}}", name: "Coupon Expiry Date" },
      ],
    },
    "Thank You & Review Request": {
      body: `Dear {{1}},

Thank you for purchasing your spectacles with {{2}}! 👓

We hope you love your new frames & lenses.

Please share your feedback or Google review here:
{{3}}

Have a wonderful day!
— Team The Optika`,
      variables: [
        { key: "{{1}}", name: "Customer Name" },
        { key: "{{2}}", name: "Store Branch" },
        { key: "{{3}}", name: "Review Link" },
      ],
    },
    "Appointment Reminder Template": {
      body: `Hi {{1}} 👋

This is a friendly reminder for your upcoming Eye Consultation on {{2}} at {{3}} with {{4}}.

Location: Main Optometry Clinic.

Please reply 1 to confirm your slot.
— Team The Optika`,
      variables: [
        { key: "{{1}}", name: "Customer Name" },
        { key: "{{2}}", name: "Date" },
        { key: "{{3}}", name: "Time" },
        { key: "{{4}}", name: "Optometrist Name" },
      ],
    },
  };

  const currentTemplate = templatesMap[selectedTemplate] || templatesMap["Birthday Wishes Template"];

  const handleEventChange = (event: "BIRTHDAY" | "PURCHASE" | "APPOINTMENT" | "RE_ENGAGEMENT") => {
    setSelectedEvent(event);
    switch (event) {
      case "BIRTHDAY":
        setTriggerName("Birthday Wishes Trigger");
        setSelectedTemplate("Birthday Wishes Template");
        setTimingDirection("Before");
        break;
      case "PURCHASE":
        setTriggerName("Post Purchase Follow-up Trigger");
        setSelectedTemplate("Thank You & Review Request");
        setTimingDirection("After");
        break;
      case "APPOINTMENT":
        setTriggerName("Appointment Reminder Trigger");
        setSelectedTemplate("Appointment Reminder Template");
        setTimingDirection("Before");
        break;
      case "RE_ENGAGEMENT":
        setTriggerName("Customer Re-engagement Offer");
        setSelectedTemplate("Birthday Wishes Template");
        setTimingDirection("After");
        break;
    }
  };

  const handleActivate = async () => {
    if (!triggerName.trim()) {
      toast.error("Please enter a trigger name");
      return;
    }

    setIsSubmitting(true);
    const res = await createTriggerAction({
      name: triggerName,
      event: selectedEvent,
      timingValue,
      timingUnit,
      timingDirection,
      triggerTime,
      templateName: selectedTemplate,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success("Trigger activated successfully!");
      router.push("/owner/promotions?tab=triggers");
    } else {
      toast.error(res.error || "Failed to create trigger");
    }
  };

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto pb-12">
      {/* TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/owner/promotions?tab=triggers"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2563eb] hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Triggers</span>
          </Link>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Create New Trigger
          </h2>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              toast.success("Draft saved successfully");
              router.push("/owner/promotions?tab=triggers");
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-all"
          >
            Save as Draft
          </button>

          <button
            onClick={handleActivate}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Activating...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Activate Trigger</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2-COLUMN WIZARD: FORM (Left 7 cols) + REAL-TIME WHATSAPP PREVIEW (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT FORM PANEL */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: 1. Set Condition */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">1. Set Condition</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Define the event and conditions that will activate this trigger.
              </p>
            </div>

            {/* Select Event Cards */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Select Event (Trigger)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Event 1: Birthday */}
                <div
                  onClick={() => handleEventChange("BIRTHDAY")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedEvent === "BIRTHDAY"
                      ? "border-[#2563eb] bg-blue-50/40 ring-1 ring-[#2563eb]/30 shadow-2xs"
                      : "border-slate-200/80 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <Gift className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Birthday</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Trigger when it&apos;s customer&apos;s birthday</p>
                  </div>
                </div>

                {/* Event 2: Purchase */}
                <div
                  onClick={() => handleEventChange("PURCHASE")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedEvent === "PURCHASE"
                      ? "border-[#2563eb] bg-blue-50/40 ring-1 ring-[#2563eb]/30 shadow-2xs"
                      : "border-slate-200/80 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <ShoppingBag className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Post Purchase</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Follow up after spectacle purchase</p>
                  </div>
                </div>

                {/* Event 3: Appointment */}
                <div
                  onClick={() => handleEventChange("APPOINTMENT")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedEvent === "APPOINTMENT"
                      ? "border-[#2563eb] bg-blue-50/40 ring-1 ring-[#2563eb]/30 shadow-2xs"
                      : "border-slate-200/80 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold shrink-0">
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Appointment Reminder</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Remind before eye consultation</p>
                  </div>
                </div>

                {/* Event 4: Re-engagement */}
                <div
                  onClick={() => handleEventChange("RE_ENGAGEMENT")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedEvent === "RE_ENGAGEMENT"
                      ? "border-[#2563eb] bg-blue-50/40 ring-1 ring-[#2563eb]/30 shadow-2xs"
                      : "border-slate-200/80 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <RefreshCw className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Re-engagement Offer</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Send offer to inactive patients</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trigger Timing Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Trigger Timing
              </label>
              <p className="text-xs text-slate-500 font-medium">When should the trigger run relative to the event?</p>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={timingValue}
                  onChange={(e) => setTimingValue(parseInt(e.target.value) || 1)}
                  className="w-16 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 text-center focus:outline-none focus:border-[#2563eb]"
                />

                <select
                  value={timingUnit}
                  onChange={(e) => setTimingUnit(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="Day">Day(s)</option>
                  <option value="Hour">Hour(s)</option>
                  <option value="Week">Week(s)</option>
                </select>

                <select
                  value={timingDirection}
                  onChange={(e) => setTimingDirection(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="Before">Before</option>
                  <option value="After">After</option>
                </select>

                <span className="text-xs font-bold text-slate-600">the {selectedEvent.toLowerCase()}</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs font-medium text-slate-700 flex items-start gap-2 mt-2">
                <Info className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
                <span>
                  Message will be sent <strong>{timingValue} {timingUnit.toLowerCase()}(s) {timingDirection.toLowerCase()}</strong> the customer&apos;s {selectedEvent.toLowerCase()} at <strong>{triggerTime}</strong>.
                </span>
              </div>
            </div>

            {/* Trigger Time Dropdown */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Trigger Time
              </label>
              <select
                value={triggerTime}
                onChange={(e) => setTriggerTime(e.target.value)}
                className="w-full sm:w-64 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#2563eb]"
              >
                <option value="08:00 AM">08:00 AM</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="06:00 PM">06:00 PM</option>
              </select>
            </div>

            {/* Optional Additional Conditions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Additional Conditions (Optional)
              </label>
              <button
                type="button"
                onClick={() => toast.info("Additional filter conditions option unlocked")}
                className="w-full p-3 rounded-xl border border-dashed border-slate-300 hover:border-[#2563eb] text-xs font-extrabold text-[#2563eb] hover:bg-blue-50/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Condition</span>
              </button>
            </div>

            {/* Trigger Name */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Trigger Name
              </label>
              <input
                type="text"
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563eb]"
                placeholder="Give a name to identify this trigger"
              />
            </div>
          </div>
        </div>

        {/* RIGHT STICKY PREVIEW PANEL (REAL-TIME WHATSAPP PHONE MOCKUP) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Template Preview</h3>
                <p className="text-xs text-slate-500 font-medium">This template will be sent when activated.</p>
              </div>
            </div>

            {/* Template Selector Dropdown */}
            <div className="space-y-1.5">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#2563eb]"
              >
                <option value="Birthday Wishes Template">Birthday Wishes Template</option>
                <option value="Thank You & Review Request">Thank You & Review Request</option>
                <option value="Appointment Reminder Template">Appointment Reminder Template</option>
              </select>
            </div>

            {/* WHATSAPP PHONE FRAME MOCKUP */}
            <div className="rounded-2xl border-4 border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
              {/* WhatsApp Header Bar (Dark WhatsApp Green) */}
              <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                  TO
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold tracking-tight">The Optika</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-400 text-slate-950 text-[9px] font-black flex items-center justify-center">✓</span>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-200 block -mt-0.5">Online</span>
                </div>
              </div>

              {/* Chat Bubble Body (WhatsApp Light Green Pattern Background) */}
              <div className="bg-[#efeae2] p-4 min-h-[300px] flex flex-col justify-end text-xs">
                <div className="bg-white p-3.5 rounded-2xl rounded-tl-xs shadow-md border border-slate-200/50 space-y-2 max-w-[92%] relative">
                  <p className="text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                    {currentTemplate.body}
                  </p>
                  <div className="text-[9px] text-slate-400 font-bold text-right">
                    11:30 AM ✓✓
                  </div>
                </div>
              </div>
            </div>

            {/* Template Variables Table */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Template Variables</h4>

              <div className="space-y-1.5 text-xs">
                {currentTemplate.variables.map((v) => (
                  <div key={v.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-slate-800 font-medium">
                    <span className="font-mono text-[#2563eb] font-bold">{v.key}</span>
                    <span className="font-semibold text-slate-600">{v.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Banner */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-2 text-[#2563eb] font-extrabold">
                <Info className="w-4 h-4" />
                <span>About Triggers</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Triggers help you automate WhatsApp messages based on customer events and conditions.
              </p>
              <a href="/owner/support" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563eb] hover:underline pt-1">
                <span>Learn more about triggers</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
