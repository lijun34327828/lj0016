import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dataDir = path.join(process.cwd(), 'data');
const uploadDir = path.join(process.cwd(), 'uploads');
const logsDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const dbPath = path.join(dataDir, 'driving_school.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coach', 'student')),
      name VARCHAR(50) NOT NULL,
      phone VARCHAR(20),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      name VARCHAR(50) NOT NULL,
      id_card VARCHAR(18) UNIQUE NOT NULL,
      phone VARCHAR(20) NOT NULL,
      gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
      birthday DATE,
      address VARCHAR(255),
      license_type VARCHAR(10) NOT NULL CHECK (license_type IN ('C1', 'C2', 'B1', 'B2', 'A1', 'A2')),
      enroll_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
      id_card_front VARCHAR(255),
      id_card_back VARCHAR(255),
      photo VARCHAR(255),
      medical_report VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      name VARCHAR(50) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      license_types TEXT,
      subjects TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('training', 'exam')),
      capacity INTEGER DEFAULT 1,
      address VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('practice', 'exam')),
      subject INTEGER,
      venue_id INTEGER REFERENCES venues(id) NOT NULL,
      coach_id INTEGER REFERENCES coaches(id),
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER REFERENCES coaches(id) NOT NULL,
      venue_id INTEGER REFERENCES venues(id) NOT NULL,
      student_ids TEXT NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      subject INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'leave')),
      group_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) NOT NULL,
      lesson_id INTEGER REFERENCES lessons(id) NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      audit_remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) NOT NULL,
      subject INTEGER NOT NULL,
      score INTEGER NOT NULL,
      passed BOOLEAN NOT NULL,
      exam_date DATE NOT NULL,
      coach_id INTEGER REFERENCES coaches(id),
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS archives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id) NOT NULL,
      archive_date DATE NOT NULL,
      archive_type VARCHAR(50) NOT NULL,
      file_path VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date, start_time);
    CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date, start_time);
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
    CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
  `);

  const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
  
  if (adminCount.count === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, role, name, phone) VALUES (?, ?, ?, ?, ?)
    `);
    
    const adminResult = insertUser.run('admin', hashedPassword, 'admin', '系统管理员', '13800000000');
    
    const coach1Pwd = bcrypt.hashSync('coach123', 10);
    const coach1Result = insertUser.run('coach1', coach1Pwd, 'coach', '张教练', '13800000001');
    const coach2Result = insertUser.run('coach2', coach1Pwd, 'coach', '李教练', '13800000002');

    const insertCoach = db.prepare(`
      INSERT INTO coaches (user_id, name, phone, license_types, subjects) VALUES (?, ?, ?, ?, ?)
    `);
    insertCoach.run(coach1Result.lastInsertRowid, '张教练', '13800000001', JSON.stringify(['C1', 'C2']), JSON.stringify([1, 2, 3, 4]));
    insertCoach.run(coach2Result.lastInsertRowid, '李教练', '13800000002', JSON.stringify(['C1']), JSON.stringify([1, 2]));

    const insertVenue = db.prepare(`
      INSERT INTO venues (name, type, capacity, address) VALUES (?, ?, ?, ?)
    `);
    insertVenue.run('训练场地A', 'training', 4, '驾校东区1号场地');
    insertVenue.run('训练场地B', 'training', 4, '驾校东区2号场地');
    insertVenue.run('科目二考场', 'exam', 20, '驾校西区考试中心');
    insertVenue.run('科目三考场', 'exam', 30, '驾校南区道路考场');

    const student1Pwd = bcrypt.hashSync('student123', 10);
    const student1Result = insertUser.run('student1', student1Pwd, 'student', '王学员', '13900000001');
    const student2Result = insertUser.run('student2', student1Pwd, 'student', '李学员', '13900000002');
    const student3Result = insertUser.run('student3', student1Pwd, 'student', '赵学员', '13900000003');

    const insertStudent = db.prepare(`
      INSERT INTO students (user_id, name, id_card, phone, gender, birthday, address, license_type, enroll_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStudent.run(
      student1Result.lastInsertRowid, '王学员', '110101199001011234', '13900000001',
      'male', '1990-01-01', '北京市朝阳区', 'C1', '2024-01-15', 'approved'
    );
    insertStudent.run(
      student2Result.lastInsertRowid, '李学员', '110101199202025678', '13900000002',
      'female', '1992-02-02', '北京市海淀区', 'C2', '2024-02-20', 'approved'
    );
    insertStudent.run(
      student3Result.lastInsertRowid, '赵学员', '110101199503039012', '13900000003',
      'male', '1995-03-03', '北京市西城区', 'C1', '2024-03-10', 'approved'
    );
  }

  console.log('Database initialized successfully');
}

export default db;
