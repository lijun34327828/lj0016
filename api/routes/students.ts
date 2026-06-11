import { Router, type Request, type Response } from 'express'
import {
  checkDuplicateController,
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
  uploadFileController,
  upload,
} from '../controllers/studentController.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireRoles } from '../middleware/permissions.js'

const router = Router()

router.use(authMiddleware)
router.use(requireRoles('admin'))

/**
 * 检查身份证号是否已存在
 * POST /api/students/check-duplicate
 */
router.post('/check-duplicate', (req: Request, res: Response): void => {
  checkDuplicateController(req, res)
})

/**
 * 创建学员
 * POST /api/students
 */
router.post('/', (req: Request, res: Response): void => {
  createStudentController(req, res)
})

/**
 * 获取学员列表（支持分页、搜索、状态筛选）
 * GET /api/students
 */
router.get('/', (req: Request, res: Response): void => {
  getStudentsController(req, res)
})

/**
 * 获取学员详情
 * GET /api/students/:id
 */
router.get('/:id', (req: Request, res: Response): void => {
  getStudentByIdController(req, res)
})

/**
 * 更新学员信息
 * PUT /api/students/:id
 */
router.put('/:id', (req: Request, res: Response): void => {
  updateStudentController(req, res)
})

/**
 * 删除学员
 * DELETE /api/students/:id
 */
router.delete('/:id', (req: Request, res: Response): void => {
  deleteStudentController(req, res)
})

/**
 * 上传证件附件
 * POST /api/students/upload
 */
router.post('/upload', upload.single('file'), (req: Request, res: Response): void => {
  uploadFileController(req, res)
})

export default router
