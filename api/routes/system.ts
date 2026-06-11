import { Router } from 'express'
import {
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
} from '../controllers/systemController.js'
import authMiddleware from '../middleware/auth.js'
import requireRoles from '../middleware/permissions.js'

const router = Router()

router.get(
  '/venues',
  authMiddleware,
  getVenues,
)

router.post(
  '/venues',
  authMiddleware,
  requireRoles('admin'),
  createVenue,
)

router.get(
  '/coaches',
  authMiddleware,
  getCoaches,
)

router.get(
  '/users',
  authMiddleware,
  requireRoles('admin'),
  getUsers,
)

router.post(
  '/users',
  authMiddleware,
  requireRoles('admin'),
  createUser,
)

router.put(
  '/users/:id',
  authMiddleware,
  requireRoles('admin'),
  updateUser,
)

router.delete(
  '/users/:id',
  authMiddleware,
  requireRoles('admin'),
  deleteUser,
)

router.put(
  '/venues/:id',
  authMiddleware,
  requireRoles('admin'),
  updateVenue,
)

router.delete(
  '/venues/:id',
  authMiddleware,
  requireRoles('admin'),
  deleteVenue,
)

router.get(
  '/export/data',
  authMiddleware,
  requireRoles('admin'),
  exportData,
)

export default router
