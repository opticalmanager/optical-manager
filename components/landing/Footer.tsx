import Link from "next/link";
import { Mail, MapPin, Phone, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";

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
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-slate-400 transition-colors hover:text-white"
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
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <FooterLinkColumn title="Product" links={productLinks} />
          <FooterLinkColumn title="Company" links={companyLinks} />
          <FooterLinkColumn title="Resources" links={resourceLinks} />

          {/* Get In Touch */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Get In Touch</h3>
            <ul className="flex flex-col gap-3.5">
              <li>
                <a
                  href="mailto:support@opticalmanager.in"
                  className="flex items-start gap-2.5 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  <Mail className="mt-0.5 size-4 shrink-0" />
                  <span>support@opticalmanager.in</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>New Delhi, India</span>
              </li>
              <li>
                <a
                  href="tel:+918178962366"
                  className="flex items-start gap-2.5 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  <Phone className="mt-0.5 size-4 shrink-0" />
                  <span>+91 81789 62366 (Gaurav Tiwari)</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+917678106554"
                  className="flex items-start gap-2.5 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  <Phone className="mt-0.5 size-4 shrink-0" />
                  <span>+91 76781 06554 (Deepak Mishra)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Icons */}
        <div className="mt-10 flex items-center gap-4">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="flex size-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-blue-600 hover:text-white"
            >
              <social.icon className="size-4" />
            </a>
          ))}
        </div>

        {/* Copyright Bar */}
        <div className="mt-10 border-t border-slate-800 pt-8">
          <p className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Optical Manager. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
