import { Router, type Request, type Response } from 'express'
import authMiddleware from '../middleware/auth.js'
import requireRoles from '../middleware/permissions.js'
import {
  getMakeupLessons,
  checkMakeupConflict,
  scheduleMakeup,
  cancelMakeup,
} from '../controllers/makeupController.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    await getMakeupLessons(req, res)
  },
)

router.post(
  '/check-conflict',
  authMiddleware,
  requireRoles('admin', 'coach'),
  async (req: Request, res: Response): Promise<void> => {
    await checkMakeupConflict(req, res)
  },
)

router.post(
  '/schedule',
  authMiddleware,
  requireRoles('admin', 'coach'),
  async (req: Request, res: Response): Promise<void> => {
    await scheduleMakeup(req, res)
  },
)

router.put(
  '/:id/cancel',
  authMiddleware,
  requireRoles('admin', 'coach'),
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await cancelMakeup(req, res)
  },
)

export default router
