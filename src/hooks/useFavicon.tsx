import { useEffect } from 'react';

export const useFavicon = (faviconUrl: string | null | undefined) => {
  useEffect(() => {
    if (!faviconUrl) return;

    // Find or create link element for favicon
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    link.type = 'image/x-icon';
    link.href = faviconUrl;

    // Also update shortcut icon if exists
    const shortcutIcon: HTMLLinkElement | null = document.querySelector("link[rel='shortcut icon']");
    if (shortcutIcon) {
      shortcutIcon.href = faviconUrl;
    }

    // Update apple-touch-icon if exists
    const appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
    if (appleIcon) {
      appleIcon.href = faviconUrl;
    }
  }, [faviconUrl]);
};
