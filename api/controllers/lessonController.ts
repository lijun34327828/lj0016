import { type Request, type Response } from 'express'
import db from '../db'
import { generateBatchSchedule, postponeLesson } from '../services/scheduleService'
import type {
  Lesson,
  BatchScheduleRequest,
  ApiResponse,
  LessonStatus,
} from '../../shared/types'

function mapLessonRow(row: {
  id: number
  coach_id: number
  venue_id: number
  student_ids: string
  date: string
  start_time: string
  end_time: string
  subject: number
  status: string
  group_id?: number
} & { coachName?: string; venueName?: string; studentNames?: string[] }): Lesson {
  return {
    id: row.id,
    coachId: row.coach_id,
    coachName: row.coachName,
    venueId: row.venue_id,
    venueName: row.venueName,
    studentIds: JSON.parse(row.student_ids),
    studentNames: row.studentNames,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    subject: row.subject,
    status: row.status as Lesson['status'],
    groupId: row.group_id,
  }
}

function getStudentIdByUserId(userId: number): number | null {
  const row = db
    .prepare('SELECT id FROM students WHERE user_id = ?')
    .get(userId) as { id: number } | undefined
  return row?.id ?? null
}

function getCoachIdByUserId(userId: number): number | null {
  const row = db
    .prepare('SELECT id FROM coaches WHERE user_id = ?')
    .get(userId) as { id: number } | undefined
  return row?.id ?? null
}

export const createBatchLessons = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const params = req.body as BatchScheduleRequest

  const result = generateBatchSchedule(params)

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: result.message,
    } as ApiResponse)
    return
  }

  res.json({
    success: true,
    data: {
      lessons: result.lessons,
      skipped: result.skipped,
    },
    message: result.message,
  } as ApiResponse<{
    lessons: Lesson[]
    skipped: { date: string; reason: string }[]
  }>)
}

export const getLessons = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { coachId, venueId, startDate, endDate, status } = req.query

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: '用户未认证',
    } as ApiResponse)
    return
  }

  const conditions: string[] = []
  const params: unknown[] = []

  if (coachId) {
    conditions.push('l.coach_id = ?')
    params.push(coachId)
  }

  if (venueId) {
    conditions.push('l.venue_id = ?')
    params.push(venueId)
  }

  if (startDate) {
    conditions.push('l.date >= ?')
    params.push(startDate)
  }

  if (endDate) {
    conditions.push('l.date <= ?')
    params.push(endDate)
  }

  if (status) {
    conditions.push('l.status = ?')
    params.push(status)
  }

  if (req.user.role === 'student') {
    const studentId = getStudentIdByUserId(req.user.id)
    if (studentId) {
      conditions.push('json_valid(l.student_ids) AND json_extract(l.student_ids, "$[0]") IS NOT NULL')
      conditions.push(`EXISTS (
        SELECT 1 FROM json_each(l.student_ids) 
        WHERE json_each.value = ?
      )`)
      params.push(studentId)
    }
  }

  if (req.user.role === 'coach') {
    const coachIdFromUser = getCoachIdByUserId(req.user.id)
    if (coachIdFromUser) {
      conditions.push('l.coach_id = ?')
      params.push(coachIdFromUser)
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const lessonRows = db
    .prepare(
      `SELECT l.*, c.name as coachName, v.name as venueName
       FROM lessons l
       JOIN coaches c ON l.coach_id = c.id
       JOIN venues v ON l.venue_id = v.id
       ${whereClause}
       ORDER BY l.date DESC, l.start_time DESC`,
    )
    .all(...params)

  const lessons = lessonRows.map((row) => {
    const lessonRow = row as Parameters<typeof mapLessonRow>[0]
    const studentIds = JSON.parse(lessonRow.student_ids)
    const students = db
      .prepare(
        `SELECT name FROM students WHERE id IN (${studentIds.map(() => '?').join(',')})`,
      )
      .all(...studentIds) as { name: string }[]
    return mapLessonRow({
      ...lessonRow,
      studentNames: students.map((s) => s.name),
    })
  })

  res.json({
    success: true,
    data: lessons,
  } as ApiResponse<Lesson[]>)
}

export const postponeLessonById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params
  const { days } = req.body

  if (!days || days <= 0) {
    res.status(400).json({
      success: false,
      error: '顺延天数必须大于0',
    } as ApiResponse)
    return
  }

  const result = postponeLesson(Number(id), days)

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: result.message,
    } as ApiResponse)
    return
  }

  res.json({
    success: true,
    data: result.lesson,
    message: result.message,
  } as ApiResponse<Lesson>)
}

export const updateLessonStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params
  const { status } = req.body as { status: LessonStatus }

  const validStatuses: LessonStatus[] = [
    'scheduled',
    'completed',
    'cancelled',
    'leave',
  ]

  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      error: '无效的状态值',
    } as ApiResponse)
    return
  }

  const lessonRow = db
    .prepare('SELECT * FROM lessons WHERE id = ?')
    .get(Number(id))

  if (!lessonRow) {
    res.status(404).json({
      success: false,
      error: '课时不存在',
    } as ApiResponse)
    return
  }

  const updateStmt = db.prepare('UPDATE lessons SET status = ? WHERE id = ?')
  updateStmt.run(status, Number(id))

  const updatedRow = db
    .prepare(
      `SELECT l.*, c.name as coachName, v.name as venueName
       FROM lessons l
       JOIN coaches c ON l.coach_id = c.id
       JOIN venues v ON l.venue_id = v.id
       WHERE l.id = ?`,
    )
    .get(Number(id))

  const lesson = mapLessonRow(
    updatedRow as Parameters<typeof mapLessonRow>[0],
  )

  const studentIds = lesson.studentIds
  const students = db
    .prepare(
      `SELECT name FROM students WHERE id IN (${studentIds.map(() => '?').join(',')})`,
    )
    .all(...studentIds) as { name: string }[]

  res.json({
    success: true,
    data: {
      ...lesson,
      studentNames: students.map((s) => s.name),
    },
    message: '课时状态已更新',
  } as ApiResponse<Lesson>)
}

export default {
  createBatchLessons,
  getLessons,
  postponeLessonById,
  updateLessonStatus,
}
