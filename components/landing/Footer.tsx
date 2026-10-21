"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, Twitter, Facebook, Instagram, Linkedin, ArrowUp, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const productLinks = [
  { label: "Overview", href: "/#about" },
  { label: "Smart Billing & POS", href: "/#features" },
  { label: "Thermal Barcode Engine", href: "/#features" },
  { label: "Rx Diopter Tracking", href: "/#about" },
  { label: "Inventory Ledger", href: "/#features" },
  { label: "Pricing Plans", href: "/#pricing" },
];

const companyLinks = [
  { label: "About Optical Manager", href: "/#about" },
  { label: "Customer Reviews", href: "/#stats" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Security Architecture", href: "/#about" },
];

const portalLinks = [
  { label: "Store Sign In", href: "/login" },
  { label: "Owner Dashboard", href: "/login" },
  { label: "Create Account", href: "/signup" },
  { label: "Book Live Demo", href: "/#contact" },
  { label: "Support Desk", href: "/#contact" },
];

const socialLinks = [
  { label: "Twitter / X", icon: Twitter, href: "https://twitter.com" },
  { label: "Facebook", icon: Facebook, href: "https://facebook.com" },
  { label: "Instagram", icon: Instagram, href: "https://instagram.com" },
  { label: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/company/optical-manager/about/" },
];

const trustBadges = [
  { label: "Indian GST Multi-Rate Compliant", icon: ShieldCheck },
  { label: "TSC & Zebra 81×12mm Dumbbell Native", icon: Zap },
  { label: "Automated WhatsApp Cloud Receipts", icon: Sparkles },
];

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span>{title}</span>
      </h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-xs font-medium text-slate-400 transition-all hover:text-white hover:translate-x-0.5 inline-block"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden border-t border-slate-800/80">
      {/* Precision Continuous Dark Grid Texture Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-25 pointer-events-none" />

      {/* Top Specular Gradient Highlight Hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      {/* Subtle Ambient Radial Light Bloom */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[46rem] h-[14rem] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Brand & Live System Status Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-10 border-b border-slate-800/80 mb-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/20 to-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shadow-lg shadow-blue-900/10 shrink-0">
              <Image
                src="/logo.svg"
                alt="Optical Manager Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white block">
                  Optical Manager
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Cloud POS
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                All-in-One Software for Independent &amp; Chain Optical Showrooms
              </span>
            </div>
          </div>

          {/* Right: Live Cloud Status & Socials */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Live Operational Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-300 shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-mono tracking-tight text-emerald-400">Cloud Sync Active</span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400 font-mono">99.9% Uptime</span>
            </div>

            {/* Social Icons with Spring Physics */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex size-8.5 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 transition-all hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-600/30"
                >
                  <social.icon className="size-3.5" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        {/* Trust Capability Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-10 border-b border-slate-800/80 mb-10">
          {trustBadges.map((badge, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/50 border border-slate-800/60 text-slate-300 text-xs font-medium"
            >
              <badge.icon className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{badge.label}</span>
            </div>
          ))}
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <FooterLinkColumn title="Product Capabilities" links={productLinks} />
          <FooterLinkColumn title="Company & Trust" links={companyLinks} />
          <FooterLinkColumn title="Direct Portals" links={portalLinks} />

          {/* Direct Technical & Leadership Contacts */}
          <div>
            <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Direct Contacts</span>
            </h3>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="mailto:support@opticalmanager.in"
                  className="flex items-start gap-2.5 text-xs text-slate-400 transition-colors hover:text-white font-medium group"
                >
                  <Mail className="mt-0.5 size-3.5 shrink-0 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>support@opticalmanager.in</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-400 font-medium">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
                <span>New Delhi, India</span>
              </li>
              <li>
                <a
                  href="https://wa.me/918178962366"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-xs text-slate-400 transition-colors hover:text-white font-medium group"
                >
                  <Phone className="mt-0.5 size-3.5 shrink-0 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>+91 81789 62366 (Gaurav Tiwari)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/917678106554"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-xs text-slate-400 transition-colors hover:text-white font-medium group"
                >
                  <Phone className="mt-0.5 size-3.5 shrink-0 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>+91 76781 06554 (Deepak Mishra)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Scroll to Top Bar */}
        <div className="mt-12 border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Optical Manager. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <p className="text-[11px] text-slate-500">Built with precision for Indian optical retail &amp; clinics 🇮🇳</p>
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-900 border border-slate-800/60"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="w-3 h-3 text-blue-400" />
              <span>Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
