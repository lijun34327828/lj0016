import { Router } from 'express'
import { createLeave, getLeaves, auditLeave } from '../controllers/leaveController.js'
import authMiddleware from '../middleware/auth.js'
import requireRoles from '../middleware/permissions.js'

const router = Router()

router.post(
  '/',
  authMiddleware,
  requireRoles('student'),
  createLeave,
)

router.get(
  '/',
  authMiddleware,
  getLeaves,
)

router.put(
  '/:id/audit',
  authMiddleware,
  requireRoles('admin', 'coach'),
  auditLeave,
)

export default router
