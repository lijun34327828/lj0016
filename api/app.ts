/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import authMiddleware from './middleware/auth.js'
import requireRoles from './middleware/permissions.js'
import leaveRoutes from './routes/leaves.js'
import examRoutes, { getDashboardStats, getReminders } from './routes/exams.js'
import systemRoutes from './routes/system.js'
import studentRoutes from './routes/students.js'
import bookingRoutes from './routes/bookings.js'
import lessonRoutes from './routes/lessons.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * Static files
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/leaves', leaveRoutes)
app.use('/api/exams', examRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/lessons', lessonRoutes)
app.get('/api/dashboard/stats', authMiddleware, requireRoles('admin', 'coach'), getDashboardStats)
app.get('/api/dashboard/reminders', authMiddleware, getReminders)
app.use('/api', systemRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
