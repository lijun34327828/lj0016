import { type Request, type Response } from 'express'
import db from '../db/index.js'
import type {
  ExamScore,
  ApiResponse,
  DashboardStats,
  Reminder,
} from '../../shared/types.js'
import dayjs from 'dayjs'

interface CreateScoreRequest {
  studentId: number
  subject: number
  score: number
  examDate: string
  coachId: number
  remark?: string
}

interface ArchiveRequest {
  studentId: number
  archiveType: string
  filePath?: string
}

export const createScore = async (
  req: Request<unknown, unknown, CreateScoreRequest>,
  res: Response<ApiResponse<ExamScore>>,
): Promise<void> => {
  try {
    const { studentId, subject, score, examDate, coachId, remark } = req.body

    if (!studentId || !subject || score === undefined || !examDate || !coachId) {
      res.status(400).json({
        success: false,
        error: '学员ID、科目、分数、考试日期、教练ID不能为空',
      })
      return
    }

    if (score < 0 || score > 100) {
      res.status(400).json({
        success: false,
        error: '分数必须在0-100之间',
      })
      return
    }

    const studentRow = db
      .prepare('SELECT id, name FROM students WHERE id = ?')
      .get(studentId) as { id: number; name: string } | undefined

    if (!studentRow) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      })
      return
    }

    const coachRow = db
      .prepare('SELECT id, name FROM coaches WHERE id = ?')
      .get(coachId) as { id: number; name: string } | undefined

    if (!coachRow) {
      res.status(404).json({
        success: false,
        error: '教练不存在',
      })
      return
    }

    const passed =
      (subject === 1 && score >= 90) ||
      (subject === 2 && score >= 80) ||
      (subject === 3 && score >= 90) ||
      (subject === 4 && score >= 90)

    const insertScore = db.prepare(`
      INSERT INTO exam_scores (student_id, subject, score, passed, exam_date, coach_id, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const result = insertScore.run(
      studentId,
      subject,
      score,
      passed ? 1 : 0,
      examDate,
      coachId,
      remark || null,
    )

    const scoreData = db
      .prepare(
        `SELECT es.id, es.student_id, s.name as student_name, es.subject, 
               es.score, es.passed, es.exam_date, es.coach_id, 
               c.name as coach_name, es.remark
        FROM exam_scores es
        JOIN students s ON es.student_id = s.id
        JOIN coaches c ON es.coach_id = c.id
        WHERE es.id = ?`,
      )
      .get(result.lastInsertRowid) as {
      id: number
      student_id: number
      student_name: string
      subject: number
      score: number
      passed: number
      exam_date: string
      coach_id: number
      coach_name: string
      remark?: string
    }

    const examScore: ExamScore = {
      id: scoreData.id,
      studentId: scoreData.student_id,
      studentName: scoreData.student_name,
      subject: scoreData.subject,
      score: scoreData.score,
      passed: scoreData.passed === 1,
      examDate: scoreData.exam_date,
      coachId: scoreData.coach_id,
      coachName: scoreData.coach_name,
      remark: scoreData.remark,
    }

    res.status(201).json({
      success: true,
      data: examScore,
      message: '考试成绩录入成功',
    })
  } catch (error) {
    console.error('录入考试成绩失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const getScores = async (
  req: Request,
  res: Response<ApiResponse<ExamScore[]>>,
): Promise<void> => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role

    if (!userId || !userRole) {
      res.status(401).json({
        success: false,
        error: '用户未认证',
      })
      return
    }

    let query = `
      SELECT es.id, es.student_id, s.name as student_name, es.subject,
             es.score, es.passed, es.exam_date, es.coach_id,
             c.name as coach_name, es.remark
      FROM exam_scores es
      JOIN students s ON es.student_id = s.id
      LEFT JOIN coaches c ON es.coach_id = c.id
    `

    const params: unknown[] = []

    if (userRole === 'student') {
      const studentRow = db
        .prepare('SELECT id FROM students WHERE user_id = ?')
        .get(userId) as { id: number } | undefined

      if (!studentRow) {
        res.status(404).json({
          success: false,
          error: '未找到对应学员信息',
        })
        return
      }

      query += ' WHERE es.student_id = ?'
      params.push(studentRow.id)
    }

    query += ' ORDER BY es.exam_date DESC, es.created_at DESC'

    const scores = db.prepare(query).all(...params) as Array<{
      id: number
      student_id: number
      student_name: string
      subject: number
      score: number
      passed: number
      exam_date: string
      coach_id: number
      coach_name: string
      remark?: string
    }>

    const scoreList: ExamScore[] = scores.map((score) => ({
      id: score.id,
      studentId: score.student_id,
      studentName: score.student_name,
      subject: score.subject,
      score: score.score,
      passed: score.passed === 1,
      examDate: score.exam_date,
      coachId: score.coach_id,
      coachName: score.coach_name,
      remark: score.remark,
    }))

    res.json({
      success: true,
      data: scoreList,
    })
  } catch (error) {
    console.error('获取成绩列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const archiveStudent = async (
  req: Request<unknown, unknown, ArchiveRequest>,
  res: Response<ApiResponse<{ archiveId: number }>>,
): Promise<void> => {
  try {
    const { studentId, archiveType, filePath } = req.body

    if (!studentId || !archiveType) {
      res.status(400).json({
        success: false,
        error: '学员ID和归档类型不能为空',
      })
      return
    }

    const studentRow = db
      .prepare('SELECT id, name, status FROM students WHERE id = ?')
      .get(studentId) as
      | { id: number; name: string; status: string }
      | undefined

    if (!studentRow) {
      res.status(404).json({
        success: false,
        error: '学员不存在',
      })
      return
    }

    const insertArchive = db.prepare(`
      INSERT INTO archives (student_id, archive_date, archive_type, file_path)
      VALUES (?, ?, ?, ?)
    `)

    const today = dayjs().format('YYYY-MM-DD')
    const result = insertArchive.run(
      studentId,
      today,
      archiveType,
      filePath || null,
    )

    db.prepare('UPDATE students SET status = ? WHERE id = ?').run(
      'completed',
      studentId,
    )

    res.status(201).json({
      success: true,
      data: { archiveId: Number(result.lastInsertRowid) },
      message: '学员档案归档成功',
    })
  } catch (error) {
    console.error('学员档案归档失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const getDashboardStats = async (
  req: Request,
  res: Response<ApiResponse<DashboardStats>>,
): Promise<void> => {
  try {
    const totalStudentsRow = db
      .prepare("SELECT COUNT(*) as count FROM students WHERE status != 'rejected'")
      .get() as { count: number }

    const pendingStudentsRow = db
      .prepare("SELECT COUNT(*) as count FROM students WHERE status = 'pending'")
      .get() as { count: number }

    const today = dayjs().format('YYYY-MM-DD')

    const todayBookingsRow = db
      .prepare('SELECT COUNT(*) as count FROM bookings WHERE date = ?')
      .get(today) as { count: number }

    const todayLessonsRows = db
      .prepare(
        "SELECT student_ids FROM lessons WHERE date = ? AND status IN ('scheduled', 'completed')"
      )
      .all(today) as Array<{ student_ids: string }>

    let todayStudentCount = 0
    for (const row of todayLessonsRows) {
      const studentIds: number[] = JSON.parse(row.student_ids || '[]')
      todayStudentCount += studentIds.length
    }

    const todayLessonCountRow = db
      .prepare(
        "SELECT COUNT(*) as count FROM lessons WHERE date = ? AND status IN ('scheduled', 'completed')"
      )
      .get(today) as { count: number }

    const pendingMakeupRow = db
      .prepare("SELECT COUNT(*) as count FROM makeup_lessons WHERE status = 'pending'")
      .get() as { count: number }

    const monthlyTrend: { date: string; students: number; bookings: number }[] =
      []
    for (let i = 29; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
      const studentsRow = db
        .prepare('SELECT COUNT(*) as count FROM students WHERE DATE(enroll_date) = ?')
        .get(date) as { count: number }
      const bookingsRow = db
        .prepare('SELECT COUNT(*) as count FROM bookings WHERE date = ?')
        .get(date) as { count: number }
      monthlyTrend.push({
        date,
        students: studentsRow.count,
        bookings: bookingsRow.count,
      })
    }

    const passRateData = db
      .prepare(
        `SELECT subject, 
                COUNT(*) as total, 
                SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed
         FROM exam_scores
         GROUP BY subject
         ORDER BY subject`,
      )
      .all() as Array<{ subject: number; total: number; passed: number }>

    const subjectNames: Record<number, string> = {
      1: '科目一',
      2: '科目二',
      3: '科目三',
      4: '科目四',
    }

    const passRate = passRateData.map((item) => ({
      subject: subjectNames[item.subject] || `科目${item.subject}`,
      rate: item.total > 0 ? Math.round((item.passed / item.total) * 100) : 0,
    }))

    const stats: DashboardStats = {
      totalStudents: totalStudentsRow.count,
      pendingStudents: pendingStudentsRow.count,
      todayBookings: todayBookingsRow.count,
      todayLessons: todayLessonCountRow.count,
      todayStudentCount,
      pendingMakeupCount: pendingMakeupRow.count,
      monthlyTrend,
      passRate,
    }

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('获取仪表盘统计失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const getReminders = async (
  req: Request,
  res: Response<ApiResponse<Reminder[]>>,
): Promise<void> => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role

    if (!userId || !userRole) {
      res.status(401).json({
        success: false,
        error: '用户未认证',
      })
      return
    }

    const reminders: Reminder[] = []
    let reminderId = 1

    const today = dayjs()
    const todayStr = today.format('YYYY-MM-DD')

    if (userRole === 'student') {
      const studentRow = db
        .prepare('SELECT id, enroll_date FROM students WHERE user_id = ?')
        .get(userId) as { id: number; enroll_date: string } | undefined

      if (studentRow) {
        const enrollDate = dayjs(studentRow.enroll_date)
        const expireDate = enrollDate.add(3, 'year')
        const daysToExpire = expireDate.diff(today, 'day')

        if (daysToExpire <= 30 && daysToExpire > 0) {
          reminders.push({
            id: reminderId++,
            type: 'license_expiry',
            title: '学习有效期即将到期',
            description: `您的学习有效期将于 ${expireDate.format('YYYY-MM-DD')} 到期，还剩 ${daysToExpire} 天，请尽快完成剩余考试。`,
            date: expireDate.format('YYYY-MM-DD'),
            priority: daysToExpire <= 7 ? 'high' : 'medium',
          })
        }

        const latestScores = db
          .prepare(
            `SELECT subject, passed, exam_date 
             FROM exam_scores 
             WHERE student_id = ? 
             ORDER BY subject, exam_date DESC`,
          )
          .all(studentRow.id) as Array<{
          subject: number
          passed: number
          exam_date: string
        }>

        const passedSubjects = new Set<number>()
        for (const score of latestScores) {
          if (score.passed === 1) {
            passedSubjects.add(score.subject)
          }
        }

        const subjectOrder = [1, 2, 3, 4]
        let nextSubject = 0
        for (const subject of subjectOrder) {
          if (!passedSubjects.has(subject)) {
            nextSubject = subject
            break
          }
        }

        if (nextSubject > 0) {
          const subjectNames: Record<number, string> = {
            1: '科目一',
            2: '科目二',
            3: '科目三',
            4: '科目四',
          }
          reminders.push({
            id: reminderId++,
            type: 'exam_due',
            title: '考试预约提醒',
            description: `您还未通过${subjectNames[nextSubject]}考试，请及时预约并参加考试。`,
            date: todayStr,
            priority: 'medium',
          })
        }

        const todayLessons = db
          .prepare(
            `SELECT l.id, l.start_time, l.end_time, v.name as venue_name
             FROM lessons l
             JOIN venues v ON l.venue_id = v.id
             WHERE l.date = ? AND l.status = 'scheduled'
             ORDER BY l.start_time`,
          )
          .all(todayStr) as Array<{
          id: number
          start_time: string
          end_time: string
          venue_name: string
        }>

        for (const lesson of todayLessons) {
          const lessonStudentIds = db
            .prepare('SELECT student_ids FROM lessons WHERE id = ?')
            .get(lesson.id) as { student_ids: string }
          const studentIds: number[] = JSON.parse(lessonStudentIds.student_ids)

          if (studentIds.includes(studentRow.id)) {
            reminders.push({
              id: reminderId++,
              type: 'lesson_today',
              title: '今日课时提醒',
              description: `您今天有课时安排：${lesson.start_time}-${lesson.end_time}，在 ${lesson.venue_name}。`,
              date: todayStr,
              priority: 'high',
            })
          }
        }
      }
    } else {
      const todayLessons = db
        .prepare(
          `SELECT l.id, l.start_time, l.end_time, v.name as venue_name, c.name as coach_name
           FROM lessons l
           JOIN venues v ON l.venue_id = v.id
           LEFT JOIN coaches c ON l.coach_id = c.id
           WHERE l.date = ? AND l.status = 'scheduled'
           ORDER BY l.start_time`,
        )
        .all(todayStr) as Array<{
        id: number
        start_time: string
        end_time: string
        venue_name: string
        coach_name: string
      }>

      for (const lesson of todayLessons) {
        reminders.push({
          id: reminderId++,
          type: 'lesson_today',
          title: '今日课时',
          description: `${lesson.start_time}-${lesson.end_time} ${lesson.coach_name} - ${lesson.venue_name}`,
          date: todayStr,
          priority: 'medium',
        })
      }

      const pendingLeavesRow = db
        .prepare("SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'")
        .get() as { count: number }

      if (pendingLeavesRow.count > 0) {
        reminders.push({
          id: reminderId++,
          type: 'exam_due',
          title: '待审核请假',
          description: `有 ${pendingLeavesRow.count} 条请假申请待审核，请及时处理。`,
          date: todayStr,
          priority: 'high',
        })
      }

      const pendingStudentsRow = db
        .prepare("SELECT COUNT(*) as count FROM students WHERE status = 'pending'")
        .get() as { count: number }

      if (pendingStudentsRow.count > 0) {
        reminders.push({
          id: reminderId++,
          type: 'exam_due',
          title: '待审核学员',
          description: `有 ${pendingStudentsRow.count} 名新学员待审核。`,
          date: todayStr,
          priority: 'medium',
        })
      }
    }

    reminders.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    res.json({
      success: true,
      data: reminders,
    })
  } catch (error) {
    console.error('获取提醒列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const getArchiveCandidates = async (
  req: Request,
  res: Response<ApiResponse<Array<{
    id: number
    name: string
    phone: string
    idCard: string
    licenseType: string
    enrollDate: string
    scores: Array<{ subject: number; score: number; passed: boolean; examDate: string }>
  }>>>,
): Promise<void> => {
  try {
    const students = db
      .prepare(
        `SELECT s.id, s.name, s.phone, s.id_card, s.license_type, s.enroll_date
         FROM students s
         WHERE s.status IN ('pending', 'approved')
           AND s.id NOT IN (SELECT student_id FROM archives)
         ORDER BY s.enroll_date DESC`,
      )
      .all() as Array<{
      id: number
      name: string
      phone: string
      id_card: string
      license_type: string
      enroll_date: string
    }>

    const candidates: Array<{
      id: number
      name: string
      phone: string
      idCard: string
      licenseType: string
      enrollDate: string
      scores: Array<{ subject: number; score: number; passed: boolean; examDate: string }>
    }> = []

    for (const student of students) {
      const scores = db
        .prepare(
          `SELECT subject, score, passed, exam_date
           FROM exam_scores
           WHERE student_id = ?
           ORDER BY subject, exam_date DESC`,
        )
        .all(student.id) as Array<{
        subject: number
        score: number
        passed: number
        exam_date: string
      }>

      const latestPassedScores = new Map<number, boolean>()
      for (const score of scores) {
        if (!latestPassedScores.has(score.subject)) {
          latestPassedScores.set(score.subject, score.passed === 1)
        }
      }

      const allPassed = [1, 2, 3, 4].every((subject) => latestPassedScores.get(subject) === true)

      if (allPassed) {
        candidates.push({
          id: student.id,
          name: student.name,
          phone: student.phone,
          idCard: student.id_card,
          licenseType: student.license_type,
          enrollDate: student.enroll_date,
          scores: scores.map((s) => ({
            subject: s.subject,
            score: s.score,
            passed: s.passed === 1,
            examDate: s.exam_date,
          })),
        })
      }
    }

    res.json({
      success: true,
      data: candidates,
    })
  } catch (error) {
    console.error('获取可归档学员列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const getArchivedStudents = async (
  req: Request,
  res: Response<ApiResponse<Array<{
    id: number
    studentId: number
    studentName: string
    archiveDate: string
    archiveType: string
    phone: string
    licenseType: string
  }>>>,
): Promise<void> => {
  try {
    const archives = db
      .prepare(
        `SELECT a.id, a.student_id, a.archive_date, a.archive_type,
                s.name as student_name, s.phone, s.license_type
         FROM archives a
         JOIN students s ON a.student_id = s.id
         ORDER BY a.archive_date DESC`,
      )
      .all() as Array<{
      id: number
      student_id: number
      archive_date: string
      archive_type: string
      student_name: string
      phone: string
      license_type: string
    }>

    const result = archives.map((a) => ({
      id: a.id,
      studentId: a.student_id,
      studentName: a.student_name,
      archiveDate: a.archive_date,
      archiveType: a.archive_type,
      phone: a.phone,
      licenseType: a.license_type,
    }))

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('获取已归档学员列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export default {
  createScore,
  getScores,
  archiveStudent,
  getArchiveCandidates,
  getArchivedStudents,
  getDashboardStats,
  getReminders,
}
