import { useEffect } from 'react';
import { ENV } from '../config/environment';

const MetaTags = ({ 
  title = 'LynqIt - Connect & Chat',
  description = 'Secure messaging platform for teams and communities. Join groups, chat with friends, and stay connected.',
  image = '/og-image.png',
  url = window.location.href,
  type = 'website'
}) => {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Helper function to set meta tag
    const setMetaTag = (name, content, property = false) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    setMetaTag('description', description);
    setMetaTag('author', ENV.app.author);
    setMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    setMetaTag('robots', 'index, follow');
    setMetaTag('language', 'en');
    setMetaTag('theme-color', '#3b82f6');

    // Open Graph meta tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', `${ENV.frontendUrl}${image}`, true);
    setMetaTag('og:url', url, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', ENV.app.name, true);
    setMetaTag('og:locale', 'en_US', true);

    // Twitter Card meta tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', `${ENV.frontendUrl}${image}`);
    setMetaTag('twitter:site', '@lynqit');
    setMetaTag('twitter:creator', '@lynqit');

    // Additional SEO meta tags
    setMetaTag('application-name', ENV.app.name);
    setMetaTag('apple-mobile-web-app-title', ENV.app.name);
    setMetaTag('apple-mobile-web-app-capable', 'yes');
    setMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    setMetaTag('mobile-web-app-capable', 'yes');

    // Security headers (if supported by meta tags)
    if (ENV.security.enableCSP) {
      setMetaTag('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
      );
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Preconnect to external domains for performance
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.cloudinary.com'
    ];

    preconnectDomains.forEach(domain => {
      let preconnect = document.querySelector(`link[href="${domain}"]`);
      if (!preconnect) {
        preconnect = document.createElement('link');
        preconnect.setAttribute('rel', 'preconnect');
        preconnect.setAttribute('href', domain);
        document.head.appendChild(preconnect);
      }
    });

  }, [title, description, image, url, type]);

  return null; // This component doesn't render anything
};

export default MetaTags;
