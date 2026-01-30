'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import PusherClient from 'pusher-js';

export default function PresenceTracker() {
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

    // Initialize Pusher client
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });

    // Subscribe to presence channel
    const channel = pusher.subscribe('presence-website-visitors');

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [pathname]);

  // This component doesn't render anything
  return null;
}
