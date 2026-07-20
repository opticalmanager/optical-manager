"use client";

import React, { useState } from "react";
import { X, Sparkles, CheckCircle2, Store, Phone, Mail, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitDemoRequest } from "@/actions/demo-request.actions";

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoRequestModal({ isOpen, onClose }: DemoRequestModalProps) {
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const res = await submitDemoRequest({
      storeName,
      ownerName,
      email,
      phone,
      city,
    });

    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      setStoreName("");
      setOwnerName("");
      setEmail("");
      setPhone("");
      setCity("");
    } else {
      setErrorMsg(res.error || "Failed to submit request.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 text-slate-800 shadow-2xl relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-1.5 border-b border-slate-100 pb-4 pr-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563eb] text-[11px] font-bold border border-blue-100">
            <Sparkles className="h-3.5 w-3.5" /> 14-DAY FREE CLINICAL ACCESS
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Request Store Access & Live Demo
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            Fill in your optical store details. Our clinical tech team will contact you on WhatsApp to activate your 14-day trial.
          </p>
        </div>

        {isSuccess ? (
          <div className="py-6 text-center space-y-3 animate-in fade-in">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              Access Request Submitted!
            </h3>
            <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto leading-relaxed">
              Thank you! Our clinical software team will call/WhatsApp you shortly to complete your store setup and demo.
            </p>
            <Button
              onClick={onClose}
              className="h-9 px-6 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl cursor-pointer shadow-xs mt-2"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Optical Store Name</label>
                <div className="relative flex items-center">
                  <Store className="absolute left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Sarita Vihar Optics"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Owner / Contact Name</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Mobile Number (WhatsApp)</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@store.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">City / State</label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New Delhi, Delhi"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 text-xs font-extrabold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl cursor-pointer shadow-md shadow-blue-500/20 transition-all mt-2"
            >
              {isSubmitting ? "Submitting Request..." : "Request 14-Day Free Access"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
