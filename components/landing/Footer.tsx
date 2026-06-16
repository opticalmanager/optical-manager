import { Mail, MapPin, Phone, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";

const productLinks = [
  { label: "Home", href: "#" },
  { label: "Products", href: "#features" },
  { label: "Brand", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const companyLinks = [
  { label: "About Us", href: "#about" },
  { label: "Companies", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Optical Manager", href: "#" },
];

const resourceLinks = [
  { label: "Blog", href: "#" },
  { label: "Resources", href: "#" },
  { label: "Contact Us", href: "#contact" },
];

const socialLinks = [
  { label: "Twitter", icon: Twitter, href: "#" },
  { label: "Facebook", icon: Facebook, href: "#" },
  { label: "Instagram", icon: Instagram, href: "#" },
  { label: "LinkedIn", icon: Linkedin, href: "#" },
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
            <a
              href={link.href}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
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
            <h3 className="mb-4 text-lg font-semibold text-white">
              Get In Touch
            </h3>
            <ul className="flex flex-col gap-3.5">
              <li>
                <a
                  href="mailto:opticalmanager@gmail.com"
                  className="flex items-start gap-2.5 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  <Mail className="mt-0.5 size-4 shrink-0" />
                  <span>opticalmanager@gmail.com</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>Narsapur, Telangana, India</span>
              </li>
              <li>
                <a
                  href="tel:+917416106064"
                  className="flex items-start gap-2.5 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  <Phone className="mt-0.5 size-4 shrink-0" />
                  <span>+91 74161 06064</span>
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
            © 2025 Optical Manager. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
