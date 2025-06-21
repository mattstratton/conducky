import DOMPurify from 'dompurify';

export interface SanitizeOptions {
  allowMarkdown?: boolean;
  allowLinks?: boolean;
  allowImages?: boolean;
}

// Extended config interface to include HOOKS
interface ExtendedConfig extends DOMPurify.Config {
  HOOKS?: {
    afterSanitizeAttributes?: (node: Element) => void;
  };
}

/**
 * Sanitizes HTML content using DOMPurify with configurable options
 * @param content - The HTML content to sanitize
 * @param options - Configuration options for sanitization
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(content: string, options: SanitizeOptions = {}): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const config: ExtendedConfig = {
    ALLOWED_TAGS: options.allowMarkdown 
      ? ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      : ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: options.allowLinks ? ['href', 'title'] : [],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'style'],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false
  };

  if (options.allowLinks) {
    config.ALLOWED_TAGS?.push('a');
    config.ALLOWED_ATTR?.push('target', 'rel');
    
    // Use DOMPurify hooks for robust link processing
    config.HOOKS = {
      afterSanitizeAttributes: function(node: Element) {
        if (node.tagName === 'A') {
          const href = node.getAttribute('href');
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            // Valid external link - add security attributes
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer nofollow');
          } else {
            // Invalid or potentially dangerous link - convert to plain text
            node.removeAttribute('href');
            node.removeAttribute('target');
            node.removeAttribute('rel');
            // Replace with styled span for invalid links
            const span = node.ownerDocument?.createElement('span');
            if (span) {
              span.className = 'text-gray-500';
              span.textContent = '[Invalid link]';
              node.parentNode?.replaceChild(span, node);
            } else {
              // Fallback if document is not available
              node.textContent = '[Invalid link]';
            }
          }
        }
      }
    };
  }

  if (options.allowImages) {
    config.ALLOWED_TAGS?.push('img');
    config.ALLOWED_ATTR?.push('src', 'alt', 'width', 'height');
    
    // Add image processing hook for security
    if (!config.HOOKS) {
      config.HOOKS = {};
    }
    
    const originalHook = config.HOOKS.afterSanitizeAttributes;
    config.HOOKS.afterSanitizeAttributes = function(node: Element) {
      // Call original link processing hook if it exists
      if (originalHook) {
        originalHook.call(this, node);
      }
      
      // Process images
      if (node.tagName === 'IMG') {
        const src = node.getAttribute('src');
        if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
          // Valid external image - add security attributes
          node.setAttribute('loading', 'lazy');
          node.setAttribute('referrerpolicy', 'no-referrer');
        } else {
          // Invalid image source - remove the image
          const span = node.ownerDocument?.createElement('span');
          if (span) {
            span.className = 'text-gray-500';
            span.textContent = '[Invalid image]';
            node.parentNode?.replaceChild(span, node);
          } else {
            node.textContent = '[Invalid image]';
          }
        }
      }
    };
  }

  // Handle TrustedHTML return type
  const result = DOMPurify.sanitize(content, config);
  return String(result);
}

/**
 * Enhanced markdown sanitization for user-generated content
 * Allows common markdown formatting while preventing XSS
 * @param content - The markdown content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeMarkdown(content: string): string {
  return sanitizeHtml(content, {
    allowMarkdown: true,
    allowLinks: true,
    allowImages: false // For security, disable images in comments by default
  });
}

/**
 * Sanitize content for safe display in comments
 * More restrictive than general markdown
 * @param content - The comment content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeComment(content: string): string {
  return sanitizeHtml(content, {
    allowMarkdown: true,
    allowLinks: true,
    allowImages: false
  });
}

/**
 * Sanitize content for code of conduct and event descriptions
 * Allows more formatting options for administrative content
 * @param content - The content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeEventContent(content: string): string {
  return sanitizeHtml(content, {
    allowMarkdown: true,
    allowLinks: true,
    allowImages: true // Allow images for event descriptions
  });
}

/**
 * Basic text sanitization for form inputs
 * Strips all HTML tags and dangerous characters
 * @param text - The text to sanitize
 * @returns Clean text string
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Strip all HTML tags and return plain text
  const result = DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  
  return String(result).trim();
} 