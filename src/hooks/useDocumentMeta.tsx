import { useEffect } from 'react';

interface DocumentMetaOptions {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  keywords?: string;
  canonicalUrl?: string;
}

const updateOrCreateMeta = (selector: string, attribute: string, content: string) => {
  let element = document.querySelector(selector);
  if (element) {
    element.setAttribute('content', content);
  } else {
    // Create meta tag if it doesn't exist
    element = document.createElement('meta');
    if (selector.includes('property=')) {
      element.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] || '');
    } else if (selector.includes('name=')) {
      element.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] || '');
    }
    element.setAttribute('content', content);
    document.head.appendChild(element);
  }
};

export const useDocumentMeta = (options: DocumentMetaOptions) => {
  useEffect(() => {
    // Update document title
    if (options.title) {
      document.title = options.title;
    }

    // Update meta description
    if (options.description) {
      updateOrCreateMeta('meta[name="description"]', 'content', options.description);
    }

    // Update keywords
    if (options.keywords) {
      updateOrCreateMeta('meta[name="keywords"]', 'content', options.keywords);
    }

    // Update OG title
    if (options.ogTitle) {
      updateOrCreateMeta('meta[property="og:title"]', 'content', options.ogTitle);
      updateOrCreateMeta('meta[name="twitter:title"]', 'content', options.ogTitle);
    }

    // Update OG description
    if (options.ogDescription) {
      updateOrCreateMeta('meta[property="og:description"]', 'content', options.ogDescription);
      updateOrCreateMeta('meta[name="twitter:description"]', 'content', options.ogDescription);
    }

    // Update OG image
    if (options.ogImage) {
      updateOrCreateMeta('meta[property="og:image"]', 'content', options.ogImage);
      updateOrCreateMeta('meta[name="twitter:image"]', 'content', options.ogImage);
    }

    // Update canonical URL
    if (options.canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (canonical) {
        canonical.href = options.canonicalUrl;
      } else {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        canonical.href = options.canonicalUrl;
        document.head.appendChild(canonical);
      }
    }
  }, [options.title, options.description, options.ogTitle, options.ogDescription, options.ogImage, options.keywords, options.canonicalUrl]);
};
