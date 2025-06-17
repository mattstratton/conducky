/**
 * Validation Utilities
 * 
 * This module contains validation functions for user input
 */

/**
 * Validates password strength
 * @param password - The password to validate
 * @returns Object with validation result and error message if invalid
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

/**
 * Validates email format
 * @param email - The email to validate
 * @returns True if email format is valid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates required fields in an object
 * @param data - The object to validate
 * @param requiredFields - Array of required field names
 * @returns Object with validation result and missing fields
 */
export function validateRequiredFields(
  data: Record<string, any>, 
  requiredFields: string[]
): { valid: boolean; missingFields?: string[] } {
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return { valid: false, missingFields };
  }
  
  return { valid: true };
} 