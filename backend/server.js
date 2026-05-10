const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');

const PORT = Number(process.env.PORT || 3001);
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (request, response) => {
  response.status(200).json({
    message: 'LIMKOKWING Express backend is running.',
    rubricCollections: ['users', 'reports', 'ratings', 'monitoring', 'attendance', 'courses', 'lectures', 'notifications'],
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/reports',
      'GET /api/reports',
      'PUT /api/reports/:id',
      'DELETE /api/reports/:id',
      'GET /api/modules/:moduleKey',
      'POST /api/modules/:moduleKey',
      'PUT /api/modules/:moduleKey/:id',
      'DELETE /api/modules/:moduleKey/:id',
      'POST /api/notifications/token',
      'GET /api/notifications',
      'PUT /api/notifications/:id/read',
      'GET /api/users',
      'POST /api/users/lecturers',
    ],
  });
});

app.get('/api/health', (request, response) => {
  response.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

app.use((request, response) => {
  response.status(404).json({
    message: 'Route not found.',
  });
});

app.use((error, request, response, next) => {
  console.error('Unhandled server error:', error);
  response.status(500).json({
    message: 'Internal server error.',
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
