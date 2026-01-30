'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track admin pages
    if (pathname?.startsWith('/kassyadmin') || pathname?.startsWith('/kassycakes')) {
      return;
    }

    // Only track on production domains
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isProd =
        hostname === 'kassycakes.com' ||
        hostname === 'www.kassycakes.com';

      if (!isProd) {
        return;
      }
    }

    // Track visitor
    const trackVisitor = async () => {
      try {
        await fetch('/api/track-visitor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pathname: pathname || '/',
          }),
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.debug('Visitor tracking failed:', error);
      }
    };

    trackVisitor();
  }, [pathname]);

  return null;
}
