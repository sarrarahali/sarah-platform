const express = require('express')
const router = express.Router()
const { getDeployments } = require('../controllers/deploymentController')
const protect = require('../middleware/authMiddleware')

router.use(protect)
router.get('/:id/history', getDeployments)

module.exports = router
