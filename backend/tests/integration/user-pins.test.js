const request = require('supertest');
const app = require('../../index');

describe('User Pins API', () => {
  it('should list zero pins by default', async () => {
    const res = await request(app)
      .get('/api/users/me/pins')
      .set('x-test-user-id', '1')
      .expect(200);
    expect(Array.isArray(res.body.incidentIds)).toBe(true);
  });

  it('should pin and unpin an incident for the current user', async () => {
    // Pin
    await request(app)
      .post('/api/users/me/pins')
      .set('x-test-user-id', '1')
      .send({ incidentId: 'r1', eventId: '1' })
      .expect(204);

    // Verify in list
    const afterPin = await request(app)
      .get('/api/users/me/pins')
      .set('x-test-user-id', '1')
      .expect(200);
    expect(afterPin.body.incidentIds).toContain('r1');

    // Unpin
    await request(app)
      .delete('/api/users/me/pins/r1')
      .set('x-test-user-id', '1')
      .expect(204);

    const afterUnpin = await request(app)
      .get('/api/users/me/pins')
      .set('x-test-user-id', '1')
      .expect(200);
    expect(afterUnpin.body.incidentIds).not.toContain('r1');
  });

  it('should validate required fields', async () => {
    const res = await request(app)
      .post('/api/users/me/pins')
      .set('x-test-user-id', '1')
      .send({ incidentId: 'r1' })
      .expect(400);
    expect(res.body.error).toBeDefined();
  });
});
