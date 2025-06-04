const express = require('express');
const app = express();
const PORT = 4000;
const { logAudit } = require('./utils/audit');

app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running!' });
});

app.get('/audit-test', async (req, res) => {
  // Example usage: log a test audit event
  try {
    await logAudit({
      eventId: '902288b2-388a-4292-83b6-4c30e566a413',
      userId: null, // or a real user ID if available
      action: 'test_action',
      targetType: 'Test',
      targetId: '123',
    });
    res.json({ message: 'Audit event logged!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log audit event', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
}); 