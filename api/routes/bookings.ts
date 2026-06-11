import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  createBooking,
  getBookings,
  checkConflict,
  cancelBooking,
} from '../controllers/bookingController'

const router = Router()

router.post(
  '/',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    await createBooking(req, res)
  },
)

router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    await getBookings(req, res)
  },
)

router.post(
  '/check-conflict',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    await checkConflict(req, res)
  },
)

router.delete(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    await cancelBooking(req, res)
  },
)

export default router
