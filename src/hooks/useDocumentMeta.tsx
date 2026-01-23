import { useEffect } from 'react';

interface DocumentMetaOptions {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export const useDocumentMeta = (options: DocumentMetaOptions) => {
  useEffect(() => {
    // Update document title
    if (options.title) {
      document.title = options.title;
    }

    // Update meta description
    if (options.description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', options.description);
      }
    }

    // Update OG title
    if (options.ogTitle) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', options.ogTitle);
      }
    }

    // Update OG description
    if (options.ogDescription) {
      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', options.ogDescription);
      }
    }

    // Update OG image
    if (options.ogImage) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.setAttribute('content', options.ogImage);
      }
      
      let twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        twitterImage.setAttribute('content', options.ogImage);
      }
    }
  }, [options.title, options.description, options.ogTitle, options.ogDescription, options.ogImage]);
};
