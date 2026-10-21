"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DemoRequestModal from "./DemoRequestModal";
import { InstallAppButton } from "./InstallAppButton";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs py-1.5"
          : "border-b border-slate-100 bg-white/80 backdrop-blur-md py-2"
      }`}
    >
      <nav className="mx-auto flex h-13 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Authentic Optical Manager Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center justify-center relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/80 border border-blue-100/90 shadow-2xs p-1"
          >
            <Image
              src="/logo.svg"
              alt="Optical Manager Logo"
              width={32}
              height={32}
              priority
              className="w-full h-full object-contain"
            />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
              Optical Manager
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider -mt-0.5 hidden sm:block">
              Clinical POS &amp; CRM
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links with Floating Active Pill */}
        <ul className="hidden items-center gap-1 md:flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          {navLinks.map((link, idx) => (
            <li key={link.href} className="relative">
              <a
                href={link.href}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative z-10 block rounded-lg px-3.5 py-1 text-xs font-bold text-slate-650 transition-colors hover:text-slate-900"
              >
                {link.label}
              </a>
              {hoveredIdx === idx && (
                <motion.div
                  layoutId="navbar-hover-pill"
                  className="absolute inset-0 z-0 rounded-lg bg-white shadow-2xs border border-slate-200/80"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </li>
          ))}
        </ul>

        {/* Desktop Auth Buttons */}
        <div className="hidden items-center gap-2.5 md:flex">
          <InstallAppButton variant="navbar" />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-xs font-bold text-slate-750 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl px-3.5 h-8.5"
            )}
          >
            Sign In
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setIsDemoModalOpen(true)}
              className="relative overflow-hidden px-3.5 py-1.5 h-8.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="size-3.5 text-blue-200" />
              <span>Request Access</span>
            </Button>
          </motion.div>
        </div>

        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-xl border border-slate-200 h-9 w-9"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5 text-slate-700" />
        </Button>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 p-1 flex items-center justify-center">
              <Image
                src="/logo.svg"
                alt="Optical Manager Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-base font-extrabold text-slate-900">
              Optical Manager
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="rounded-lg h-8 w-8"
          >
            <X className="size-4.5 text-slate-500" />
          </Button>
        </div>

        {/* Mobile Nav Links */}
        <ul className="flex flex-col gap-1 px-4 py-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile Auth Buttons */}
        <div className="mt-auto flex flex-col gap-2.5 border-t border-slate-100 px-5 py-5 bg-slate-50/50">
          <InstallAppButton variant="navbar" className="w-full justify-center py-2" />
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "w-full justify-center text-xs font-bold rounded-xl border-slate-200 h-9.5"
            )}
          >
            Sign In
          </Link>
          <Button
            onClick={() => {
              setMobileOpen(false);
              setIsDemoModalOpen(true);
            }}
            className="w-full h-10 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
          >
            Request Access
          </Button>
        </div>
      </div>

      <DemoRequestModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </header>
  );
}
