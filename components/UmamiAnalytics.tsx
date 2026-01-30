'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const pathname = usePathname();
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Only track on production domains (kassycakes.com)
    const hostname = window.location.hostname;
    const isProd =
      hostname === 'kassycakes.com' ||
      hostname === 'www.kassycakes.com';
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
  if (pathname?.startsWith('/kassyadmin') || pathname?.startsWith('/kassycakes')) {
    return null;
  }

  return (
    <Script
      async
      src="https://censorly-analytics.vercel.app/script.js"
      data-website-id={websiteId}
      data-auto-track="true"
      data-do-not-track="false"
      data-domains="kassycakes.com,www.kassycakes.com"
      strategy="afterInteractive"
    />
  );
}
