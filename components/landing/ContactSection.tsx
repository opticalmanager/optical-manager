"use client";

import { useState, useTransition } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitContactInquiryAction } from "@/actions/contact.actions";

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
    <section id="contact" className="py-20 lg:py-28 bg-slate-50/70 border-t border-slate-200/60 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">Get In Touch</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-main">Contact Our Team</h2>
          <p className="mt-4 text-text-muted max-w-2xl mx-auto text-base">
            Have questions about Optical Manager, need a live demonstration, or want to discuss enterprise store onboarding? Connect directly with our core leadership.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Direct Contacts & Office Info */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-text-main border-b border-slate-100 pb-4">
                Corporate Details
              </h3>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-main">Headquarters Location</h4>
                  <p className="text-sm text-text-muted mt-0.5">New Delhi, India</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-main">Official Support Email</h4>
                  <a
                    href="mailto:support@opticalmanager.in"
                    className="text-sm text-primary hover:underline font-medium break-all"
                  >
                    support@opticalmanager.in
                  </a>
                </div>
              </div>
            </div>

            {/* Founders & Leadership Team */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
                Executive Leadership
              </h3>

              {/* Gaurav Tiwari */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center shrink-0 text-sm">
                    GT
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main">Gaurav Tiwari</h4>
                    <p className="text-xs font-medium text-blue-700">Co-Founder & Head of Technology</p>
                    <p className="text-[11px] text-text-muted">System Architecture & Engineering</p>
                  </div>
                </div>
                <a
                  href="tel:+918178962366"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-slate-200 text-xs font-semibold text-text-main transition-colors shrink-0"
                >
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>+91 81789 62366</span>
                </a>
              </div>

              {/* Deepak Mishra */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center shrink-0 text-sm">
                    DM
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main">Deepak Mishra</h4>
                    <p className="text-xs font-medium text-indigo-700">Co-Founder & Head of Research & Product UI/UX</p>
                    <p className="text-[11px] text-text-muted">Domain Research & User Experience</p>
                  </div>
                </div>
                <a
                  href="tel:+917678106554"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-slate-200 text-xs font-semibold text-text-main transition-colors shrink-0"
                >
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>+91 76781 06554</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form connected to Server Action */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-10 border border-slate-200/80 shadow-md">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-text-main">Message Delivered!</h3>
                <p className="text-text-muted max-w-md mx-auto text-sm leading-relaxed">
                  Thank you for contacting Optical Manager. Gaurav Tiwari (Head of Tech) and Deepak Mishra (Head of Research & UI/UX) have received your message and will respond within 24 hours.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  className="mt-4"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xl font-bold text-text-main mb-2">Send Us an Inquiry</h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="contact-name" className="text-xs font-semibold text-text-main">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-phone" className="text-xs font-semibold text-text-main">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="contact-email" className="text-xs font-semibold text-text-main">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      placeholder="name@opticalstore.com"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-shop" className="text-xs font-semibold text-text-main">
                      Shop / Business Name
                    </label>
                    <input
                      id="contact-shop"
                      name="shopName"
                      type="text"
                      placeholder="e.g. Vision Care Opticals"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact-message" className="text-xs font-semibold text-text-main">
                    Message / Inquiry Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={4}
                    placeholder="Tell us how we can assist your optical practice or business..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                  ></textarea>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto px-8 py-2.5 font-bold shadow-md shadow-primary/20 gap-2"
                >
                  {isPending ? (
                    "Submitting Inquiry..."
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
