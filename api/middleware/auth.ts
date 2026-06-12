import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { User } from '../../shared/types.js'

const JWT_SECRET = 'DRIVING_SCHOOL_SECRET_KEY_2024'

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: '未提供认证令牌',
    })
    return
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: '认证令牌格式错误',
    })
    return
  }

  const token = parts[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; role: string }
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role as User['role'],
    } as User
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      error: '认证令牌无效或已过期',
    })
  }
}

export default authMiddleware
