import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware configuration
 * Uses helmet to set various HTTP headers for security
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline styles for Tailwind CSS
        "https://fonts.googleapis.com",
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Next.js in development
        "'unsafe-eval'", // Required for Next.js in development
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:", // Allow HTTPS images
      ],
      connectSrc: [
        "'self'",
        process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : '', // WebSocket for development
      ].filter(Boolean),
      frameSrc: ["'none'"], // Prevent embedding in frames
      objectSrc: ["'none'"], // Prevent object/embed/applet
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
    },
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disable for now as it can break some functionality
  
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Frame Options
  frameguard: { action: 'deny' },
  
  // Hide Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // X-XSS-Protection
  xssFilter: true,
});

/**
 * Additional security middleware for API responses
 */
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent caching of sensitive API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * CORS security configuration
 */
export const corsSecurityOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
    
    // In production, be more strict about origins
    if (process.env.NODE_ENV === 'production') {
      const productionOrigins = [
        process.env.FRONTEND_URL,
        process.env.PRODUCTION_DOMAIN,
      ].filter(Boolean);
      
      if (productionOrigins.length > 0) {
        if (productionOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          return callback(new Error('Not allowed by CORS'), false);
        }
      }
    }
    
    // Development: allow localhost and configured origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: [
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
};

/**
 * Input validation security middleware
 * Checks for common attack patterns in request data
 */
export const inputSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
  const checkForAttacks = (obj: any, path = ''): string | null => {
    if (typeof obj === 'string') {
      // Check for common XSS patterns
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>.*?<\/embed>/gi,
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(obj)) {
          return `Potential XSS attack detected in ${path}`;
        }
      }
      
      // Check for SQL injection patterns
      const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
        /(;|\||&|\$|\*|%|@|#)/g,
      ];
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(obj) && obj.length > 50) { // Only flag longer strings to avoid false positives
          return `Potential SQL injection detected in ${path}`;
        }
      }
    }
    
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const result = checkForAttacks(obj[i], `${path}[${i}]`);
        if (result) return result;
      }
    }
    
    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const result = checkForAttacks(value, path ? `${path}.${key}` : key);
        if (result) return result;
      }
    }
    
    return null;
  };
  
  // Check request body
  if (req.body) {
    const bodyAttack = checkForAttacks(req.body, 'body');
    if (bodyAttack) {
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious content',
      });
    }
  }
  
  // Check query parameters
  if (req.query) {
    const queryAttack = checkForAttacks(req.query, 'query');
    if (queryAttack) {
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious content',
      });
    }
  }
  
  next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.get('Content-Length');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      error: 'Request too large',
      message: `Request size exceeds ${maxSize / 1024 / 1024}MB limit`,
    });
  }
  
  next();
};
