# Comprehensive Sanitization and Validation Plan

**Issues Addressed:** #228 (DOMPurify for markdown), #243 (validation middleware), #293 (validator.js for forms)

## Current State Analysis

### ✅ What We Have
- Basic validation utilities in `backend/src/utils/validation.ts`
- Email validation functions (`isValidEmail`, `sanitizeEmail`)
- File upload validation with MIME type checking
- Basic password strength validation
- Some validation middleware for auth routes
- Filename sanitization for uploads

### ❌ What's Missing
- **DOMPurify** for markdown content sanitization
- **validator.js** for comprehensive form validation
- Systematic input sanitization across all endpoints
- Consistent validation patterns
- XSS protection for user-generated content
- Advanced rate limiting and CSRF protection

## Implementation Strategy

### Phase 1: Core Security Libraries (Priority: HIGH)

#### 1.1 Install Dependencies
```bash
# Backend
npm install --save validator express-validator helmet express-rate-limit
npm install --save-dev @types/validator

# Frontend  
npm install --save dompurify validator
npm install --save-dev @types/dompurify @types/validator
```

#### 1.2 DOMPurify Integration (Issue #228)
**Target Files:**
- `frontend/components/report-detail/CommentsSection.tsx`
- `frontend/components/ui/markdown-editor.tsx`
- `frontend/components/EventMetaCard.tsx`
- `frontend/components/EventMetaEditor.tsx`
- `frontend/pages/events/[eventSlug]/code-of-conduct.tsx`

**Implementation:**
```typescript
// frontend/lib/sanitize.ts
import DOMPurify from 'dompurify';

export interface SanitizeOptions {
  allowMarkdown?: boolean;
  allowLinks?: boolean;
  allowImages?: boolean;
}

export function sanitizeHtml(content: string, options: SanitizeOptions = {}): string {
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: options.allowMarkdown 
      ? ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      : ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: options.allowLinks ? ['href', 'title'] : [],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style']
  };

  if (options.allowLinks) {
    config.ALLOWED_TAGS?.push('a');
  }

  if (options.allowImages) {
    config.ALLOWED_TAGS?.push('img');
    config.ALLOWED_ATTR?.push('src', 'alt');
  }

  return DOMPurify.sanitize(content, config);
}

// Enhanced markdown sanitization
export function sanitizeMarkdown(content: string): string {
  return sanitizeHtml(content, {
    allowMarkdown: true,
    allowLinks: true,
    allowImages: false // For security, disable images in comments
  });
}
```

#### 1.3 validator.js Integration (Issue #293)
**Create:** `frontend/lib/validators.ts`
```typescript
import validator from 'validator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class FormValidators {
  static email(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email is required');
    } else {
      if (!validator.isEmail(email)) {
        errors.push('Please enter a valid email address');
      }
      if (!validator.isLength(email, { max: 255 })) {
        errors.push('Email must be less than 255 characters');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static password(password: string): ValidationResult {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
    } else {
      if (!validator.isLength(password, { min: 8, max: 128 })) {
        errors.push('Password must be 8-128 characters long');
      }
      if (!validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
      })) {
        errors.push('Password must contain uppercase, lowercase, number, and special character');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static name(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('Name is required');
    } else {
      const sanitized = validator.escape(name.trim());
      if (!validator.isLength(sanitized, { min: 1, max: 100 })) {
        errors.push('Name must be 1-100 characters long');
      }
      if (!validator.matches(sanitized, /^[a-zA-Z\s'-]+$/)) {
        errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static url(url: string, required = false): ValidationResult {
    const errors: string[] = [];
    
    if (!url && required) {
      errors.push('URL is required');
    } else if (url && !validator.isURL(url, { require_protocol: true })) {
      errors.push('Please enter a valid URL with protocol (http:// or https://)');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static slug(slug: string): ValidationResult {
    const errors: string[] = [];
    
    if (!slug) {
      errors.push('Slug is required');
    } else {
      if (!validator.isLength(slug, { min: 2, max: 50 })) {
        errors.push('Slug must be 2-50 characters long');
      }
      if (!validator.matches(slug, /^[a-z0-9-]+$/)) {
        errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static reportTitle(title: string): ValidationResult {
    const errors: string[] = [];
    
    if (!title) {
      errors.push('Title is required');
    } else {
      const sanitized = validator.escape(title.trim());
      if (!validator.isLength(sanitized, { min: 10, max: 200 })) {
        errors.push('Title must be 10-200 characters long');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static reportDescription(description: string): ValidationResult {
    const errors: string[] = [];
    
    if (!description) {
      errors.push('Description is required');
    } else {
      const sanitized = validator.escape(description.trim());
      if (!validator.isLength(sanitized, { min: 10, max: 5000 })) {
        errors.push('Description must be 10-5000 characters long');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
}
```

### Phase 2: Enhanced Backend Validation (Priority: HIGH)

#### 2.1 Advanced Validation Middleware (Issue #243)
**Update:** `backend/src/middleware/validation.ts`
```typescript
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import rateLimit from 'express-rate-limit';

// Enhanced validation middleware factory
export function createValidationRules(rules: ValidationChain[]) {
  return [
    ...rules,
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array().map(err => ({
            field: err.type === 'field' ? err.path : 'unknown',
            message: err.msg,
            value: err.type === 'field' ? err.value : undefined
          }))
        });
      }
      next();
    }
  ];
}

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Basic HTML escape for all string inputs
      return validator.escape(value.trim());
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  }

  req.body = sanitizeValue(req.body);
  next();
}

// Rate limiting configurations
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Domain-specific validation rules
export const userValidationRules = {
  register: createValidationRules([
    body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Valid email required (max 255 characters)'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Name must be 1-100 characters and contain only letters, spaces, hyphens, and apostrophes'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
      })
      .withMessage('Password must be 8-128 characters with uppercase, lowercase, number, and special character')
  ]),
  
  update: createValidationRules([
    body('name').optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z\s'-]+$/),
    body('email').optional()
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
  ])
};

export const reportValidationRules = {
  create: createValidationRules([
    body('title')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Title must be 10-200 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Description must be 10-5000 characters'),
    body('type')
      .isIn(['harassment', 'safety', 'discrimination', 'other'])
      .withMessage('Invalid report type'),
    body('incidentAt').optional()
      .isISO8601()
      .toDate()
      .withMessage('Invalid date format'),
    body('parties').optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Parties involved must be less than 1000 characters'),
    body('location').optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Location must be less than 500 characters'),
    body('contactPreference').optional()
      .isIn(['email', 'phone', 'none'])
      .withMessage('Invalid contact preference'),
    body('urgency').optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid urgency level')
  ])
};

export const eventValidationRules = {
  create: createValidationRules([
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Event name must be 2-100 characters'),
    body('slug')
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must be 2-50 characters with only lowercase letters, numbers, and hyphens'),
    body('description').optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('website').optional()
      .isURL({ require_protocol: true })
      .withMessage('Website must be a valid URL with protocol'),
    body('contactEmail').optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Contact email must be valid')
  ])
};
```

#### 2.2 Enhanced Security Headers
**Update:** `backend/index.ts`
```typescript
// Enhanced helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      connectSrc: ["'self'"],
      workerSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

### Phase 3: Frontend Form Validation Enhancement

#### 3.1 Enhanced Form Components
**Create:** `frontend/components/forms/ValidatedInput.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormValidators, ValidationResult } from '@/lib/validators';

interface ValidatedInputProps {
  label: string;
  type: 'email' | 'password' | 'text' | 'url';
  value: string;
  onChange: (value: string) => void;
  onValidation?: (result: ValidationResult) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function ValidatedInput({ 
  label, 
  type, 
  value, 
  onChange, 
  onValidation,
  required = false,
  placeholder,
  className 
}: ValidatedInputProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) return;

    let result: ValidationResult;
    switch (type) {
      case 'email':
        result = FormValidators.email(value);
        break;
      case 'password':
        result = FormValidators.password(value);
        break;
      case 'url':
        result = FormValidators.url(value, required);
        break;
      default:
        result = { isValid: true, errors: [] };
    }

    setErrors(result.errors);
    onValidation?.(result);
  }, [value, touched, type, required, onValidation]);

  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={label.toLowerCase().replace(/\s+/g, '-')}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        className={`${className} ${errors.length > 0 ? 'border-red-500 focus:border-red-500' : ''}`}
        required={required}
      />
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 3.2 Enhanced Markdown Components
**Update:** `frontend/components/ui/markdown-editor.tsx`
```typescript
import { sanitizeMarkdown } from '@/lib/sanitize';

// In the preview section:
<ReactMarkdown 
  className="prose max-w-none"
  components={{
    // Custom components to ensure safe rendering
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  }}
>
  {sanitizeMarkdown(value)}
</ReactMarkdown>
```

### Phase 4: Testing and Monitoring

#### 4.1 Security Testing
**Create:** `backend/tests/security/validation.test.js`
```javascript
describe('Security Validation Tests', () => {
  describe('XSS Prevention', () => {
    it('should sanitize malicious script tags', async () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      // Test sanitization
    });

    it('should prevent event handler injection', async () => {
      const maliciousInput = '<img src="x" onerror="alert(1)">';
      // Test sanitization
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should handle malicious SQL in inputs', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      // Test with Prisma queries
    });
  });

  describe('Rate Limiting', () => {
    it('should block excessive requests', async () => {
      // Test rate limiting
    });
  });
});
```

#### 4.2 Validation Monitoring
**Create:** `backend/src/utils/security-logger.ts`
```typescript
export function logValidationFailure(req: Request, errors: any[]) {
  console.warn('[VALIDATION_FAILURE]', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    errors: errors,
    timestamp: new Date().toISOString(),
  });
}

export function logSuspiciousActivity(req: Request, reason: string) {
  console.error('[SUSPICIOUS_ACTIVITY]', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    reason: reason,
    timestamp: new Date().toISOString(),
  });
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Install dependencies (DOMPurify, validator.js, express-validator)
- [ ] Create sanitization utilities (`frontend/lib/sanitize.ts`)
- [ ] Create validation utilities (`frontend/lib/validators.ts`)
- [ ] Update markdown components with DOMPurify

### Week 2: Backend Security
- [ ] Enhance validation middleware
- [ ] Add rate limiting
- [ ] Update security headers
- [ ] Apply validation rules to all routes

### Week 3: Frontend Enhancement
- [ ] Create ValidatedInput component
- [ ] Update all forms to use new validation
- [ ] Add real-time validation feedback
- [ ] Update email validation across all forms

### Week 4: Testing & Monitoring
- [ ] Add security tests
- [ ] Implement security logging
- [ ] Performance testing
- [ ] Documentation updates

## Security Benefits

### XSS Prevention
- ✅ DOMPurify sanitizes all markdown content
- ✅ HTML escaping for form inputs
- ✅ CSP headers prevent inline scripts

### Injection Protection
- ✅ Comprehensive input validation
- ✅ Parameterized queries (Prisma)
- ✅ File upload validation

### Rate Limiting
- ✅ Authentication endpoint protection
- ✅ General request rate limiting
- ✅ Suspicious activity detection

### Data Integrity
- ✅ Strong validation rules
- ✅ Type checking
- ✅ Business rule enforcement

## Configuration

### Environment Variables
```bash
# Security settings
VALIDATION_STRICT_MODE=true
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
ENABLE_SECURITY_LOGGING=true
```

### Feature Flags
- `ENABLE_ADVANCED_VALIDATION`: Enable strict validation mode
- `ENABLE_RATE_LIMITING`: Enable rate limiting middleware
- `ENABLE_SECURITY_LOGGING`: Enable security event logging

## Success Metrics

### Security
- Zero XSS vulnerabilities in security scans
- Zero SQL injection vulnerabilities
- Blocked malicious requests per day

### Performance
- Validation overhead < 50ms per request
- No impact on user experience
- Minimal false positives

### Usability
- Clear validation error messages
- Real-time feedback for users
- Improved form completion rates

## Documentation Updates

### Developer Documentation
- [ ] Update `/website/docs/developer-docs/security.md`
- [ ] Add validation patterns guide
- [ ] Update API documentation with validation rules

### User Documentation
- [ ] Update form validation help text
- [ ] Add security best practices guide

## Future Enhancements

### Phase 5: Advanced Security (Future)
- CSRF token implementation
- Advanced bot detection
- Content analysis for policy violations
- Automated security scanning integration
- Advanced logging and alerting

This plan provides a comprehensive approach to addressing all three issues while building a robust, secure foundation for the application. 