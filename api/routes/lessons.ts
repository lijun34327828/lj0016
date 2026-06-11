import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requireRoles } from '../middleware/permissions'
import {
  createBatchLessons,
  getLessons,
  postponeLessonById,
  updateLessonStatus,
} from '../controllers/lessonController'

const router = Router()

router.post(
  '/batch',
  authMiddleware,
  requireRoles('admin', 'coach'),
  async (req: Request, res: Response): Promise<void> => {
    await createBatchLessons(req, res)
  },
)

router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    await getLessons(req, res)
  },
)

router.put(
  '/:id/postpone',
  authMiddleware,
  requireRoles('admin', 'coach'),
  async (req: Request, res: Response): Promise<void> => {
    await postponeLessonById(req, res)
  },
)

router.put(
  '/:id/status',
  authMiddleware,
  requireRoles('admin', 'coach'),
  async (req: Request, res: Response): Promise<void> => {
    await updateLessonStatus(req, res)
  },
)

export default router
