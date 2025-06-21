import validator from 'validator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Comprehensive form validation utilities using validator.js
 * Provides consistent validation patterns across the application
 */
export class FormValidators {
  /**
   * Validates email address format and constraints
   * @param email - The email to validate
   * @returns Validation result with errors if any
   */
  static email(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email is required');
    } else {
      const trimmed = email.trim();
      if (!validator.isEmail(trimmed)) {
        errors.push('Please enter a valid email address');
      }
      if (!validator.isLength(trimmed, { max: 255 })) {
        errors.push('Email must be less than 255 characters');
      }
      // Check for common email security issues
      if (trimmed.includes('..')) {
        errors.push('Email cannot contain consecutive dots');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates password strength and security requirements
   * @param password - The password to validate
   * @returns Validation result with detailed error messages
   */
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
        const requirements = [];
        if (!/[a-z]/.test(password)) requirements.push('lowercase letter');
        if (!/[A-Z]/.test(password)) requirements.push('uppercase letter');
        if (!/[0-9]/.test(password)) requirements.push('number');
        if (!/[^a-zA-Z0-9]/.test(password)) requirements.push('special character');
        
        if (requirements.length > 0) {
          errors.push(`Password must contain at least one ${requirements.join(', ')}`);
        }
      }
      // Check for common weak patterns
      if (validator.matches(password, /^(.)\1+$/)) {
        errors.push('Password cannot be all the same character');
      }
      if (validator.matches(password, /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/i)) {
        errors.push('Password cannot contain simple sequences');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates person name with appropriate constraints
   * @param name - The name to validate
   * @returns Validation result with errors if any
   */
  static name(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('Name is required');
    } else {
      const trimmed = name.trim();
      if (!validator.isLength(trimmed, { min: 1, max: 100 })) {
        errors.push('Name must be 1-100 characters long');
      }
      // Allow letters, spaces, hyphens, apostrophes, and common international characters
      if (!validator.matches(trimmed, /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s'-]+$/)) {
        errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
      }
      // Check for suspicious patterns
      if (validator.matches(trimmed, /<|>|&lt;|&gt;|script|javascript/i)) {
        errors.push('Name contains invalid characters');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates URL format and security
   * @param url - The URL to validate
   * @param required - Whether the URL is required
   * @returns Validation result with errors if any
   */
  static url(url: string, required = false): ValidationResult {
    const errors: string[] = [];
    
    if (!url && required) {
      errors.push('URL is required');
    } else if (url) {
      const trimmed = url.trim();
      if (!validator.isURL(trimmed, { 
        require_protocol: true,
        protocols: ['http', 'https']
      })) {
        errors.push('Please enter a valid URL with http:// or https://');
      }
      if (validator.isLength(trimmed, { min: 2048 })) {
        errors.push('URL is too long (maximum 2048 characters)');
      }
      // Block potentially dangerous URLs
      if (validator.matches(trimmed, /javascript:|data:|file:|ftp:/i)) {
        errors.push('URL protocol not allowed');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates slug format for URLs and identifiers
   * @param slug - The slug to validate
   * @returns Validation result with errors if any
   */
  static slug(slug: string): ValidationResult {
    const errors: string[] = [];
    
    if (!slug) {
      errors.push('Slug is required');
    } else {
      const trimmed = slug.trim();
      if (!validator.isLength(trimmed, { min: 2, max: 50 })) {
        errors.push('Slug must be 2-50 characters long');
      }
      if (!validator.matches(trimmed, /^[a-z0-9-]+$/)) {
        errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
      }
      if (validator.matches(trimmed, /^-|-$/)) {
        errors.push('Slug cannot start or end with a hyphen');
      }
      if (validator.matches(trimmed, /--/)) {
        errors.push('Slug cannot contain consecutive hyphens');
      }
      // Reserved slugs
      const reserved = ['api', 'admin', 'www', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev'];
      if (reserved.includes(trimmed)) {
        errors.push('This slug is reserved and cannot be used');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates report title with appropriate constraints
   * @param title - The title to validate
   * @returns Validation result with errors if any
   */
  static reportTitle(title: string): ValidationResult {
    const errors: string[] = [];
    
    if (!title) {
      errors.push('Title is required');
    } else {
      const trimmed = title.trim();
      if (!validator.isLength(trimmed, { min: 10, max: 200 })) {
        errors.push('Title must be 10-200 characters long');
      }
      // Check for HTML/script injection
      if (validator.matches(trimmed, /<[^>]*>|javascript:|data:/i)) {
        errors.push('Title cannot contain HTML or script content');
      }
      // Ensure meaningful content
      if (validator.matches(trimmed, /^(.)\1{9,}$/)) {
        errors.push('Title cannot be mostly repeated characters');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates report description with content guidelines
   * @param description - The description to validate
   * @returns Validation result with errors if any
   */
  static reportDescription(description: string): ValidationResult {
    const errors: string[] = [];
    
    if (!description) {
      errors.push('Description is required');
    } else {
      const trimmed = description.trim();
      if (!validator.isLength(trimmed, { min: 10, max: 5000 })) {
        errors.push('Description must be 10-5000 characters long');
      }
      // Basic content validation (allow markdown but check for obvious issues)
      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount < 3) {
        errors.push('Description must contain at least 3 words');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates event name with appropriate constraints
   * @param name - The event name to validate
   * @returns Validation result with errors if any
   */
  static eventName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('Event name is required');
    } else {
      const trimmed = name.trim();
      if (!validator.isLength(trimmed, { min: 2, max: 100 })) {
        errors.push('Event name must be 2-100 characters long');
      }
      // Allow more characters for event names (including numbers, parentheses, etc.)
      if (validator.matches(trimmed, /<[^>]*>|javascript:|data:/i)) {
        errors.push('Event name cannot contain HTML or script content');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates phone number format (optional field)
   * @param phone - The phone number to validate
   * @param required - Whether the phone number is required
   * @returns Validation result with errors if any
   */
  static phone(phone: string, required = false): ValidationResult {
    const errors: string[] = [];
    
    if (!phone && required) {
      errors.push('Phone number is required');
    } else if (phone) {
      const trimmed = phone.trim();
      if (!validator.isMobilePhone(trimmed, 'any', { strictMode: false })) {
        errors.push('Please enter a valid phone number');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates organization name
   * @param name - The organization name to validate
   * @returns Validation result with errors if any
   */
  static organizationName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('Organization name is required');
    } else {
      const trimmed = name.trim();
      if (!validator.isLength(trimmed, { min: 2, max: 100 })) {
        errors.push('Organization name must be 2-100 characters long');
      }
      if (validator.matches(trimmed, /<[^>]*>|javascript:|data:/i)) {
        errors.push('Organization name cannot contain HTML or script content');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
} 