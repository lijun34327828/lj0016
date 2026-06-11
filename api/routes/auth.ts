import { Router, type Request, type Response } from 'express'
import {
  loginController,
  getCurrentUserController,
} from '../controllers/authController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', (req: Request, res: Response): void => {
  loginController(req, res)
})

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  getCurrentUserController(req, res)
})

export default router
