const express = require('express');
const app = express();

app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mutating user creation
app.post('/users', (req, res) => {
  res.status(201).json({ id: 1, name: req.body.name });
});

app.listen(3000);
