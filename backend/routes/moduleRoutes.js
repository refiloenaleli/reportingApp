const express = require('express');
const {
  createModuleRecord,
  deleteModuleRecord,
  getModuleRecords,
  updateModuleRecord,
} = require('../controllers/moduleController');
const { authenticateRequest } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateRequest);
router.get('/:moduleKey', getModuleRecords);
router.post('/:moduleKey', createModuleRecord);
router.put('/:moduleKey/:id', updateModuleRecord);
router.delete('/:moduleKey/:id', deleteModuleRecord);

module.exports = router;
