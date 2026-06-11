import { type Request, type Response } from 'express'
import db from '../db'
import { checkBookingConflict } from '../services/conflictService'
import type { Booking, ConflictInfo, ApiResponse } from '../../shared/types'

function mapBookingRow(row: {
  id: number
  student_id: number
  type: string
  subject?: number
  venue_id: number
  coach_id?: number
  date: string
  start_time: string
  end_time: string
  status: string
} & { studentName?: string; venueName?: string; coachName?: string }): Booking {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.studentName,
    type: row.type as Booking['type'],
    subject: row.subject,
    venueId: row.venue_id,
    venueName: row.venueName,
    coachId: row.coach_id,
    coachName: row.coachName,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status as Booking['status'],
  }
}

function getStudentIdByUserId(userId: number): number | null {
  const row = db
    .prepare('SELECT id FROM students WHERE user_id = ?')
    .get(userId) as { id: number } | undefined
  return row?.id ?? null
}

export const createBooking = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { studentId, type, subject, venueId, coachId, date, startTime, endTime } =
    req.body

  if (!studentId || !type || !venueId || !date || !startTime || !endTime) {
    res.status(400).json({
      success: false,
      error: '缺少必要参数',
    } as ApiResponse)
    return
  }

  const conflict = checkBookingConflict(
    studentId,
    venueId,
    coachId ?? null,
    date,
    startTime,
    endTime,
  )

  if (conflict.hasConflict) {
    res.status(400).json({
      success: false,
      error: '存在时间冲突',
      data: conflict,
    } as ApiResponse<ConflictInfo>)
    return
  }

  const insertStmt = db.prepare(`
    INSERT INTO bookings (student_id, type, subject, venue_id, coach_id, date, start_time, end_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `)

  const result = insertStmt.run(
    studentId,
    type,
    subject ?? null,
    venueId,
    coachId ?? null,
    date,
    startTime,
    endTime,
  )

  const bookingId = result.lastInsertRowid as number

  const bookingRow = db
    .prepare(
      `SELECT b.*, s.name as studentName, v.name as venueName, c.name as coachName
       FROM bookings b
       JOIN students s ON b.student_id = s.id
       JOIN venues v ON b.venue_id = v.id
       LEFT JOIN coaches c ON b.coach_id = c.id
       WHERE b.id = ?`,
    )
    .get(bookingId)

  const booking = mapBookingRow(
    bookingRow as Parameters<typeof mapBookingRow>[0],
  )

  res.json({
    success: true,
    data: booking,
    message: '预约创建成功',
  } as ApiResponse<Booking>)
}

export const getBookings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { type, status, startDate, endDate } = req.query

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: '用户未认证',
    } as ApiResponse)
    return
  }

  const conditions: string[] = []
  const params: unknown[] = []

  if (type) {
    conditions.push('b.type = ?')
    params.push(type)
  }

  if (status) {
    conditions.push('b.status = ?')
    params.push(status)
  }

  if (startDate) {
    conditions.push('b.date >= ?')
    params.push(startDate)
  }

  if (endDate) {
    conditions.push('b.date <= ?')
    params.push(endDate)
  }

  if (req.user.role === 'student') {
    const studentId = getStudentIdByUserId(req.user.id)
    if (studentId) {
      conditions.push('b.student_id = ?')
      params.push(studentId)
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const bookingRows = db
    .prepare(
      `SELECT b.*, s.name as studentName, v.name as venueName, c.name as coachName
       FROM bookings b
       JOIN students s ON b.student_id = s.id
       JOIN venues v ON b.venue_id = v.id
       LEFT JOIN coaches c ON b.coach_id = c.id
       ${whereClause}
       ORDER BY b.date DESC, b.start_time DESC`,
    )
    .all(...params)

  const bookings = bookingRows.map((row) =>
    mapBookingRow(row as Parameters<typeof mapBookingRow>[0]),
  )

  res.json({
    success: true,
    data: bookings,
  } as ApiResponse<Booking[]>)
}

export const checkConflict = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { studentId, venueId, coachId, date, startTime, endTime } = req.body

  if (!studentId || !venueId || !date || !startTime || !endTime) {
    res.status(400).json({
      success: false,
      error: '缺少必要参数',
    } as ApiResponse)
    return
  }

  const conflict = checkBookingConflict(
    studentId,
    venueId,
    coachId ?? null,
    date,
    startTime,
    endTime,
  )

  res.json({
    success: true,
    data: conflict,
  } as ApiResponse<ConflictInfo>)
}

export const cancelBooking = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params

  const bookingRow = db
    .prepare('SELECT * FROM bookings WHERE id = ?')
    .get(Number(id))

  if (!bookingRow) {
    res.status(404).json({
      success: false,
      error: '预约不存在',
    } as ApiResponse)
    return
  }

  const booking = mapBookingRow(
    bookingRow as Parameters<typeof mapBookingRow>[0],
  )

  if (booking.status === 'cancelled') {
    res.status(400).json({
      success: false,
      error: '预约已取消',
    } as ApiResponse)
    return
  }

  if (req.user?.role === 'student') {
    const studentId = getStudentIdByUserId(req.user.id)
    if (studentId && booking.studentId !== studentId) {
      res.status(403).json({
        success: false,
        error: '无权取消他人的预约',
      } as ApiResponse)
      return
    }
  }

  const updateStmt = db.prepare(
    "UPDATE bookings SET status = 'cancelled' WHERE id = ?",
  )
  updateStmt.run(Number(id))

  const updatedRow = db
    .prepare(
      `SELECT b.*, s.name as studentName, v.name as venueName, c.name as coachName
       FROM bookings b
       JOIN students s ON b.student_id = s.id
       JOIN venues v ON b.venue_id = v.id
       LEFT JOIN coaches c ON b.coach_id = c.id
       WHERE b.id = ?`,
    )
    .get(Number(id))

  const updatedBooking = mapBookingRow(
    updatedRow as Parameters<typeof mapBookingRow>[0],
  )

  res.json({
    success: true,
    data: updatedBooking,
    message: '预约已取消',
  } as ApiResponse<Booking>)
}

export default {
  createBooking,
  getBookings,
  checkConflict,
  cancelBooking,
}
