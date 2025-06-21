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
 * Enhanced with more comprehensive detection patterns
 */
export const inputSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
  const checkForAttacks = (obj: any, path = ''): string | null => {
    if (typeof obj === 'string') {
      // Enhanced XSS pattern detection
      const xssPatterns = [
        // Script tags (various encodings)
        /<script[^>]*>.*?<\/script>/gi,
        /<script[^>]*>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /data:application\/javascript/gi,
        
        // Event handlers (comprehensive list)
        /on(load|error|click|mouseover|mouseout|focus|blur|change|submit|reset|select|resize|scroll|unload|beforeunload|hashchange|popstate|storage|message|offline|online|pagehide|pageshow|beforeprint|afterprint|dragstart|drag|dragenter|dragover|dragleave|drop|dragend|copy|cut|paste|selectstart|contextmenu|wheel|touchstart|touchmove|touchend|touchcancel|animationstart|animationend|animationiteration|transitionend)\s*=/gi,
        
        // Dangerous HTML elements
        /<(iframe|object|embed|applet|form|input|textarea|select|option|button|label|fieldset|legend|datalist|output|progress|meter)[^>]*>/gi,
        /<\/?(iframe|object|embed|applet|form|input|textarea|select|option|button|label|fieldset|legend|datalist|output|progress|meter)>/gi,
        
        // CSS expressions and imports
        /expression\s*\(/gi,
        /@import/gi,
        /url\s*\(/gi,
        
        // Protocol handlers
        /^(javascript|vbscript|data|file|ftp):/gi,
        
        // HTML entities that could be used for obfuscation
        /&#x?[0-9a-f]+;/gi,
        
        // Base64 encoded potential payloads
        /data:.*;base64,/gi,
        
        // Common XSS vectors
        /alert\s*\(/gi,
        /confirm\s*\(/gi,
        /prompt\s*\(/gi,
        /eval\s*\(/gi,
        /setTimeout\s*\(/gi,
        /setInterval\s*\(/gi,
        /Function\s*\(/gi,
        
        // SVG-based XSS
        /<svg[^>]*>/gi,
        /<foreignobject[^>]*>/gi,
        /<use[^>]*>/gi,
        
        // Meta refresh redirects
        /<meta[^>]*http-equiv[^>]*refresh/gi,
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(obj)) {
          return `Potential XSS attack detected in ${path}: ${pattern.source}`;
        }
      }
      
      // Enhanced SQL injection pattern detection (removed length restriction)
      const sqlPatterns = [
        // SQL keywords (case insensitive)
        /\b(union|select|insert|update|delete|drop|create|alter|exec|execute|declare|cast|convert|having|group\s+by|order\s+by|limit|offset)\b/gi,
        
        // SQL injection characters and patterns
        /('|\"|;|--|\|\||&&|\*|%|@|#|\$|\^|`|~)/g,
        
        // SQL functions commonly used in attacks
        /\b(concat|substring|ascii|char|chr|length|len|mid|left|right|replace|reverse|upper|lower|ltrim|rtrim|trim)\s*\(/gi,
        
        // Database-specific functions
        /\b(sleep|benchmark|waitfor|delay|pg_sleep|dbms_pipe\.receive_message)\s*\(/gi,
        
        // Comment patterns used to bypass filters
        /\/\*.*?\*\//g,
        /#.*$/gm,
        /--.*$/gm,
        
        // UNION-based injection patterns
        /\bunion\b.*\bselect\b/gi,
        
        // Boolean-based blind injection
        /\b(and|or)\b\s+\d+\s*[=<>]+\s*\d+/gi,
        
        // Time-based blind injection
        /\bif\s*\(\s*\d+\s*[=<>]+\s*\d+/gi,
        
        // Error-based injection
        /\b(extractvalue|updatexml|exp|floor|rand|count)\s*\(/gi,
      ];
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(obj)) {
          return `Potential SQL injection detected in ${path}: ${pattern.source}`;
        }
      }
      
      // NoSQL injection patterns
      const noSqlPatterns = [
        /\$where/gi,
        /\$ne/gi,
        /\$gt/gi,
        /\$lt/gi,
        /\$gte/gi,
        /\$lte/gi,
        /\$in/gi,
        /\$nin/gi,
        /\$regex/gi,
        /\$exists/gi,
        /\$type/gi,
        /\$mod/gi,
        /\$all/gi,
        /\$size/gi,
        /\$elemMatch/gi,
        /\$not/gi,
        /\$or/gi,
        /\$and/gi,
        /\$nor/gi,
      ];
      
      for (const pattern of noSqlPatterns) {
        if (pattern.test(obj)) {
          return `Potential NoSQL injection detected in ${path}: ${pattern.source}`;
        }
      }
      
      // Command injection patterns
      const commandPatterns = [
        /[;&|`$(){}[\]\\]/g,
        /\b(cat|ls|dir|type|echo|ping|nslookup|dig|curl|wget|nc|netcat|telnet|ssh|ftp|tftp)\b/gi,
        /\.\.\//g,
        /~\//g,
        /\/etc\/passwd/gi,
        /\/proc\//gi,
        /cmd\.exe/gi,
        /powershell/gi,
        /bash/gi,
        /sh\s/gi,
      ];
      
      for (const pattern of commandPatterns) {
        if (pattern.test(obj)) {
          return `Potential command injection detected in ${path}: ${pattern.source}`;
        }
      }
      
      // Path traversal patterns
      const pathTraversalPatterns = [
        /\.\.[\/\\]/g,
        /[\/\\]\.\.[\/\\]/g,
        /%2e%2e[\/\\]/gi,
        /%2e%2e%2f/gi,
        /%2e%2e%5c/gi,
        /\.\.%2f/gi,
        /\.\.%5c/gi,
      ];
      
      for (const pattern of pathTraversalPatterns) {
        if (pattern.test(obj)) {
          return `Potential path traversal detected in ${path}: ${pattern.source}`;
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
      // Log the security violation for monitoring
      console.warn(`Security violation detected: ${bodyAttack}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
      
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
      console.warn(`Security violation detected: ${queryAttack}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
      
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious content',
      });
    }
  }
  
  // Check URL parameters
  if (req.params) {
    const paramsAttack = checkForAttacks(req.params, 'params');
    if (paramsAttack) {
      console.warn(`Security violation detected: ${paramsAttack}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
      
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
