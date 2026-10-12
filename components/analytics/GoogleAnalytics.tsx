import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-8C5QB8TZ1E";

/**
 * Google Analytics 4 (GA4) integration using Next.js Script component.
 * Uses strategy="afterInteractive" to load asynchronously after the page is hydrated,
 * ensuring zero impact on first contentful paint (FCP) and POS terminal responsiveness.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}

/**
 * Helper to dispatch custom events to Google Analytics 4 (GA4).
 * Safe to call from any client component without throwing errors if GA is blocked or loading.
 */
export function sendGAEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
    (window as any).gtag("event", eventName, eventParams);
  }
}
