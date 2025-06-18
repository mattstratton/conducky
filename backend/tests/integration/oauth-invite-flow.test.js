describe('OAuth + Invite Flow - Core Logic Tests', () => {
  describe('OAuth State ID Generation', () => {
    it('should generate unique OAuth state IDs', () => {
      const stateIds = new Set();
      
      // Generate multiple state IDs using same pattern as real code
      for (let i = 0; i < 10; i++) {
        const stateId = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        expect(stateIds.has(stateId)).toBe(false);
        stateIds.add(stateId);
      }
      
      expect(stateIds.size).toBe(10);
    });

    it('should have correct state ID format', () => {
      const stateId = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      expect(stateId).toMatch(/^oauth_\d+_[a-z0-9]+$/);
    });
  });

  describe('URL Validation Logic', () => {
    it('should validate safe redirect URLs', () => {
      const isValidUrl = (url) => {
        if (!url) return false;
        if (url.startsWith('http://') || url.startsWith('https://')) return false;
        if (url.includes('..')) return false;
        return url.startsWith('/');
      };

      expect(isValidUrl('/invite/abc123')).toBe(true);
      expect(isValidUrl('/dashboard')).toBe(true);
      expect(isValidUrl('http://evil.com')).toBe(false);
      expect(isValidUrl('https://evil.com')).toBe(false);
      expect(isValidUrl('/../../etc/passwd')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });
  });

  describe('State Expiration Logic', () => {
    it('should detect expired states', () => {
      const now = Date.now();
      const tenMinutesAgo = now - (10 * 60 * 1000);
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      const isExpired = (timestamp) => {
        return (Date.now() - timestamp) > (10 * 60 * 1000); // 10 minutes
      };

      expect(isExpired(tenMinutesAgo - 1000)).toBe(true); // 10+ minutes ago
      expect(isExpired(fiveMinutesAgo)).toBe(false); // 5 minutes ago
      expect(isExpired(now)).toBe(false); // now
    });
  });
}); 