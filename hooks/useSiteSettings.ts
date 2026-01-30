"use client";

import { useState, useEffect } from 'react';

interface SiteSettings {
  chatbotEnabled: boolean | null; // null means not yet loaded
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>({ chatbotEnabled: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings({
          chatbotEnabled: data.chatbotEnabled ?? true,
        });
      })
      .catch(err => {
        console.error('Failed to fetch site settings:', err);
        // Default to enabled on error
        setSettings({ chatbotEnabled: true });
      })
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}
