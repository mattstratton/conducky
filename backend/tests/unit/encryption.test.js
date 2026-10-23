const { encryptField, decryptField, isEncrypted, isLegacyEncrypted } = require('../../src/utils/encryption');

describe('Encryption Utilities', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-conducky-testing';
  });

  afterAll(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encryptField', () => {
    it('should encrypt a string value with new secure format', () => {
      const plaintext = 'sensitive-password-123';
      const encrypted = encryptField(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(4); // salt:iv:encrypted:authTag format (NEW)
      expect(isLegacyEncrypted(encrypted)).toBe(false); // Should NOT be legacy format
    });

    it('should handle null and undefined, but encrypt empty strings', () => {
      expect(encryptField(null)).toBe(null);
      expect(encryptField(undefined)).toBe(undefined);
      
      // Empty strings should be encrypted (changed behavior for Phase 2)
      const encryptedEmpty = encryptField('');
      expect(isEncrypted(encryptedEmpty)).toBe(true);
      expect(decryptField(encryptedEmpty)).toBe('');
    });

    it('should produce different outputs for same input (due to random salt + IV)', () => {
      const plaintext = 'same-input-text';
      const encrypted1 = encryptField(plaintext);
      const encrypted2 = encryptField(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      // Different salts (first part)
      expect(encrypted1.split(':')[0]).not.toBe(encrypted2.split(':')[0]); 
      // Different IVs (second part)
      expect(encrypted1.split(':')[1]).not.toBe(encrypted2.split(':')[1]); 
    });

    it('should use unique salt for each encryption operation', () => {
      const plaintext = 'test-unique-salts';
      const encryptions = Array.from({ length: 10 }, () => encryptField(plaintext));
      
      // Extract salts (first part of each encryption)
      const salts = encryptions.map(enc => enc.split(':')[0]);
      
      // All salts should be unique
      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(salts.length);
    });
  });

  describe('decryptField', () => {
    it('should decrypt new format encrypted values back to original', () => {
      const plaintext = 'my-secret-smtp-password';
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle legacy format for backward compatibility', () => {
      // Create a legacy format manually for testing (proper hex format)
      // This simulates what would exist in the database before the security fix
      const legacyFormat = 'abc123def456789012345678901234567890:123456789abcdef0123456789abcdef0:fedcba9876543210fedcba9876543210';
      
      // Verify it's detected as legacy format
      expect(isLegacyEncrypted(legacyFormat)).toBe(true);
      expect(isEncrypted(legacyFormat)).toBe(true);
      
      // Note: We can't actually test decryption of legacy format without creating real legacy data
      // because we'd need the exact same IV and authTag that was created with the old fixed salt
      // This is tested in the integration migration script instead
    });

    it('should return non-encrypted values as-is', () => {
      const plainValue = 'not-encrypted-value';
      expect(decryptField(plainValue)).toBe(plainValue);
    });

    it('should handle empty and null values', () => {
      expect(decryptField('')).toBe('');
      expect(decryptField(null)).toBe(null);
      expect(decryptField(undefined)).toBe(undefined);
    });

    it('should handle invalid encrypted format gracefully', () => {
      // Changed to graceful degradation - return original value instead of throwing
      expect(decryptField('invalid:format')).toBe('invalid:format');
      expect(decryptField('not:encrypted:format:too:many:parts:here')).toBe('not:encrypted:format:too:many:parts:here');
      expect(decryptField('single-part')).toBe('single-part'); // Should return as-is
    });
  });

  describe('isEncrypted', () => {
    it('should identify new format encrypted values correctly', () => {
      const plaintext = 'test-value';
      const encrypted = encryptField(plaintext);
      
      expect(isEncrypted(encrypted)).toBe(true);
      expect(isEncrypted(plaintext)).toBe(false);
      expect(encrypted.split(':')).toHaveLength(4); // New format
    });

    it('should identify legacy format encrypted values correctly', () => {
      const legacyFormat = 'abc123def456789012345678901234567890:123456789abcdef0123456789abcdef0:fedcba9876543210fedcba9876543210';
      
      expect(isEncrypted(legacyFormat)).toBe(true); // Should recognize both formats
      expect(isLegacyEncrypted(legacyFormat)).toBe(true); // Should identify as legacy
    });

    it('should return false for empty or invalid values', () => {
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted('not-encrypted')).toBe(false);
      expect(isEncrypted('invalid:format')).toBe(false);
    });

    it('should validate hex format in encrypted values', () => {
      // New format (4 parts)
      expect(isEncrypted('abc123:def456:789abc:012def')).toBe(true);
      expect(isEncrypted('xyz123:def456:789abc:012def')).toBe(false); // 'xyz' is not hex
      expect(isEncrypted('abc123:def456:789xyz:012def')).toBe(false); // 'xyz' is not hex
      
      // Legacy format (3 parts)
      expect(isEncrypted('abc123:def456:789abc')).toBe(true);
      expect(isEncrypted('xyz123:def456:789abc')).toBe(false); // 'xyz' is not hex
    });
  });

  describe('isLegacyEncrypted', () => {
    it('should correctly identify legacy format', () => {
      const legacyFormat = 'abc123def456789012345678901234567890:123456789abcdef0123456789abcdef0:fedcba9876543210fedcba9876543210';
      const newFormat = encryptField('test');
      
      expect(isLegacyEncrypted(legacyFormat)).toBe(true);
      expect(isLegacyEncrypted(newFormat)).toBe(false);
      expect(isLegacyEncrypted('not-encrypted')).toBe(false);
      expect(isLegacyEncrypted('')).toBe(false);
    });

    it('should require exactly 3 hex parts for legacy format', () => {
      expect(isLegacyEncrypted('abc:def:123')).toBe(true);
      expect(isLegacyEncrypted('abc:def')).toBe(false); // Too few parts
      expect(isLegacyEncrypted('abc:def:123:456')).toBe(false); // Too many parts (new format)
      expect(isLegacyEncrypted('xyz:def:123')).toBe(false); // Non-hex content
    });
  });

  describe('end-to-end encryption workflow', () => {
    it('should handle typical email password encryption workflow with new security', () => {
      const smtpPassword = 'super-secret-smtp-password-2024!';
      
      // Encrypt for storage
      const encryptedPassword = encryptField(smtpPassword);
      expect(isEncrypted(encryptedPassword)).toBe(true);
      expect(isLegacyEncrypted(encryptedPassword)).toBe(false); // Should be new format
      
      // Decrypt for use
      const decryptedPassword = decryptField(encryptedPassword);
      expect(decryptedPassword).toBe(smtpPassword);
    });

    it('should handle multiple different passwords with unique salts', () => {
      const passwords = [
        'gmail-app-password-123',
        'outlook-smtp-secret',
        'mailgun-api-key-456',
        'sendgrid-token-789'
      ];

      const encrypted = passwords.map(pwd => encryptField(pwd));
      const decrypted = encrypted.map(enc => decryptField(enc));

      expect(decrypted).toEqual(passwords);
      expect(encrypted.every(enc => isEncrypted(enc))).toBe(true);
      expect(encrypted.every(enc => !isLegacyEncrypted(enc))).toBe(true); // All should be new format
      
      // All salts should be unique
      const salts = encrypted.map(enc => enc.split(':')[0]);
      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(salts.length);
    });

    it('should maintain security even with same passwords', () => {
      const samePassword = 'identical-password';
      const encryptions = Array.from({ length: 5 }, () => encryptField(samePassword));
      
      // All should decrypt to same value
      const decrypted = encryptions.map(enc => decryptField(enc));
      expect(decrypted.every(dec => dec === samePassword)).toBe(true);
      
      // But all encrypted values should be different (unique salts + IVs)
      const uniqueEncryptions = new Set(encryptions);
      expect(uniqueEncryptions.size).toBe(encryptions.length);
    });
  });

  describe('error handling', () => {
    it('should use fallback key in test environment when ENCRYPTION_KEY is missing', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      // In test environment, functions should still work with fallback key
      const testValue = 'test-value';
      const encrypted = encryptField(testValue);
      expect(isEncrypted(encrypted)).toBe(true);
      expect(encrypted.split(':')).toHaveLength(4); // New format
      
      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe(testValue);

      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should fail gracefully with clear error messages', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Test with missing key in non-test environment
      process.env.NODE_ENV = 'production';
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => encryptField('test')).toThrow('ENCRYPTION_KEY environment variable is required');
      
      // Restore environment
      process.env.ENCRYPTION_KEY = originalKey;
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('security improvements verification', () => {
    it('should no longer use fixed salt (security fix validation)', () => {
      const plaintext = 'security-test-value';
      
      // Encrypt the same value multiple times
      const encryptions = Array.from({ length: 10 }, () => encryptField(plaintext));
      
      // Extract salts (first part before first colon)
      const salts = encryptions.map(enc => enc.split(':')[0]);
      
      // All salts should be different (proving we're not using a fixed salt)
      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(salts.length);
      
      // All should be proper hex format
      expect(salts.every(salt => /^[0-9a-f]+$/i.test(salt))).toBe(true);
      
      // All should be proper length (32 bytes = 64 hex chars)
      expect(salts.every(salt => salt.length === 64)).toBe(true);
    });

    it('should use proper salt length for security', () => {
      const encrypted = encryptField('test-salt-length');
      const saltHex = encrypted.split(':')[0];
      
      // Salt should be 32 bytes = 64 hex characters
      expect(saltHex.length).toBe(64);
      expect(/^[0-9a-f]+$/i.test(saltHex)).toBe(true);
    });
  });
}); 