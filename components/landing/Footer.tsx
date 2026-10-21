"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { motion } from "framer-motion";

const productLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", href: "/#about" },
];

const companyLinks = [
  { label: "About Us", href: "/#about" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
];

const resourceLinks = [
  { label: "Overview", href: "/#about" },
  { label: "Contact Us", href: "/#contact" },
  { label: "Sign In", href: "/login" },
  { label: "Get Started", href: "/signup" },
];

const socialLinks = [
  { label: "Twitter", icon: Twitter, href: "https://twitter.com" },
  { label: "Facebook", icon: Facebook, href: "https://facebook.com" },
  { label: "Instagram", icon: Instagram, href: "https://instagram.com" },
  { label: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/company/optical-manager/about/" },
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
      <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-300">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
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
  return (
    <footer className="bg-slate-950 text-white relative border-t border-slate-800">
      {/* Top subtle highlight line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Brand Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-10 border-b border-slate-800/80 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 p-1.5 flex items-center justify-center">
              <Image
                src="/logo.svg"
                alt="Optical Manager Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">
                Optical Manager
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                Operating System for Independent &amp; Chain Optical Showrooms
              </span>
            </div>
          </div>

          {/* Social Icons with micro-hover spring */}
          <div className="flex items-center gap-2.5">
            {socialLinks.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                whileHover={{ scale: 1.12, y: -2 }}
                whileTap={{ scale: 0.92 }}
                className="flex size-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 transition-colors hover:bg-blue-600 hover:text-white hover:border-blue-500"
              >
                <social.icon className="size-3.5" />
              </motion.a>
            ))}
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <FooterLinkColumn title="Product" links={productLinks} />
          <FooterLinkColumn title="Company" links={companyLinks} />
          <FooterLinkColumn title="Resources" links={resourceLinks} />

          {/* Get In Touch */}
          <div>
            <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-300">Get In Touch</h3>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="mailto:support@opticalmanager.in"
                  className="flex items-start gap-2.5 text-xs text-slate-400 transition-colors hover:text-white font-medium"
                >
                  <Mail className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
                  <span>support@opticalmanager.in</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-400 font-medium">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
                <span>New Delhi, India</span>
              </li>
              <li>
                <a
                  href="tel:+918178962366"
                  className="flex items-start gap-2.5 text-xs text-slate-400 transition-colors hover:text-white font-medium"
                >
                  <Phone className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
                  <span>+91 81789 62366 (Gaurav Tiwari)</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+917678106554"
                  className="flex items-start gap-2.5 text-xs text-slate-400 transition-colors hover:text-white font-medium"
                >
                  <Phone className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
                  <span>+91 76781 06554 (Deepak Mishra)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-12 border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Optical Manager. All rights reserved.</p>
          <p className="text-[11px] text-slate-600">Built for precision optical healthcare &amp; retail.</p>
        </div>
      </div>
    </footer>
  );
}
