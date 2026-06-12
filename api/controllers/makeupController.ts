import { type Request, type Response } from 'express'
import db from '../db/index.js'
import { checkLessonConflict } from '../services/conflictService.js'
import type {
  MakeupLesson,
  ScheduleMakeupRequest,
  ApiResponse,
  ConflictInfo,
  Lesson,
} from '../../shared/types.js'

function mapMakeupLessonRow(row: {
  id: number
  student_id: number
  student_name: string
  original_lesson_id: number
  subject: number
  original_date: string
  original_start_time: string
  original_end_time: string
  status: string
  makeup_lesson_id?: number
  makeup_date?: string
  makeup_start_time?: string
  makeup_end_time?: string
  created_at: string
}): MakeupLesson {
  const originalLessonInfo = `${row.original_date} ${row.original_start_time}-${row.original_end_time}`
  let makeupLessonInfo: string | undefined
  if (row.makeup_lesson_id && row.makeup_date && row.makeup_start_time && row.makeup_end_time) {
    makeupLessonInfo = `${row.makeup_date} ${row.makeup_start_time}-${row.makeup_end_time}`
  }

  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    originalLessonId: row.original_lesson_id,
    originalLessonInfo,
    subject: row.subject,
    originalDate: row.original_date,
    originalStartTime: row.original_start_time,
    originalEndTime: row.original_end_time,
    status: row.status as MakeupLesson['status'],
    makeupLessonId: row.makeup_lesson_id,
    makeupLessonInfo,
    createdAt: row.created_at,
  }
}

export const getMakeupLessons = async (
  req: Request,
  res: Response<ApiResponse<MakeupLesson[]>>,
): Promise<void> => {
  try {
    const { status, studentId } = req.query

    const conditions: string[] = []
    const params: unknown[] = []

    if (status) {
      conditions.push('ml.status = ?')
      params.push(status)
    }

    if (studentId) {
      conditions.push('ml.student_id = ?')
      params.push(studentId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT ml.*, s.name as student_name,
             l.date as makeup_date, l.start_time as makeup_start_time, l.end_time as makeup_end_time
      FROM makeup_lessons ml
      JOIN students s ON ml.student_id = s.id
      LEFT JOIN lessons l ON ml.makeup_lesson_id = l.id
      ${whereClause}
      ORDER BY ml.created_at DESC
    `

    const rows = db.prepare(query).all(...params) as Array<Parameters<typeof mapMakeupLessonRow>[0]>

    const makeupLessons = rows.map(mapMakeupLessonRow)

    res.json({
      success: true,
      data: makeupLessons,
    })
  } catch (error) {
    console.error('获取待补课列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const checkMakeupConflict = async (
  req: Request<unknown, unknown, { coachId: number; venueId: number; date: string; startTime: string; endTime: string; studentId: number }>,
  res: Response<ApiResponse<ConflictInfo>>,
): Promise<void> => {
  try {
    const { coachId, venueId, date, startTime, endTime, studentId } = req.body

    if (!coachId || !venueId || !date || !startTime || !endTime || !studentId) {
      res.status(400).json({
        success: false,
        error: '教练、场地、日期、时间段、学员不能为空',
      })
      return
    }

    const lessonConflict = checkLessonConflict(coachId, venueId, date, startTime, endTime)

    const studentConflictRows = db
      .prepare(
        `SELECT l.*, s.name as student_name
         FROM lessons l
         JOIN json_each(l.student_ids) as student_ids
         JOIN students s ON student_ids.value = s.id
         WHERE l.date = ? 
           AND l.status IN ('scheduled', 'completed')
           AND l.start_time < ? 
           AND l.end_time > ?
           AND student_ids.value = ?`,
      )
      .all(date, endTime, startTime, studentId) as Array<{
      id: number
      start_time: string
      end_time: string
      student_name: string
    }>

    const conflicts = [...lessonConflict.conflicts]

    for (const row of studentConflictRows) {
      conflicts.push({
        type: 'student',
        id: studentId,
        name: row.student_name,
        startTime: row.start_time,
        endTime: row.end_time,
      })
    }

    res.json({
      success: true,
      data: {
        hasConflict: conflicts.length > 0,
        conflicts,
      },
    })
  } catch (error) {
    console.error('检查补课冲突失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const scheduleMakeup = async (
  req: Request<unknown, unknown, ScheduleMakeupRequest>,
  res: Response<ApiResponse<{ makeupLesson: MakeupLesson; lesson: Lesson }>>,
): Promise<void> => {
  try {
    const { makeupLessonId, coachId, venueId, date, startTime, endTime } = req.body

    if (!makeupLessonId || !coachId || !venueId || !date || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: '待补课记录、教练、场地、日期、时间段不能为空',
      })
      return
    }

    const makeupRow = db
      .prepare(
        'SELECT ml.*, s.name as student_name FROM makeup_lessons ml JOIN students s ON ml.student_id = s.id WHERE ml.id = ?',
      )
      .get(makeupLessonId) as (Parameters<typeof mapMakeupLessonRow>[0] & { student_id: number }) | undefined

    if (!makeupRow) {
      res.status(404).json({
        success: false,
        error: '待补课记录不存在',
      })
      return
    }

    if (makeupRow.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: '该待补课记录已安排或已取消',
      })
      return
    }

    const studentId = makeupRow.student_id

    const conflictCheck = checkLessonConflict(coachId, venueId, date, startTime, endTime)

    const studentConflictRows = db
      .prepare(
        `SELECT l.*
         FROM lessons l
         JOIN json_each(l.student_ids) as student_ids
         WHERE l.date = ? 
           AND l.status IN ('scheduled', 'completed')
           AND l.start_time < ? 
           AND l.end_time > ?
           AND student_ids.value = ?`,
      )
      .all(date, endTime, startTime, studentId) as Array<{ id: number }>

    if (conflictCheck.hasConflict || studentConflictRows.length > 0) {
      res.status(400).json({
        success: false,
        error: '存在时间冲突，请重新选择时间',
      })
      return
    }

    const existingLessonRow = db
      .prepare(
        `SELECT l.* 
         FROM lessons l 
         WHERE l.coach_id = ? 
           AND l.venue_id = ? 
           AND l.date = ? 
           AND l.start_time = ? 
           AND l.end_time = ? 
           AND l.status = 'scheduled'`,
      )
      .get(coachId, venueId, date, startTime, endTime) as
      | { id: number; student_ids: string; subject: number }
      | undefined

    let newLessonId: number

    if (existingLessonRow) {
      const studentIds: number[] = JSON.parse(existingLessonRow.student_ids)
      if (!studentIds.includes(studentId)) {
        studentIds.push(studentId)
        db.prepare('UPDATE lessons SET student_ids = ? WHERE id = ?').run(
          JSON.stringify(studentIds),
          existingLessonRow.id,
        )
      }
      newLessonId = existingLessonRow.id
    } else {
      const insertLesson = db.prepare(`
        INSERT INTO lessons (coach_id, venue_id, student_ids, date, start_time, end_time, subject, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const result = insertLesson.run(
        coachId,
        venueId,
        JSON.stringify([studentId]),
        date,
        startTime,
        endTime,
        makeupRow.subject,
        'scheduled'
      )
      newLessonId = Number(result.lastInsertRowid)
    }

    db.prepare(
      'UPDATE makeup_lessons SET status = ?, makeup_lesson_id = ? WHERE id = ?',
    ).run('scheduled', newLessonId, makeupLessonId)

    const updatedMakeupRow = db
      .prepare(
        `SELECT ml.*, s.name as student_name,
                l.date as makeup_date, l.start_time as makeup_start_time, l.end_time as makeup_end_time
         FROM makeup_lessons ml
         JOIN students s ON ml.student_id = s.id
         LEFT JOIN lessons l ON ml.makeup_lesson_id = l.id
         WHERE ml.id = ?`,
      )
      .get(makeupLessonId) as Parameters<typeof mapMakeupLessonRow>[0]

    const updatedMakeup = mapMakeupLessonRow(updatedMakeupRow)

    const lessonRow = db
      .prepare(
        `SELECT l.*, c.name as coachName, v.name as venueName
         FROM lessons l
         JOIN coaches c ON l.coach_id = c.id
         JOIN venues v ON l.venue_id = v.id
         WHERE l.id = ?`,
      )
      .get(newLessonId) as {
      id: number
      coach_id: number
      coachName: string
      venue_id: number
      venueName: string
      student_ids: string
      date: string
      start_time: string
      end_time: string
      subject: number
      status: string
      group_id?: number
    }

    const studentIds = JSON.parse(lessonRow.student_ids)
    const students = db
      .prepare(
        `SELECT name FROM students WHERE id IN (${studentIds.map(() => '?').join(',')})`,
      )
      .all(...studentIds) as { name: string }[]

    const lesson: Lesson = {
      id: lessonRow.id,
      coachId: lessonRow.coach_id,
      coachName: lessonRow.coachName,
      venueId: lessonRow.venue_id,
      venueName: lessonRow.venueName,
      studentIds,
      studentNames: students.map((s) => s.name),
      date: lessonRow.date,
      startTime: lessonRow.start_time,
      endTime: lessonRow.end_time,
      subject: lessonRow.subject,
      status: lessonRow.status as Lesson['status'],
      groupId: lessonRow.group_id,
    }

    res.json({
      success: true,
      data: {
        makeupLesson: updatedMakeup,
        lesson,
      },
      message: '补课安排成功',
    })
  } catch (error) {
    console.error('安排补课失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const cancelMakeup = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { id } = req.params

    const makeupRow = db
      .prepare('SELECT * FROM makeup_lessons WHERE id = ?')
      .get(Number(id)) as { id: number; status: string; makeup_lesson_id?: number } | undefined

    if (!makeupRow) {
      res.status(404).json({
        success: false,
        error: '待补课记录不存在',
      })
      return
    }

    if (makeupRow.status === 'scheduled' && makeupRow.makeup_lesson_id) {
      const lessonRow = db
        .prepare('SELECT student_ids FROM lessons WHERE id = ?')
        .get(makeupRow.makeup_lesson_id) as { student_ids: string } | undefined

      if (lessonRow) {
        const studentIds: number[] = JSON.parse(lessonRow.student_ids)
        const makeupStudentRow = db
          .prepare('SELECT student_id FROM makeup_lessons WHERE id = ?')
          .get(Number(id)) as { student_id: number }

        const remainingStudentIds = studentIds.filter((sid) => sid !== makeupStudentRow.student_id)

        if (remainingStudentIds.length === 0) {
          db.prepare('UPDATE lessons SET status = ? WHERE id = ?').run(
            'cancelled',
            makeupRow.makeup_lesson_id,
          )
        } else {
          db.prepare('UPDATE lessons SET student_ids = ? WHERE id = ?').run(
            JSON.stringify(remainingStudentIds),
            makeupRow.makeup_lesson_id,
          )
        }
      }
    }

    db.prepare('UPDATE makeup_lessons SET status = ? WHERE id = ?').run('cancelled', Number(id))

    res.json({
      success: true,
      message: '待补课记录已取消',
    })
  } catch (error) {
    console.error('取消待补课记录失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export default {
  getMakeupLessons,
  checkMakeupConflict,
  scheduleMakeup,
  cancelMakeup,
}
