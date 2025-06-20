const { EmailService } = require('../../src/utils/email');

describe('Email Service Security Tests', () => {
  let emailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  describe('Template Path Traversal Protection', () => {
    test('should reject template names with path traversal sequences', () => {
      expect(() => {
        emailService.renderTemplate('../../../etc/passwd', {});
      }).toThrow('Template name contains invalid characters');
    });

    test('should reject template names with slashes', () => {
      expect(() => {
        emailService.renderTemplate('../../malicious', {});
      }).toThrow('Template name contains invalid characters');
    });

    test('should reject template names with backslashes', () => {
      expect(() => {
        emailService.renderTemplate('..\\..\\malicious', {});
      }).toThrow('Template name contains invalid characters');
    });

    test('should reject empty template names', () => {
      expect(() => {
        emailService.renderTemplate('', {});
      }).toThrow('Invalid template name');
    });

    test('should reject null template names', () => {
      expect(() => {
        emailService.renderTemplate(null, {});
      }).toThrow('Invalid template name');
    });

    test('should reject template names with special characters', () => {
      expect(() => {
        emailService.renderTemplate('template@#$%', {});
      }).toThrow('Template name contains invalid characters');
    });

    test('should accept valid template names', () => {
      // This should not throw an error for valid names (though the file might not exist)
      expect(() => {
        emailService.renderTemplate('valid-template_123', {});
      }).toThrow('Template file not found'); // This is expected since the file doesn't exist
    });

    test('should reject template names that become empty after sanitization', () => {
      expect(() => {
        emailService.renderTemplate('!@#$%^&*()', {});
      }).toThrow('Template name contains invalid characters');
    });
  });

  describe('Path Resolution Security', () => {
    test('should ensure template path stays within allowed directory', () => {
      // Test that even if somehow a path traversal gets through sanitization,
      // the path resolution check would catch it
      const originalJoin = require('path').join;
      const originalResolve = require('path').resolve;
      
      // Mock path.join to simulate a bypass attempt
      require('path').join = jest.fn(() => '/etc/passwd');
      require('path').resolve = jest.fn()
        .mockReturnValueOnce('/app/backend/src/email-templates') // emailTemplatesDir
        .mockReturnValueOnce('/etc/passwd'); // resolvedTemplatePath
      
      expect(() => {
        emailService.renderTemplate('notification', {});
      }).toThrow('Template path is outside allowed directory');
      
      // Restore original functions
      require('path').join = originalJoin;
      require('path').resolve = originalResolve;
    });
  });
}); 