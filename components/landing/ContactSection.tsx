"use client";

import { useState, useTransition } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle2, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitContactInquiryAction } from "@/actions/contact.actions";
import { FadeIn, TiltCard } from "./motion";
import { motion } from "framer-motion";

export default function ContactSection() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await submitContactInquiryAction(formData);
      if (res.success) {
        setSubmitted(true);
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <section id="contact" className="py-20 lg:py-28 bg-transparent relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn direction="up" className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 mb-3 shadow-2xs">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
              Direct Connection
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-slate-900 tracking-tight">
            Contact Our Engineering &amp; Product Team
          </h2>
          <p className="mt-3.5 text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
            Have questions about Optical Manager, need a live demonstration, or want to discuss enterprise store onboarding? Connect directly with our core leadership.
          </p>
        </FadeIn>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Direct Contacts & Office Info */}
          <div className="lg:col-span-5 space-y-6">
            <FadeIn direction="right" delay={0.1}>
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
                <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <span>Corporate Details</span>
                </h3>
                
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Headquarters Location</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">New Delhi, India</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Official Support Email</h4>
                    <a
                      href="mailto:support@opticalmanager.in"
                      className="text-xs text-blue-600 hover:underline font-bold break-all"
                    >
                      support@opticalmanager.in
                    </a>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Founders & Leadership Team */}
            <div className="space-y-3.5">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
                Executive Leadership
              </h3>

              {/* Gaurav Tiwari */}
              <FadeIn direction="right" delay={0.2}>
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 text-xs border border-blue-200">
                      GT
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Gaurav Tiwari</h4>
                      <p className="text-[11px] font-bold text-blue-700">Co-Founder &amp; Head of Technology</p>
                      <p className="text-[10px] text-slate-400 font-medium">System Architecture &amp; Engineering</p>
                    </div>
                  </div>
                  <a
                    href="tel:+918178962366"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-bold text-slate-800 transition-colors shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>+91 81789 62366</span>
                  </a>
                </div>
              </FadeIn>

              {/* Deepak Mishra */}
              <FadeIn direction="right" delay={0.3}>
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0 text-xs border border-indigo-200">
                      DM
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Deepak Mishra</h4>
                      <p className="text-[11px] font-bold text-indigo-700">Co-Founder &amp; Head of UI/UX</p>
                      <p className="text-[10px] text-slate-400 font-medium">Domain Research &amp; User Experience</p>
                    </div>
                  </div>
                  <a
                    href="tel:+917678106554"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-bold text-slate-800 transition-colors shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>+91 76781 06554</span>
                  </a>
                </div>
              </FadeIn>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <FadeIn direction="left" delay={0.2}>
              <div className="bg-white rounded-2xl p-6 sm:p-9 border border-slate-200/90 shadow-sm">
                {submitted ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900">Message Delivered!</h3>
                    <p className="text-slate-500 max-w-md mx-auto text-xs sm:text-sm leading-relaxed font-medium">
                      Thank you for contacting Optical Manager. Gaurav Tiwari (Head of Tech) and Deepak Mishra (Head of UI/UX) have received your message and will respond promptly.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                      className="mt-3 text-xs font-bold rounded-xl"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-lg font-extrabold text-slate-900">Send Us an Inquiry</h3>
                      <p className="text-xs text-slate-500 font-medium">Fill in your requirements and our team will get in touch directly.</p>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label htmlFor="contact-name" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          Your Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="contact-phone" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label htmlFor="contact-email" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="contact-shop" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          Shop / Business Name
                        </label>
                        <input
                          id="contact-shop"
                          name="shopName"
                          type="text"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="contact-message" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Message / Inquiry Details <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all resize-none"
                      ></textarea>
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full sm:w-auto px-6 py-2.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 gap-2 cursor-pointer"
                    >
                      {isPending ? (
                        "Submitting Inquiry..."
                      ) : (
                        <>
                          <span>Submit Inquiry</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
