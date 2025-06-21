import DOMPurify from 'dompurify';

export interface SanitizeOptions {
  allowMarkdown?: boolean;
  allowLinks?: boolean;
  allowImages?: boolean;
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

  const config: DOMPurify.Config = {
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
    // Ensure links open in new tab and have security attributes
    config.ADD_ATTR = ['target', 'rel'];
  }

  if (options.allowImages) {
    config.ALLOWED_TAGS?.push('img');
    config.ALLOWED_ATTR?.push('src', 'alt', 'width', 'height');
  }

  return DOMPurify.sanitize(content, config);
}

/**
 * Enhanced markdown sanitization for user-generated content
 * Allows common markdown formatting while preventing XSS
 * @param content - The markdown content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeMarkdown(content: string): string {
  const sanitized = sanitizeHtml(content, {
    allowMarkdown: true,
    allowLinks: true,
    allowImages: false // For security, disable images in comments by default
  });

  // Post-process links to add security attributes
  return sanitized.replace(/<a\s+href="([^"]*)"([^>]*)>/gi, (match, href, attrs) => {
    // Only allow http/https links
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      return `<span class="text-gray-500">[Invalid link]</span>`;
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"${attrs}>`;
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
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }).trim();
} 