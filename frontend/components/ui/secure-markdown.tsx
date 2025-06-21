import React from 'react';
import ReactMarkdown from 'react-markdown';
import { sanitizeMarkdown, sanitizeComment, sanitizeEventContent } from '@/lib/sanitize';

export interface SecureMarkdownProps {
  children: string;
  type?: 'comment' | 'event' | 'general';
  className?: string;
}

/**
 * Secure wrapper for ReactMarkdown that sanitizes content with DOMPurify
 * Prevents XSS attacks while allowing safe markdown formatting
 */
export function SecureMarkdown({ children, type = 'general', className }: SecureMarkdownProps) {
  if (!children || typeof children !== 'string') {
    return null;
  }

  let sanitizedContent: string;
  
  switch (type) {
    case 'comment':
      sanitizedContent = sanitizeComment(children);
      break;
    case 'event':
      sanitizedContent = sanitizeEventContent(children);
      break;
    default:
      sanitizedContent = sanitizeMarkdown(children);
      break;
  }

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}

/**
 * Alternative component that uses ReactMarkdown with restricted components
 * Use this when you need ReactMarkdown's component customization features
 */
export function SafeReactMarkdown({ children, className }: { children: string; className?: string }) {
  if (!children || typeof children !== 'string') {
    return null;
  }

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          // Override potentially dangerous components
          script: () => null,
          iframe: () => null,
          object: () => null,
          embed: () => null,
          form: () => null,
          input: () => null,
          // Secure link handling
          a: ({ href, children, ...props }) => {
            // Only allow http/https links
            if (!href || (typeof href === 'string' && !href.startsWith('http://') && !href.startsWith('https://'))) {
              return <span className="text-gray-500">[Invalid link]</span>;
            }
            return (
              <a
                href={typeof href === 'string' ? href : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Secure image handling
          img: ({ src, alt, ...props }) => {
            // Only allow http/https images
            if (!src || (typeof src === 'string' && !src.startsWith('http://') && !src.startsWith('https://'))) {
              return <span className="text-gray-500">[Invalid image]</span>;
            }
            return (
              <img
                src={typeof src === 'string' ? src : undefined}
                alt={alt || 'Image'}
                className="max-w-full h-auto"
                loading="lazy"
                {...props}
              />
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
} 