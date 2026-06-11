import { type Request, type Response } from 'express'
import db from '../db/index.js'
import type { Leave, ApiResponse, LeaveStatus } from '../../shared/types.js'

interface CreateLeaveRequest {
  lessonId: number
  reason: string
}

interface AuditLeaveRequest {
  status: 'approved' | 'rejected'
  auditRemark?: string
}

export const createLeave = async (
  req: Request<unknown, unknown, CreateLeaveRequest>,
  res: Response<ApiResponse<Leave>>,
): Promise<void> => {
  try {
    const { lessonId, reason } = req.body
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({
        success: false,
        error: '用户未认证',
      })
      return
    }

    if (!lessonId || !reason) {
      res.status(400).json({
        success: false,
        error: '课时ID和请假原因不能为空',
      })
      return
    }

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

    const studentId = studentRow.id

    const lessonRow = db
      .prepare(
        'SELECT id, student_ids, date, start_time, end_time, status FROM lessons WHERE id = ?',
      )
      .get(lessonId) as
      | {
          id: number
          student_ids: string
          date: string
          start_time: string
          end_time: string
          status: string
        }
      | undefined

    if (!lessonRow) {
      res.status(404).json({
        success: false,
        error: '课时不存在',
      })
      return
    }

    const studentIds: number[] = JSON.parse(lessonRow.student_ids)
    if (!studentIds.includes(studentId)) {
      res.status(403).json({
        success: false,
        error: '您不是该课时的学员，无法请假',
      })
      return
    }

    if (lessonRow.status !== 'scheduled') {
      res.status(400).json({
        success: false,
        error: '只能对未开始的课时请假',
      })
      return
    }

    const existingLeave = db
      .prepare(
        'SELECT id FROM leaves WHERE student_id = ? AND lesson_id = ? AND status = ?',
      )
      .get(studentId, lessonId, 'pending') as { id: number } | undefined

    if (existingLeave) {
      res.status(400).json({
        success: false,
        error: '该课时已有待审核的请假申请',
      })
      return
    }

    const insertLeave = db.prepare(`
      INSERT INTO leaves (student_id, lesson_id, reason, status)
      VALUES (?, ?, ?, ?)
    `)

    const result = insertLeave.run(studentId, lessonId, reason, 'pending')

    const leave = db
      .prepare(
        `SELECT l.id, l.student_id, s.name as student_name, l.lesson_id, 
               l.reason, l.status, l.audit_remark, l.created_at
        FROM leaves l
        JOIN students s ON l.student_id = s.id
        WHERE l.id = ?`,
      )
      .get(result.lastInsertRowid) as {
      id: number
      student_id: number
      student_name: string
      lesson_id: number
      reason: string
      status: LeaveStatus
      audit_remark?: string
      created_at: string
    }

    const lessonInfo = `${lessonRow.date} ${lessonRow.start_time}-${lessonRow.end_time}`

    const leaveData: Leave = {
      id: leave.id,
      studentId: leave.student_id,
      studentName: leave.student_name,
      lessonId: leave.lesson_id,
      lessonInfo,
      reason: leave.reason,
      status: leave.status,
      auditRemark: leave.audit_remark,
      createdAt: leave.created_at,
    }

    res.status(201).json({
      success: true,
      data: leaveData,
      message: '请假申请提交成功',
    })
  } catch (error) {
    console.error('创建请假申请失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const getLeaves = async (
  req: Request,
  res: Response<ApiResponse<Leave[]>>,
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
      SELECT l.id, l.student_id, s.name as student_name, l.lesson_id,
             l.reason, l.status, l.audit_remark, l.created_at,
             les.date, les.start_time, les.end_time
      FROM leaves l
      JOIN students s ON l.student_id = s.id
      JOIN lessons les ON l.lesson_id = les.id
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

      query += ' WHERE l.student_id = ?'
      params.push(studentRow.id)
    }

    query += ' ORDER BY l.created_at DESC'

    const leaves = db.prepare(query).all(...params) as Array<{
      id: number
      student_id: number
      student_name: string
      lesson_id: number
      reason: string
      status: LeaveStatus
      audit_remark?: string
      created_at: string
      date: string
      start_time: string
      end_time: string
    }>

    const leaveList: Leave[] = leaves.map((leave) => ({
      id: leave.id,
      studentId: leave.student_id,
      studentName: leave.student_name,
      lessonId: leave.lesson_id,
      lessonInfo: `${leave.date} ${leave.start_time}-${leave.end_time}`,
      reason: leave.reason,
      status: leave.status,
      auditRemark: leave.audit_remark,
      createdAt: leave.created_at,
    }))

    res.json({
      success: true,
      data: leaveList,
    })
  } catch (error) {
    console.error('获取请假列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const auditLeave = async (
  req: Request<{ id: string }, unknown, AuditLeaveRequest>,
  res: Response<ApiResponse<Leave>>,
): Promise<void> => {
  try {
    const leaveId = parseInt(req.params.id)
    const { status, auditRemark } = req.body

    if (isNaN(leaveId)) {
      res.status(400).json({
        success: false,
        error: '请假ID无效',
      })
      return
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        error: '审核状态必须是 approved 或 rejected',
      })
      return
    }

    const leaveRow = db
      .prepare(
        'SELECT id, student_id, lesson_id, status FROM leaves WHERE id = ?',
      )
      .get(leaveId) as
      | {
          id: number
          student_id: number
          lesson_id: number
          status: string
        }
      | undefined

    if (!leaveRow) {
      res.status(404).json({
        success: false,
        error: '请假申请不存在',
      })
      return
    }

    if (leaveRow.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: '只能审核待处理的请假申请',
      })
      return
    }

    const updateLeave = db.prepare(`
      UPDATE leaves 
      SET status = ?, audit_remark = ?
      WHERE id = ?
    `)

    updateLeave.run(status, auditRemark || null, leaveId)

    if (status === 'approved') {
      const lessonRow = db
        .prepare(
          'SELECT id, student_ids, status FROM lessons WHERE id = ?',
        )
        .get(leaveRow.lesson_id) as
        | { id: number; student_ids: string; status: string }
        | undefined

      if (lessonRow && lessonRow.status === 'scheduled') {
        const studentIds: number[] = JSON.parse(lessonRow.student_ids)
        const remainingStudentIds = studentIds.filter(
          (id) => id !== leaveRow.student_id,
        )

        if (remainingStudentIds.length === 0) {
          db.prepare('UPDATE lessons SET status = ? WHERE id = ?').run(
            'leave',
            leaveRow.lesson_id,
          )
        } else {
          db.prepare('UPDATE lessons SET student_ids = ? WHERE id = ?').run(
            JSON.stringify(remainingStudentIds),
            leaveRow.lesson_id,
          )
        }
      }
    }

    const updatedLeave = db
      .prepare(
        `SELECT l.id, l.student_id, s.name as student_name, l.lesson_id,
               l.reason, l.status, l.audit_remark, l.created_at,
               les.date, les.start_time, les.end_time
        FROM leaves l
        JOIN students s ON l.student_id = s.id
        JOIN lessons les ON l.lesson_id = les.id
        WHERE l.id = ?`,
      )
      .get(leaveId) as {
      id: number
      student_id: number
      student_name: string
      lesson_id: number
      reason: string
      status: LeaveStatus
      audit_remark?: string
      created_at: string
      date: string
      start_time: string
      end_time: string
    }

    const leaveData: Leave = {
      id: updatedLeave.id,
      studentId: updatedLeave.student_id,
      studentName: updatedLeave.student_name,
      lessonId: updatedLeave.lesson_id,
      lessonInfo: `${updatedLeave.date} ${updatedLeave.start_time}-${updatedLeave.end_time}`,
      reason: updatedLeave.reason,
      status: updatedLeave.status,
      auditRemark: updatedLeave.audit_remark,
      createdAt: updatedLeave.created_at,
    }

    res.json({
      success: true,
      data: leaveData,
      message: `请假已${status === 'approved' ? '通过' : '驳回'}`,
    })
  } catch (error) {
    console.error('审核请假失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export default {
  createLeave,
  getLeaves,
  auditLeave,
}
