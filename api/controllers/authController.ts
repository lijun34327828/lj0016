import { type Request, type Response } from 'express'
import { login, getCurrentUser } from '../services/authService.js'
import type { LoginRequest, LoginResponse } from '../../shared/types.js'
import db from '../db/index.js'

export const loginController = (
  req: Request,
  res: Response,
): void => {
  try {
    const { username, password, role } = req.body as LoginRequest

    const result = login(username, password, role)

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
      })
      return
    }

    res.json({
      success: true,
      data: result.data,
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试',
    })
  }
}

export const getCurrentUserController = (
  req: Request,
  res: Response,
): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '用户未认证',
      })
      return
    }

    const result = getCurrentUser(req.user.id)

    if (!result.success || !result.user) {
      res.status(404).json({
        success: false,
        message: result.message,
      })
      return
    }

    const response: LoginResponse = {
      token: '',
      user: result.user,
    }

    if (result.user.role === 'student') {
      const studentRow = db
        .prepare('SELECT id FROM students WHERE user_id = ?')
        .get(result.user.id) as { id: number } | undefined

      if (studentRow) {
        response.studentId = studentRow.id
      }
    }

    if (result.user.role === 'coach') {
      const coachRow = db
        .prepare('SELECT id FROM coaches WHERE user_id = ?')
        .get(result.user.id) as { id: number } | undefined

      if (coachRow) {
        response.coachId = coachRow.id
      }
    }

    res.json({
      success: true,
      data: response,
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '获取用户信息失败，请稍后重试',
    })
  }
}

export default {
  loginController,
  getCurrentUserController,
}
