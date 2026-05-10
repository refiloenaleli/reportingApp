const express = require('express');
const {
  createReport,
  deleteReport,
  getReports,
  updateReport,
} = require('../controllers/reportController');
const { authenticateRequest } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateRequest);
router.post('/', createReport);
router.get('/', getReports);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

module.exports = router;
