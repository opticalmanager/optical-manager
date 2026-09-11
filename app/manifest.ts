import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Optical Manager — Desktop POS & Store Terminal",
    short_name: "Optical Manager",
    description: "Desktop Operating System for Optical Stores. Offline POS billing, patient prescriptions, and inventory management.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#f8fafc",
    theme_color: "#0a52c3",
    orientation: "landscape-primary",
    prefer_related_applications: false,
    categories: ["business", "productivity", "medical"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/optical-manager%20logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "New Billing Invoice",
        short_name: "New Bill",
        description: "Quick POS billing checkout",
        url: "/shop/invoices/new",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Patient Directory",
        short_name: "Patients",
        description: "Search customer clinical database",
        url: "/shop/customers",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Stock Inventory",
        short_name: "Inventory",
        description: "View optical products and stock",
        url: "/shop/inventory",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/landing/dashboard-preview.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Optical Manager Desktop POS & Store Terminal",
      },
      {
        src: "/landing/feature-billing.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Instant Tax Invoicing and Optical Prescription Management",
      },
    ],
  };
}
