const express = require('express');
const { authenticateRequest } = require('../middleware/authMiddleware');
const { createLecturer, listUsers } = require('../controllers/userController');

const router = express.Router();

router.use(authenticateRequest);
router.get('/', listUsers);
router.post('/lecturers', createLecturer);

module.exports = router;
