import { type Request, type Response } from 'express'
import db from '../db/index.js'
import type { Venue, Coach, User, ApiResponse } from '../../shared/types.js'
import xlsx from 'xlsx'
import bcrypt from 'bcryptjs'

interface CreateVenueRequest {
  name: string
  type: 'training' | 'exam'
  capacity: number
  address: string
}

interface CreateUserRequest {
  username: string
  password: string
  role: 'admin' | 'coach' | 'student'
  name: string
  phone: string
}

export const getVenues = async (
  req: Request,
  res: Response<ApiResponse<Venue[]>>,
): Promise<void> => {
  try {
    const venues = db
      .prepare(
        'SELECT id, name, type, capacity, address FROM venues ORDER BY created_at DESC',
      )
      .all() as Array<{
      id: number
      name: string
      type: 'training' | 'exam'
      capacity: number
      address: string
    }>

    res.json({
      success: true,
      data: venues,
    })
  } catch (error) {
    console.error('获取场地列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const createVenue = async (
  req: Request<unknown, unknown, CreateVenueRequest>,
  res: Response<ApiResponse<Venue>>,
): Promise<void> => {
  try {
    const { name, type, capacity, address } = req.body

    if (!name || !type || !capacity || !address) {
      res.status(400).json({
        success: false,
        error: '场地名称、类型、容量、地址不能为空',
      })
      return
    }

    if (!['training', 'exam'].includes(type)) {
      res.status(400).json({
        success: false,
        error: '场地类型必须是 training 或 exam',
      })
      return
    }

    const existingVenue = db
      .prepare('SELECT id FROM venues WHERE name = ?')
      .get(name) as { id: number } | undefined

    if (existingVenue) {
      res.status(400).json({
        success: false,
        error: '场地名称已存在',
      })
      return
    }

    const insertVenue = db.prepare(`
      INSERT INTO venues (name, type, capacity, address)
      VALUES (?, ?, ?, ?)
    `)

    const result = insertVenue.run(name, type, capacity, address)

    const venue = db
      .prepare(
        'SELECT id, name, type, capacity, address FROM venues WHERE id = ?',
      )
      .get(result.lastInsertRowid) as Venue

    res.status(201).json({
      success: true,
      data: venue,
      message: '场地创建成功',
    })
  } catch (error) {
    console.error('创建场地失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const getCoaches = async (
  req: Request,
  res: Response<ApiResponse<Coach[]>>,
): Promise<void> => {
  try {
    const coaches = db
      .prepare(
        `SELECT c.id, c.user_id, c.name, c.phone, c.license_types, c.subjects
         FROM coaches c
         ORDER BY c.created_at DESC`,
      )
      .all() as Array<{
      id: number
      user_id: number
      name: string
      phone: string
      license_types: string
      subjects: string
    }>

    const coachList: Coach[] = coaches.map((coach) => ({
      id: coach.id,
      userId: coach.user_id,
      name: coach.name,
      phone: coach.phone,
      licenseTypes: JSON.parse(coach.license_types || '[]'),
      subjects: JSON.parse(coach.subjects || '[]'),
    }))

    res.json({
      success: true,
      data: coachList,
    })
  } catch (error) {
    console.error('获取教练列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const getUsers = async (
  req: Request,
  res: Response<ApiResponse<User[]>>,
): Promise<void> => {
  try {
    const users = db
      .prepare(
        `SELECT id, username, role, name, phone, created_at
         FROM users
         ORDER BY created_at DESC`,
      )
      .all() as Array<{
      id: number
      username: string
      role: 'admin' | 'coach' | 'student'
      name: string
      phone: string
      created_at: string
    }>

    const userList: User[] = users.map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      phone: user.phone,
      createdAt: user.created_at,
    }))

    res.json({
      success: true,
      data: userList,
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const createUser = async (
  req: Request<unknown, unknown, CreateUserRequest>,
  res: Response<ApiResponse<User>>,
): Promise<void> => {
  try {
    const { username, password, role, name, phone } = req.body

    if (!username || !password || !role || !name || !phone) {
      res.status(400).json({
        success: false,
        error: '用户名、密码、角色、姓名、电话不能为空',
      })
      return
    }

    if (!['admin', 'coach', 'student'].includes(role)) {
      res.status(400).json({
        success: false,
        error: '角色必须是 admin、coach 或 student',
      })
      return
    }

    const existingUser = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username) as { id: number } | undefined

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: '用户名已存在',
      })
      return
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    const insertUser = db.prepare(`
      INSERT INTO users (username, password, role, name, phone)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = insertUser.run(username, hashedPassword, role, name, phone)

    if (role === 'coach') {
      const insertCoach = db.prepare(`
        INSERT INTO coaches (user_id, name, phone, license_types, subjects)
        VALUES (?, ?, ?, ?, ?)
      `)
      insertCoach.run(result.lastInsertRowid, name, phone, '[]', '[]')
    }

    const user = db
      .prepare(
        'SELECT id, username, role, name, phone, created_at FROM users WHERE id = ?',
      )
      .get(result.lastInsertRowid) as {
      id: number
      username: string
      role: 'admin' | 'coach' | 'student'
      name: string
      phone: string
      created_at: string
    }

    const userData: User = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      phone: user.phone,
      createdAt: user.created_at,
    }

    res.status(201).json({
      success: true,
      data: userData,
      message: '用户创建成功',
    })
  } catch (error) {
    console.error('创建用户失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const exportData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { type, startDate, endDate, status } = req.query

    if (!type || !['students', 'bookings', 'lessons', 'scores'].includes(type as string)) {
      res.status(400).json({
        success: false,
        error: '导出类型必须是 students、bookings、lessons 或 scores',
      })
      return
    }

    let data: unknown[] = []
    let fileName = ''

    switch (type) {
      case 'students': {
        let query = `
          SELECT s.id, s.name, s.id_card, s.phone, s.gender, 
                 s.birthday, s.address, s.license_type, 
                 s.enroll_date, s.status, s.created_at
          FROM students s
        `
        const params: unknown[] = []
        const conditions: string[] = []

        if (startDate) {
          conditions.push('s.enroll_date >= ?')
          params.push(startDate)
        }
        if (endDate) {
          conditions.push('s.enroll_date <= ?')
          params.push(endDate)
        }
        if (status) {
          conditions.push('s.status = ?')
          params.push(status)
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ')
        }
        query += ' ORDER BY s.created_at DESC'

        data = db.prepare(query).all(...params)
        fileName = `学员列表_${new Date().toISOString().slice(0, 10)}.xlsx`
        break
      }

      case 'bookings': {
        let query = `
          SELECT b.id, s.name as student_name, b.type, b.subject,
                 v.name as venue_name, c.name as coach_name,
                 b.date, b.start_time, b.end_time, b.status, b.created_at
          FROM bookings b
          JOIN students s ON b.student_id = s.id
          JOIN venues v ON b.venue_id = v.id
          LEFT JOIN coaches c ON b.coach_id = c.id
        `
        const params: unknown[] = []
        const conditions: string[] = []

        if (startDate) {
          conditions.push('b.date >= ?')
          params.push(startDate)
        }
        if (endDate) {
          conditions.push('b.date <= ?')
          params.push(endDate)
        }
        if (status) {
          conditions.push('b.status = ?')
          params.push(status)
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ')
        }
        query += ' ORDER BY b.date DESC, b.start_time DESC'

        data = db.prepare(query).all(...params)
        fileName = `预约列表_${new Date().toISOString().slice(0, 10)}.xlsx`
        break
      }

      case 'lessons': {
        let query = `
          SELECT l.id, c.name as coach_name, v.name as venue_name,
                 l.student_ids, l.date, l.start_time, l.end_time,
                 l.subject, l.status, l.created_at
          FROM lessons l
          JOIN coaches c ON l.coach_id = c.id
          JOIN venues v ON l.venue_id = v.id
        `
        const params: unknown[] = []
        const conditions: string[] = []

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

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ')
        }
        query += ' ORDER BY l.date DESC, l.start_time DESC'

        const lessons = db.prepare(query).all(...params) as Array<{
          student_ids: string
          [key: string]: unknown
        }>

        data = lessons.map((lesson) => {
          const studentIds: number[] = JSON.parse(lesson.student_ids || '[]')
          const studentNames = studentIds.map((id) => {
            const student = db
              .prepare('SELECT name FROM students WHERE id = ?')
              .get(id) as { name: string } | undefined
            return student?.name || ''
          })
          return {
            ...lesson,
            student_ids: studentIds.join(', '),
            student_names: studentNames.join(', '),
          }
        })
        fileName = `课时列表_${new Date().toISOString().slice(0, 10)}.xlsx`
        break
      }

      case 'scores': {
        let query = `
          SELECT es.id, s.name as student_name, es.subject,
                 es.score, es.passed, es.exam_date,
                 c.name as coach_name, es.remark, es.created_at
          FROM exam_scores es
          JOIN students s ON es.student_id = s.id
          LEFT JOIN coaches c ON es.coach_id = c.id
        `
        const params: unknown[] = []
        const conditions: string[] = []

        if (startDate) {
          conditions.push('es.exam_date >= ?')
          params.push(startDate)
        }
        if (endDate) {
          conditions.push('es.exam_date <= ?')
          params.push(endDate)
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ')
        }
        query += ' ORDER BY es.exam_date DESC, es.created_at DESC'

        const scores = db.prepare(query).all(...params) as Array<{
          passed: number
          [key: string]: unknown
        }>

        data = scores.map((score) => ({
          ...score,
          passed: score.passed === 1 ? '是' : '否',
        }))
        fileName = `成绩列表_${new Date().toISOString().slice(0, 10)}.xlsx`
        break
      }
    }

    const worksheet = xlsx.utils.json_to_sheet(data)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, '数据')

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.send(buffer)
  } catch (error) {
    console.error('导出数据失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const updateUser = async (
  req: Request<{ id: string }, unknown, Partial<CreateUserRequest>>,
  res: Response<ApiResponse<User>>,
): Promise<void> => {
  try {
    const { id } = req.params
    const { role, name, phone } = req.body

    if (!role || !name || !phone) {
      res.status(400).json({
        success: false,
        error: '角色、姓名、电话不能为空',
      })
      return
    }

    if (!['admin', 'coach', 'student'].includes(role)) {
      res.status(400).json({
        success: false,
        error: '角色必须是 admin、coach 或 student',
      })
      return
    }

    const existingUser = db
      .prepare('SELECT id, role FROM users WHERE id = ?')
      .get(Number(id)) as { id: number; role: string } | undefined

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
      })
      return
    }

    db.prepare(`
      UPDATE users SET role = ?, name = ?, phone = ? WHERE id = ?
    `).run(role, name, phone, Number(id))

    if (existingUser.role !== role) {
      if (existingUser.role === 'coach') {
        db.prepare('DELETE FROM coaches WHERE user_id = ?').run(Number(id))
      }
      if (role === 'coach') {
        const existingCoach = db
          .prepare('SELECT id FROM coaches WHERE user_id = ?')
          .get(Number(id))
        if (!existingCoach) {
          db.prepare(`
            INSERT INTO coaches (user_id, name, phone, license_types, subjects)
            VALUES (?, ?, ?, ?, ?)
          `).run(Number(id), name, phone, '[]', '[]')
        }
      }
    } else if (role === 'coach') {
      db.prepare('UPDATE coaches SET name = ?, phone = ? WHERE user_id = ?').run(
        name,
        phone,
        Number(id),
      )
    }

    const user = db
      .prepare(
        'SELECT id, username, role, name, phone, created_at FROM users WHERE id = ?',
      )
      .get(Number(id)) as {
      id: number
      username: string
      role: 'admin' | 'coach' | 'student'
      name: string
      phone: string
      created_at: string
    }

    const userData: User = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      phone: user.phone,
      createdAt: user.created_at,
    }

    res.json({
      success: true,
      data: userData,
      message: '用户更新成功',
    })
  } catch (error) {
    console.error('更新用户失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const deleteUser = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { id } = req.params

    const existingUser = db
      .prepare('SELECT id, role, username FROM users WHERE id = ?')
      .get(Number(id)) as { id: number; role: string; username: string } | undefined

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
      })
      return
    }

    if (existingUser.username === 'admin') {
      res.status(400).json({
        success: false,
        error: '不能删除超级管理员',
      })
      return
    }

    const studentRow = db
      .prepare('SELECT id FROM students WHERE user_id = ?')
      .get(Number(id)) as { id: number } | undefined

    const hasReferences = db.prepare(`
      SELECT 1 FROM bookings WHERE student_id = ?
      UNION SELECT 1 FROM exam_scores WHERE student_id = ?
      UNION SELECT 1 FROM leaves WHERE student_id = ?
    `).get(studentRow?.id, studentRow?.id, studentRow?.id)

    if (hasReferences) {
      res.status(400).json({
        success: false,
        error: '该用户有关联数据，无法删除',
      })
      return
    }

    db.prepare('DELETE FROM coaches WHERE user_id = ?').run(Number(id))
    db.prepare('DELETE FROM students WHERE user_id = ?').run(Number(id))
    db.prepare('DELETE FROM users WHERE id = ?').run(Number(id))

    res.json({
      success: true,
      message: '用户删除成功',
    })
  } catch (error) {
    console.error('删除用户失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const updateVenue = async (
  req: Request<{ id: string }, unknown, Partial<CreateVenueRequest>>,
  res: Response<ApiResponse<Venue>>,
): Promise<void> => {
  try {
    const { id } = req.params
    const { name, type, capacity, address } = req.body

    if (!name || !type || !capacity || !address) {
      res.status(400).json({
        success: false,
        error: '场地名称、类型、容量、地址不能为空',
      })
      return
    }

    if (!['training', 'exam'].includes(type)) {
      res.status(400).json({
        success: false,
        error: '场地类型必须是 training 或 exam',
      })
      return
    }

    const existingVenue = db
      .prepare('SELECT id FROM venues WHERE id = ?')
      .get(Number(id)) as { id: number } | undefined

    if (!existingVenue) {
      res.status(404).json({
        success: false,
        error: '场地不存在',
      })
      return
    }

    const nameConflict = db
      .prepare('SELECT id FROM venues WHERE name = ? AND id != ?')
      .get(name, Number(id))

    if (nameConflict) {
      res.status(400).json({
        success: false,
        error: '场地名称已存在',
      })
      return
    }

    db.prepare(`
      UPDATE venues SET name = ?, type = ?, capacity = ?, address = ? WHERE id = ?
    `).run(name, type, capacity, address, Number(id))

    const venue = db
      .prepare(
        'SELECT id, name, type, capacity, address FROM venues WHERE id = ?',
      )
      .get(Number(id)) as Venue

    res.json({
      success: true,
      data: venue,
      message: '场地更新成功',
    })
  } catch (error) {
    console.error('更新场地失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export const deleteVenue = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { id } = req.params

    const existingVenue = db
      .prepare('SELECT id FROM venues WHERE id = ?')
      .get(Number(id)) as { id: number } | undefined

    if (!existingVenue) {
      res.status(404).json({
        success: false,
        error: '场地不存在',
      })
      return
    }

    const hasReferences = db.prepare(`
      SELECT 1 FROM bookings WHERE venue_id = ?
      UNION SELECT 1 FROM lessons WHERE venue_id = ?
    `).get(Number(id), Number(id))

    if (hasReferences) {
      res.status(400).json({
        success: false,
        error: '该场地有关联的预约或课时，无法删除',
      })
      return
    }

    db.prepare('DELETE FROM venues WHERE id = ?').run(Number(id))

    res.json({
      success: true,
      message: '场地删除成功',
    })
  } catch (error) {
    console.error('删除场地失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    })
  }
}

export default {
  getVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  getCoaches,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  exportData,
}
