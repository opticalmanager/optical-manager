"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Glasses, Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DemoRequestModal from "./DemoRequestModal";

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
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? "border-slate-100 bg-white/80 backdrop-blur-lg shadow-sm shadow-slate-100/40"
          : "border-transparent bg-white"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Glasses className="size-7 text-primary" />
          <span className="text-xl font-bold text-text-main">
            Optical Manager
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text-main"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop Auth Buttons */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "default" }))}
          >
            Login
          </Link>
          <Button
            onClick={() => setIsDemoModalOpen(true)}
            className="px-4 py-2 text-sm font-semibold cursor-pointer"
          >
            Request Access
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <Glasses className="size-6 text-primary" />
            <span className="text-lg font-bold text-text-main">
              Optical Manager
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Mobile Nav Links */}
        <ul className="flex flex-col gap-1 px-3 py-4">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text-main"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile Auth Buttons */}
        <div className="mt-auto flex flex-col gap-2 border-t border-border px-4 py-4">
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "w-full justify-center"
            )}
          >
            Login
          </Link>
          <Button
            onClick={() => {
              setMobileOpen(false);
              setIsDemoModalOpen(true);
            }}
            className="w-full h-11 text-sm font-semibold cursor-pointer"
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
