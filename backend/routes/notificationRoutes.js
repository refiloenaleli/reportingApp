const express = require('express');
const {
  listNotifications,
  readNotification,
  registerToken,
} = require('../controllers/notificationController');
const { authenticateRequest } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateRequest);
router.post('/token', registerToken);
router.get('/', listNotifications);
router.put('/:id/read', readNotification);

module.exports = router;
