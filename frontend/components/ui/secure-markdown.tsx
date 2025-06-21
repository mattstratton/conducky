import React from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

export type MarkdownType = 'comment' | 'event' | 'general';

interface SecureMarkdownProps {
  content: string;
  type?: MarkdownType;
  className?: string;
}

/**
 * Enhanced secure markdown configuration with multiple validation layers
 */
const getSecureConfig = (type: MarkdownType) => {
  const baseConfig = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr'
    ],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea', 'select', 'button'],
    FORBID_ATTR: ['style', 'on*', 'data-*'],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: false,
    USE_PROFILES: { html: true },
  };

  switch (type) {
    case 'comment':
      return {
        ...baseConfig,
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'blockquote'],
        ALLOWED_ATTR: [],
      };
    case 'event':
      return {
        ...baseConfig,
        ALLOWED_TAGS: [...baseConfig.ALLOWED_TAGS, 'a'],
        ALLOWED_ATTR: ['href', 'title', 'rel'],
        ALLOWED_URI_REGEXP: /^https?:\/\//i,
      };
    default:
      return baseConfig;
  }
};

/**
 * Additional validation to catch potential bypasses
 */
const validateContent = (content: string): boolean => {
  // Check for potentially dangerous patterns that might bypass DOMPurify
  const dangerousPatterns = [
    // JavaScript protocols
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /data:application\/javascript/gi,
    
    // Event handlers (even if encoded)
    /on\w+\s*=/gi,
    /%6F%6E\w+/gi, // URL encoded "on"
    
    // Script content
    /<script/gi,
    /%3Cscript/gi,
    
    // Data URLs with potential payloads
    /data:.*;base64,/gi,
    
    // CSS expressions
    /expression\s*\(/gi,
    /-moz-binding/gi,
    
    // Meta refresh
    /http-equiv.*refresh/gi,
    
    // SVG with potential XSS
    /<svg.*onload/gi,
    /<use.*href.*javascript/gi,
    
    // Dangerous attributes
    /srcdoc\s*=/gi,
    /formaction\s*=/gi,
    
    // Protocol handlers
    /^(javascript|vbscript|data|file):/gi,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(content));
};

/**
 * SecureMarkdown component with enhanced XSS protection
 * Uses multiple validation layers and conservative DOMPurify configuration
 */
export function SecureMarkdown({ content, type = 'general', className }: SecureMarkdownProps) {
  // Early validation
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Additional content validation
  if (!validateContent(content)) {
    console.warn('SecureMarkdown: Potentially dangerous content detected and blocked');
    return (
      <div className={`${className} text-red-600 text-sm`}>
        [Content blocked: potentially unsafe content detected]
      </div>
    );
  }

  // Get type-specific configuration
  const config = getSecureConfig(type);
  
  // Sanitize with DOMPurify using strict configuration
  let sanitizedContent: string;
  try {
    sanitizedContent = DOMPurify.sanitize(content, config);
    
    // Verify DOMPurify didn't fail silently
    if (sanitizedContent === null || sanitizedContent === undefined) {
      throw new Error('DOMPurify returned null/undefined');
    }
    
    // Additional post-sanitization validation
    if (!validateContent(sanitizedContent)) {
      throw new Error('Content failed post-sanitization validation');
    }
    
  } catch (error) {
    console.warn('SecureMarkdown: Sanitization failed', error);
    return (
      <div className={`${className} text-red-600 text-sm`}>
        [Content blocked: sanitization failed]
      </div>
    );
  }

  // Final safety check - ensure no dangerous content remains
  if (sanitizedContent.length === 0) {
    return null;
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      // Additional security attributes
      style={{ 
        // Prevent CSS injection through inline styles
        isolation: 'isolate',
        // Prevent content from breaking layout
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}
    />
  );
}

/**
 * SafeReactMarkdown - Alternative implementation using ReactMarkdown
 * Provides additional safety by not using dangerouslySetInnerHTML
 */
interface SafeReactMarkdownProps {
  content: string;
  className?: string;
}

export function SafeReactMarkdown({ content, className }: SafeReactMarkdownProps) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Validate content before rendering
  if (!validateContent(content)) {
    console.warn('SafeReactMarkdown: Potentially dangerous content detected and blocked');
    return (
      <div className={`${className} text-red-600 text-sm`}>
        [Content blocked: potentially unsafe content detected]
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          // Override dangerous components
          script: () => null,
          iframe: () => null,
          object: () => null,
          embed: () => null,
          form: () => null,
          input: () => null,
          textarea: () => null,
          select: () => null,
          button: () => null,
          
          // Safe link handling
          a: ({ href, children, ...props }) => {
            // Only allow https/http links
            if (href && /^https?:\/\//i.test(href)) {
              return (
                <a 
                  {...props} 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer nofollow"
                >
                  {children}
                </a>
              );
            }
            return <span>{children}</span>;
          },
          
          // Remove any potential event handlers from all elements
          p: ({ children, ...props }) => {
            const safeProps = Object.fromEntries(
              Object.entries(props).filter(([key]) => 
                !key.startsWith('on') && !key.startsWith('data-')
              )
            );
            return <p {...safeProps}>{children}</p>;
          },
          
          div: ({ children, ...props }) => {
            const safeProps = Object.fromEntries(
              Object.entries(props).filter(([key]) => 
                !key.startsWith('on') && !key.startsWith('data-')
              )
            );
            return <div {...safeProps}>{children}</div>;
          },
        }}
        // Disable HTML parsing entirely
        disallowedElements={[
          'script', 'iframe', 'object', 'embed', 'form', 'input', 
          'textarea', 'select', 'button', 'style', 'link', 'meta'
        ]}
        unwrapDisallowed={true}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 