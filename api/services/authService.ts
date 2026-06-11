import db from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User, UserRole, LoginResponse } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'DRIVING_SCHOOL_SECRET_KEY_2024';
const JWT_EXPIRES_IN = '24h';

interface LoginResult {
  success: boolean;
  data?: LoginResponse;
  message?: string;
}

interface GetUserResult {
  success: boolean;
  user?: User;
  message?: string;
}

function mapUserRow(row: {
  id: number;
  username: string;
  password?: string;
  role: string;
  name: string;
  phone: string;
  created_at: string;
}): User {
  return {
    id: row.id,
    username: row.username,
    role: row.role as UserRole,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

export function login(
  username: string,
  password: string,
  role: UserRole
): LoginResult {
  if (!username || !password || !role) {
    return {
      success: false,
      message: '用户名、密码和角色不能为空',
    };
  }

  const userRow = db
    .prepare('SELECT * FROM users WHERE username = ? AND role = ?')
    .get(username, role) as
    | {
        id: number;
        username: string;
        password: string;
        role: string;
        name: string;
        phone: string;
        created_at: string;
      }
    | undefined;

  if (!userRow) {
    return {
      success: false,
      message: '用户不存在或角色不匹配',
    };
  }

  const isPasswordValid = bcrypt.compareSync(password, userRow.password);

  if (!isPasswordValid) {
    return {
      success: false,
      message: '密码错误',
    };
  }

  const user = mapUserRow(userRow);

  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );

  const response: LoginResponse = {
    token,
    user,
  };

  if (role === 'student') {
    const studentRow = db
      .prepare('SELECT id FROM students WHERE user_id = ?')
      .get(user.id) as { id: number } | undefined;

    if (studentRow) {
      response.studentId = studentRow.id;
    }
  }

  if (role === 'coach') {
    const coachRow = db
      .prepare('SELECT id FROM coaches WHERE user_id = ?')
      .get(user.id) as { id: number } | undefined;

    if (coachRow) {
      response.coachId = coachRow.id;
    }
  }

  return {
    success: true,
    data: response,
  };
}

export function getCurrentUser(userId: number): GetUserResult {
  if (!userId || userId <= 0) {
    return {
      success: false,
      message: '用户ID无效',
    };
  }

  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(userId) as
    | {
        id: number;
        username: string;
        role: string;
        name: string;
        phone: string;
        created_at: string;
      }
    | undefined;

  if (!userRow) {
    return {
      success: false,
      message: '用户不存在',
    };
  }

  return {
    success: true,
    user: mapUserRow(userRow),
  };
}
