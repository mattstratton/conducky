const { requireRole } = require('../../utils/rbac');

describe('requireRole middleware', () => {
  it('should return 401 if not authenticated', async () => {
    // Arrange
    const allowedRoles = ['Admin'];
    const middleware = requireRole(allowedRoles);
    const req = {
      isAuthenticated: () => false,
      user: null,
      params: {},
      query: {},
      body: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    // Act
    await middleware(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });
}); 