// Set test environment before importing modules
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-purposes-that-is-long-enough';

const { encryptField, decryptField, isEncrypted } = require('../../src/utils/encryption');

// Mock logger - must be set up before any imports
jest.mock('../../src/config/logger', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('Event Encryption Utilities', () => {
  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt contactEmail field correctly', () => {
      const originalEmail = 'contact@example.com';
      const encrypted = encryptField(originalEmail);
      
      expect(isEncrypted(encrypted)).toBe(true);
      expect(encrypted).not.toBe(originalEmail);
      
      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe(originalEmail);
    });

    it('should handle null values correctly', () => {
      expect(encryptField(null)).toBe(null);
      expect(decryptField(null)).toBe(null);
    });

    it('should handle empty string values correctly', () => {
      const encrypted = encryptField('');
      expect(isEncrypted(encrypted)).toBe(true);
      
      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe('');
    });

    it('should detect non-encrypted strings correctly', () => {
      expect(isEncrypted('plaintext@example.com')).toBe(false);
      expect(isEncrypted('regular string')).toBe(false);
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted(null)).toBe(false);
    });

    it('should handle invalid encrypted data gracefully', () => {
      const mockLogger = require('../../src/config/logger').default;
      mockLogger.error.mockClear();
      
      // Test with invalid encrypted format
      const result = decryptField('invalid-encrypted-data');
      
      // Should return the original value if decryption fails
      expect(result).toBe('invalid-encrypted-data');
    });
  });

  describe('Event Data Encryption Patterns', () => {
    it('should encrypt contactEmail while preserving other fields', () => {
      const eventData = {
        id: 'test-event-id',
        name: 'Test Event',
        slug: 'test-event',
        contactEmail: 'contact@example.com',
        description: 'Event description',
      };

      const encryptedContactEmail = encryptField(eventData.contactEmail);
      
      // Simulate what the service does
      const processedEvent = {
        ...eventData,
        contactEmail: encryptedContactEmail
      };

      expect(processedEvent.contactEmail).not.toBe(eventData.contactEmail);
      expect(isEncrypted(processedEvent.contactEmail)).toBe(true);
      expect(processedEvent.name).toBe(eventData.name); // Other fields unchanged
      expect(processedEvent.description).toBe(eventData.description);
      
      // Decrypt back
      const decryptedEvent = {
        ...processedEvent,
        contactEmail: isEncrypted(processedEvent.contactEmail) ? 
          decryptField(processedEvent.contactEmail) : 
          processedEvent.contactEmail
      };
      
      expect(decryptedEvent.contactEmail).toBe(eventData.contactEmail);
    });

    it('should handle mixed encrypted and non-encrypted data', () => {
      const events = [
        {
          id: 'event-1',
          contactEmail: encryptField('encrypted@example.com'),
        },
        {
          id: 'event-2',
          contactEmail: 'plaintext@example.com',
        },
        {
          id: 'event-3',
          contactEmail: null,
        },
      ];

      // Simulate decryption process
      const decryptedEvents = events.map(event => ({
        ...event,
        contactEmail: event.contactEmail && isEncrypted(event.contactEmail) ?
          decryptField(event.contactEmail) :
          event.contactEmail
      }));

      expect(decryptedEvents[0].contactEmail).toBe('encrypted@example.com');
      expect(decryptedEvents[1].contactEmail).toBe('plaintext@example.com');
      expect(decryptedEvents[2].contactEmail).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should handle decryption errors gracefully', () => {
      const mockLogger = require('../../src/config/logger').default;
      mockLogger.error.mockClear();
      
      // This will fail decryption but should not throw
      const invalidEncrypted = 'salt:iv:invaliddata:tag';
      const result = decryptField(invalidEncrypted);
      
      // Should return original value on decryption failure
      expect(result).toBe(invalidEncrypted);
    });

    it('should handle encryption of various data types', () => {
      // Valid string
      expect(() => encryptField('valid string')).not.toThrow();
      
      // Null and undefined
      expect(encryptField(null)).toBe(null);
      expect(encryptField(undefined)).toBe(undefined);
      
      // Empty string
      const encrypted = encryptField('');
      expect(isEncrypted(encrypted)).toBe(true);
      expect(decryptField(encrypted)).toBe('');
    });
  });
}); 