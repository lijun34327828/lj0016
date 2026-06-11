import { type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import db from '../db/index.js'
import type { Student } from '../../shared/types.js'

interface StudentRow {
  id: number
  user_id?: number
  name: string
  id_card: string
  phone: string
  gender: string
  birthday: string
  address: string
  license_type: string
  enroll_date: string
  status: string
  id_card_front?: string
  id_card_back?: string
  photo?: string
  medical_report?: string
  created_at: string
}

const uploadDir = path.join(process.cwd(), 'uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const originalName = file.originalname
    cb(null, `${timestamp}-${originalName}`)
  },
})

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (extname && mimetype) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传 JPG、PNG、PDF 格式的文件'))
    }
  },
})

function mapStudentRow(row: StudentRow): Student {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    idCard: row.id_card,
    phone: row.phone,
    gender: row.gender as 'male' | 'female',
    birthday: row.birthday,
    address: row.address,
    licenseType: row.license_type as Student['licenseType'],
    enrollDate: row.enroll_date,
    status: row.status as Student['status'],
    idCardFront: row.id_card_front,
    idCardBack: row.id_card_back,
    photo: row.photo,
    medicalReport: row.medical_report,
    createdAt: row.created_at,
  }
}

function validateIdCard(idCard: string): boolean {
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
  return idCardRegex.test(idCard)
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

export const checkDuplicateController = (
  req: Request,
  res: Response,
): void => {
  try {
    const { idCard } = req.body as { idCard: string }

    if (!idCard) {
      res.status(400).json({
        success: false,
        message: '身份证号不能为空',
      })
      return
    }

    const existingStudent = db
      .prepare('SELECT id FROM students WHERE id_card = ?')
      .get(idCard) as { id: number } | undefined

    res.json({
      success: true,
      data: {
        exists: !!existingStudent,
      },
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '检查身份证号失败，请稍后重试',
    })
  }
}

export const createStudentController = (
  req: Request,
  res: Response,
): void => {
  try {
    const {
      name,
      idCard,
      phone,
      gender,
      birthday,
      address,
      licenseType,
      enrollDate,
      status = 'pending',
      idCardFront,
      idCardBack,
      photo,
      medicalReport,
    } = req.body as Omit<Student, 'id' | 'userId' | 'createdAt'>

    if (!name || !idCard || !phone || !gender || !birthday || !address || !licenseType || !enrollDate) {
      res.status(400).json({
        success: false,
        message: '请填写所有必填字段',
      })
      return
    }

    if (!validateIdCard(idCard)) {
      res.status(400).json({
        success: false,
        message: '身份证号格式不正确，必须为18位有效身份证号',
      })
      return
    }

    if (!validatePhone(phone)) {
      res.status(400).json({
        success: false,
        message: '手机号格式不正确，必须为11位有效手机号',
      })
      return
    }

    const existingStudent = db
      .prepare('SELECT id FROM students WHERE id_card = ?')
      .get(idCard) as { id: number } | undefined

    if (existingStudent) {
      res.status(400).json({
        success: false,
        message: '该身份证号已报名，请勿重复提交',
      })
      return
    }

    const result = db
      .prepare(
        `INSERT INTO students 
         (name, id_card, phone, gender, birthday, address, license_type, enroll_date, status, 
          id_card_front, id_card_back, photo, medical_report)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        name,
        idCard,
        phone,
        gender,
        birthday,
        address,
        licenseType,
        enrollDate,
        status,
        idCardFront,
        idCardBack,
        photo,
        medicalReport,
      )

    const studentId = result.lastInsertRowid as number

    const studentRow = db
      .prepare('SELECT * FROM students WHERE id = ?')
      .get(studentId)

    const student = mapStudentRow(studentRow as StudentRow)

    res.json({
      success: true,
      data: student,
      message: '学员创建成功',
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '创建学员失败，请稍后重试',
    })
  }
}

export const getStudentsController = (
  req: Request,
  res: Response,
): void => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const search = req.query.search as string || ''
    const status = req.query.status as string || ''

    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (search) {
      whereClause += ' AND (name LIKE ? OR id_card LIKE ? OR phone LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    const countRow = db
      .prepare(`SELECT COUNT(*) as count FROM students ${whereClause}`)
      .get(...params) as { count: number }

    const total = countRow.count

    const studentRows = db
      .prepare(`SELECT * FROM students ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset) as StudentRow[]

    const students = studentRows.map(mapStudentRow)

    res.json({
      success: true,
      data: {
        list: students,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '获取学员列表失败，请稍后重试',
    })
  }
}

export const getStudentByIdController = (
  req: Request,
  res: Response,
): void => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: '学员ID无效',
      })
      return
    }

    const studentRow = db
      .prepare('SELECT * FROM students WHERE id = ?')
      .get(id) as StudentRow | undefined

    if (!studentRow) {
      res.status(404).json({
        success: false,
        message: '学员不存在',
      })
      return
    }

    const student = mapStudentRow(studentRow)

    res.json({
      success: true,
      data: student,
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '获取学员详情失败，请稍后重试',
    })
  }
}

export const updateStudentController = (
  req: Request,
  res: Response,
): void => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: '学员ID无效',
      })
      return
    }

    const existingRow = db
      .prepare('SELECT * FROM students WHERE id = ?')
      .get(id) as StudentRow | undefined

    if (!existingRow) {
      res.status(404).json({
        success: false,
        message: '学员不存在',
      })
      return
    }

    const {
      name,
      idCard,
      phone,
      gender,
      birthday,
      address,
      licenseType,
      enrollDate,
      status,
      idCardFront,
      idCardBack,
      photo,
      medicalReport,
    } = req.body as Partial<Omit<Student, 'id' | 'userId' | 'createdAt'>>

    if (idCard && !validateIdCard(idCard)) {
      res.status(400).json({
        success: false,
        message: '身份证号格式不正确，必须为18位有效身份证号',
      })
      return
    }

    if (phone && !validatePhone(phone)) {
      res.status(400).json({
        success: false,
        message: '手机号格式不正确，必须为11位有效手机号',
      })
      return
    }

    if (idCard && idCard !== existingRow.id_card) {
      const duplicateRow = db
        .prepare('SELECT id FROM students WHERE id_card = ? AND id != ?')
        .get(idCard, id) as { id: number } | undefined

      if (duplicateRow) {
        res.status(400).json({
          success: false,
          message: '该身份证号已被其他学员使用',
        })
        return
      }
    }

    const updateFields: string[] = []
    const updateParams: (string | number)[] = []

    if (name !== undefined) {
      updateFields.push('name = ?')
      updateParams.push(name)
    }
    if (idCard !== undefined) {
      updateFields.push('id_card = ?')
      updateParams.push(idCard)
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?')
      updateParams.push(phone)
    }
    if (gender !== undefined) {
      updateFields.push('gender = ?')
      updateParams.push(gender)
    }
    if (birthday !== undefined) {
      updateFields.push('birthday = ?')
      updateParams.push(birthday)
    }
    if (address !== undefined) {
      updateFields.push('address = ?')
      updateParams.push(address)
    }
    if (licenseType !== undefined) {
      updateFields.push('license_type = ?')
      updateParams.push(licenseType)
    }
    if (enrollDate !== undefined) {
      updateFields.push('enroll_date = ?')
      updateParams.push(enrollDate)
    }
    if (status !== undefined) {
      updateFields.push('status = ?')
      updateParams.push(status)
    }
    if (idCardFront !== undefined) {
      updateFields.push('id_card_front = ?')
      updateParams.push(idCardFront)
    }
    if (idCardBack !== undefined) {
      updateFields.push('id_card_back = ?')
      updateParams.push(idCardBack)
    }
    if (photo !== undefined) {
      updateFields.push('photo = ?')
      updateParams.push(photo)
    }
    if (medicalReport !== undefined) {
      updateFields.push('medical_report = ?')
      updateParams.push(medicalReport)
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有需要更新的字段',
      })
      return
    }

    updateParams.push(id)

    db
      .prepare(`UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`)
      .run(...updateParams)

    const updatedRow = db
      .prepare('SELECT * FROM students WHERE id = ?')
      .get(id) as StudentRow

    const student = mapStudentRow(updatedRow)

    res.json({
      success: true,
      data: student,
      message: '学员信息更新成功',
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '更新学员信息失败，请稍后重试',
    })
  }
}

export const deleteStudentController = (
  req: Request,
  res: Response,
): void => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: '学员ID无效',
      })
      return
    }

    const existingRow = db
      .prepare('SELECT * FROM students WHERE id = ?')
      .get(id) as StudentRow | undefined

    if (!existingRow) {
      res.status(404).json({
        success: false,
        message: '学员不存在',
      })
      return
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(id)

    res.json({
      success: true,
      message: '学员删除成功',
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '删除学员失败，请稍后重试',
    })
  }
}

export const uploadFileController = (
  req: Request,
  res: Response,
): void => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: '请选择要上传的文件',
      })
      return
    }

    const fileUrl = `/uploads/${req.file.filename}`

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      message: '文件上传成功',
    })
  } catch (_error) {
    void _error
    res.status(500).json({
      success: false,
      error: '文件上传失败，请稍后重试',
    })
  }
}

export default {
  checkDuplicateController,
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
  uploadFileController,
  upload,
}
