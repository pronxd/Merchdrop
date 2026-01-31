'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Derive production domain from env at module level (available client-side via NEXT_PUBLIC_ prefix)
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
const prodDomain = (() => {
  try { return baseUrl ? new URL(baseUrl).hostname : ''; } catch { return ''; }
})();

export default function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const pathname = usePathname();
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Only track on production domains
    const hostname = window.location.hostname;
    const isProd = prodDomain ? (hostname === prodDomain || hostname === `www.${prodDomain}`) : false;
    setIsProduction(isProd);
  }, []);

  // Only render if website ID is configured
  if (!websiteId) {
    return null;
  }

  // Don't track localhost or development
  if (!isProduction) {
    return null;
  }

  // Don't track admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <Script
      async
      src="https://censorly-analytics.vercel.app/script.js"
      data-website-id={websiteId}
      data-auto-track="true"
      data-do-not-track="false"
      data-domains={prodDomain ? `${prodDomain},www.${prodDomain}` : undefined}
      strategy="afterInteractive"
    />
  );
}
