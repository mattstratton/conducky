const express = require('express');
const app = express();
const PORT = 4000;

app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running!' });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
}); 