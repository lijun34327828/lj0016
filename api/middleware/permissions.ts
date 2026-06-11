import { type Request, type Response, type NextFunction } from 'express'
import type { UserRole } from '../../shared/types.js'

export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '用户未认证',
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: '权限不足，无法访问此资源',
      })
      return
    }

    next()
  }
}

export default requireRoles
