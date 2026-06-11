import { Router } from 'express'
import {
  createScore,
  getScores,
  archiveStudent,
  getDashboardStats,
  getReminders,
  getArchiveCandidates,
  getArchivedStudents,
} from '../controllers/examController.js'
import authMiddleware from '../middleware/auth.js'
import requireRoles from '../middleware/permissions.js'

const router = Router()

router.post(
  '/scores',
  authMiddleware,
  requireRoles('admin', 'coach'),
  createScore,
)

router.get(
  '/scores',
  authMiddleware,
  getScores,
)

router.get(
  '/archive/candidates',
  authMiddleware,
  requireRoles('admin'),
  getArchiveCandidates,
)

router.get(
  '/archive',
  authMiddleware,
  requireRoles('admin'),
  getArchivedStudents,
)

router.post(
  '/archive',
  authMiddleware,
  requireRoles('admin'),
  archiveStudent,
)

router.get(
  '/dashboard/stats',
  authMiddleware,
  getDashboardStats,
)

router.get(
  '/dashboard/reminders',
  authMiddleware,
  getReminders,
)

export default router
export { getDashboardStats, getReminders }
