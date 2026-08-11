import './env';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import pool, { initDb } from './db';
import { mapUserRow, mapGroupRow } from './helpers';
import { setDbConnected, requireDatabase, dbError } from './dbMiddleware';

import { fetchFinanceOverview, createFinanceTransaction } from './financeDb';
import {
  fetchStudentPayments,
  fetchMonthlyExpenses,
  saveMonthlyExpenses,
  createStudentPayment,
} from './financeDetailsDb';
import { fetchMonthlyBills, updateMonthlyBillAmount, ensureBillForNewStudent, fetchStudentsWithMonthlyStatus, fetchStudentMonthlyBill, syncStudentMonthlyFee } from './monthlyBillsDb';
import { fetchDashboardStats } from './dashboardStats';
import { sendAttendanceNotifications, type SmsTarget } from './attendanceSms';
import { sendAttendanceTelegramNotifications, type NotifyTarget } from './attendanceTelegram';
import { getAttendanceBlockedMessage, getClassTimeBlockedMessage, isTodayDate, isWithinClassTime, normalizeDateString, todayISO } from './dates';
import type { GroupDayType } from './groupDayTypes';
import { getSmsMode } from './smsService';
import { getTelegramBotUsername, handleTelegramUpdate, isTelegramConfigured } from './telegramBot';
import { getLinkedPhonesCount, initTelegramPhoneMap } from './telegramPhoneMap';
import { startTelegramPolling } from './telegramPolling';
import { pickGroupColorFromDb } from './groupColors';
import { nextGroupCode, normalizeGroupCode } from './nextGroupCode';
import { nextUserId } from './nextUserId';
import { listLeads, createLead, updateLead, deleteLead, convertLeadToStudent } from './leadsDb';
import { signToken } from './auth';
import {
  authenticateUser,
  getAuthUserById,
  setUserCredentials,
  fetchTeacherGroups,
  fetchStudentAttendanceHistory,
  isTeacherOfGroup,
} from './authDb';
import { canManageCredentials, canCreateRole } from './roles';
import { optionalAuth, requireAuth, requireRole } from './authMiddleware';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(optionalAuth);

let dbConnected = false;

async function start() {
  dbConnected = await initDb();
  setDbConnected(dbConnected);

  if (dbConnected) {
    console.log('PostgreSQL ulandi — barcha ma\'lumotlar bazada saqlanadi');
    await initTelegramPhoneMap();
  } else {
    console.error(
      'PostgreSQL ulanmadi — ma\'lumotlar saqlanmaydi. PostgreSQL ishlayotganini va server/.env ni tekshiring.'
    );
  }
}

app.get('/api/health', async (_req, res) => {
  res.json({
    ok: dbConnected,
    database: dbConnected ? 'connected' : 'disconnected',
    persistence: dbConnected,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login?.trim() || !password) {
    return res.status(400).json({ error: 'Login va parol kerak' });
  }

  try {
    const user = await authenticateUser(login, password);
    if (!user) return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user });
  } catch (err) {
    dbError(res, 'Kirish', err);
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await getAuthUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    res.json(user);
  } catch (err) {
    dbError(res, 'Profil', err);
  }
});

app.get('/api/me/groups', requireAuth, requireRole('teacher'), async (req, res) => {
  try {
    res.json(await fetchTeacherGroups(req.auth!.userId));
  } catch (err) {
    dbError(res, 'Guruhlar', err);
  }
});

app.get('/api/me/attendance', requireAuth, requireRole('student'), async (req, res) => {
  try {
    res.json(await fetchStudentAttendanceHistory(req.auth!.userId));
  } catch (err) {
    dbError(res, 'Davomat', err);
  }
});

app.put('/api/users/:id/credentials', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { login, password } = req.body;

  if (!login?.trim() || !password) {
    return res.status(400).json({ error: 'Login va parol kerak' });
  }

  try {
    const target = await pool.query(`SELECT id, role FROM users WHERE id = $1`, [id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    const targetRole = target.rows[0].role as 'director' | 'admin' | 'teacher' | 'student';
    if (!canManageCredentials(req.auth!.role, targetRole)) {
      return res.status(403).json({
        error:
          req.auth!.role === 'director'
            ? 'Xojayin admin, o\'qituvchi va o\'quvchi uchun login bera oladi'
            : 'Admin faqat o\'qituvchi va o\'quvchi uchun login bera oladi',
      });
    }

    const result = await setUserCredentials(id, login, password);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ success: true, login: login.trim().toLowerCase() });
  } catch (err) {
    dbError(res, 'Login saqlash', err);
  }
});

app.get('/api/sms/status', (_req, res) => {
  const mode = getSmsMode();
  if (mode === 'eskiz') {
    return res.json({
      configured: true,
      mode: 'eskiz',
      message: 'Eskiz.uz orqali SMS yuboriladi',
    });
  }
  if (mode === 'custom') {
    return res.json({
      configured: true,
      mode: 'custom',
      message: 'Maxsus SMS API ulangan',
    });
  }
  return res.json({
    configured: false,
    mode: 'mock',
    message: 'Haqiqiy SMS yuborilmaydi. server/.env ga ESKIZ_EMAIL va ESKIZ_PASSWORD qo\'ying',
  });
});

app.get('/api/telegram/status', (_req, res) => {
  const username = getTelegramBotUsername();
  const linkedPhones = getLinkedPhonesCount();
  if (isTelegramConfigured()) {
    return res.json({
      configured: true,
      botUsername: username,
      linkedPhones,
      message: username
        ? `@${username} — telefon ulangan: ${linkedPhones} ta. Ota-ona /start va telefon ulashadi.`
        : 'Telegram bot ulangan',
    });
  }
  return res.json({
    configured: false,
    botUsername: '',
    linkedPhones: 0,
    message: 'Telegram bot sozlanmagan. TELEGRAM_BOT_TOKEN qo\'ying (@BotFather)',
  });
});

app.post('/api/telegram/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    await handleTelegramUpdate(req.body);
  } catch (err) {
    console.error('[Telegram webhook]', err);
  }
});

app.use('/api', requireDatabase);

app.get('/api/dashboard/stats', async (_req, res) => {
  try {
    res.json(await fetchDashboardStats());
  } catch (err) {
    dbError(res, 'Statistika', err);
  }
});

app.get('/api/dashboard/schedule', async (req, res) => {
  const dayType = (req.query.dayType as string) || 'even';

  try {
    const query =
      dayType === 'other'
        ? `SELECT se.id, se.group_id, se.room_number, se.start_time, se.end_time, se.group_code,
                  se.teacher_name, se.teacher_id, se.color, se.day_type,
                  COALESCE(g.name, se.group_code) AS group_name
           FROM schedule_entries se
           LEFT JOIN groups g ON g.id = se.group_id
           WHERE se.branch_id = 1
           ORDER BY se.room_number, se.start_time`
        : `SELECT se.id, se.group_id, se.room_number, se.start_time, se.end_time, se.group_code,
                  se.teacher_name, se.teacher_id, se.color, se.day_type,
                  COALESCE(g.name, se.group_code) AS group_name
           FROM schedule_entries se
           LEFT JOIN groups g ON g.id = se.group_id
           WHERE se.branch_id = 1
             AND (se.day_type = $1 OR se.day_type IN ('weekdays', 'daily'))
           ORDER BY se.room_number, se.start_time`;

    const result =
      dayType === 'other'
        ? await pool.query(query)
        : await pool.query(query, [dayType]);

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        groupId: row.group_id,
        roomNumber: row.room_number,
        startTime: row.start_time.slice(0, 5),
        endTime: row.end_time.slice(0, 5),
        groupCode: row.group_code,
        groupName: row.group_name,
        teacherName: row.teacher_name,
        teacherId: row.teacher_id,
        color: row.color,
        dayType: row.day_type,
      }))
    );
  } catch (err) {
    dbError(res, 'Jadval', err);
  }
});

app.get('/api/groups', async (_req, res) => {


  try {
    const result = await pool.query(`
      SELECT g.*, COUNT(u.id)::int AS students_count
      FROM groups g
      LEFT JOIN users u ON u.group_id = g.id AND u.role = 'student'
      GROUP BY g.id
      ORDER BY g.code
    `);
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        teacherId: row.teacher_id,
        teacherName: row.teacher_name,
        roomNumber: row.room_number,
        startTime: String(row.start_time).slice(0, 5),
        endTime: String(row.end_time).slice(0, 5),
        dayType: row.day_type,
        color: row.color,
        studentsCount: row.students_count,
      }))
    );
  } catch (err) {
    dbError(res, 'Guruhlar', err);
  }
});

app.get('/api/teachers', async (_req, res) => {


  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.phone, u.email, COALESCE(u.photo_url, '') AS photo_url,
             u.login,
             (u.login IS NOT NULL AND u.password_hash IS NOT NULL) AS has_login,
             COUNT(g.id)::int AS groups_count
      FROM users u
      LEFT JOIN groups g ON g.teacher_id = u.id
      WHERE u.role = 'teacher'
      GROUP BY u.id
      ORDER BY u.name
    `);
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone ?? '',
        email: row.email ?? '',
        photoUrl: row.photo_url ?? '',
        login: row.login ?? '',
        hasLogin: Boolean(row.has_login),
        groupsCount: row.groups_count,
      }))
    );
  } catch (err) {
    dbError(res, 'O\'qituvchilar', err);
  }
});

app.post('/api/teachers', requireAuth, requireRole('director', 'admin'), async (req, res) => {
  if (!canCreateRole(req.auth!.role, 'teacher')) {
    return res.status(403).json({ error: 'O\'qituvchi qo\'shishga ruxsat yo\'q' });
  }

  const { name, phone, email, login, password } = req.body;

  try {
    const id = await nextUserId(pool, 'teacher');
    await pool.query(
      `INSERT INTO users (id, name, role, phone, email) VALUES ($1, $2, 'teacher', $3, $4)`,
      [id, name?.trim(), phone?.trim() || '', email?.trim() || '']
    );

    let savedLogin = '';
    let hasLogin = false;
    if (login?.trim() && password) {
      if (!canManageCredentials(req.auth!.role, 'teacher')) {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return res.status(403).json({ error: 'Login berishga ruxsat yo\'q' });
      }
      const cred = await setUserCredentials(id, login, password);
      if (!cred.ok) {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return res.status(400).json({ error: cred.error });
      }
      savedLogin = login.trim().toLowerCase();
      hasLogin = true;
    }

    res.status(201).json({
      id,
      name: name?.trim(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      photoUrl: '',
      login: savedLogin,
      hasLogin,
      groupsCount: 0,
    });
  } catch (err) {
    console.error('[POST /api/teachers]', err);
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.get('/api/admins', requireAuth, requireRole('director'), async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.phone, u.email, COALESCE(u.photo_url, '') AS photo_url,
             u.login,
             (u.login IS NOT NULL AND u.password_hash IS NOT NULL) AS has_login
      FROM users u
      WHERE u.role = 'admin'
      ORDER BY u.name
    `);
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone ?? '',
        email: row.email ?? '',
        photoUrl: row.photo_url ?? '',
        login: row.login ?? '',
        hasLogin: Boolean(row.has_login),
      }))
    );
  } catch (err) {
    dbError(res, 'Adminlar', err);
  }
});

app.post('/api/admins', requireAuth, requireRole('director'), async (req, res) => {
  const { name, phone, email, login, password } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Ism kiritilishi shart' });
  }

  try {
    const id = await nextUserId(pool, 'admin');
    await pool.query(
      `INSERT INTO users (id, name, role, phone, email) VALUES ($1, $2, 'admin', $3, $4)`,
      [id, name.trim(), phone?.trim() || '', email?.trim() || '']
    );

    let savedLogin = '';
    let hasLogin = false;
    if (login?.trim() && password) {
      const cred = await setUserCredentials(id, login, password);
      if (!cred.ok) {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return res.status(400).json({ error: cred.error });
      }
      savedLogin = login.trim().toLowerCase();
      hasLogin = true;
    }

    res.status(201).json({
      id,
      name: name.trim(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      photoUrl: '',
      login: savedLogin,
      hasLogin,
    });
  } catch (err) {
    console.error('[POST /api/admins]', err);
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.delete('/api/admins/:id', requireAuth, requireRole('director'), async (req, res) => {
  const { id } = req.params;

  if (id === 'director') {
    return res.status(403).json({ error: 'Xojayinni o\'chirib bo\'lmaydi' });
  }
  if (id === req.auth!.userId) {
    return res.status(403).json({ error: 'O\'zingizni o\'chirib bo\'lmaydi' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND role = 'admin' RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin topilmadi' });
    }
    res.json({ success: true });
  } catch (err) {
    dbError(res, 'Admin o\'chirish', err);
  }
});

app.put('/api/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;



  try {
    await pool.query(
      `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone), email = COALESCE($4, email)
       WHERE id = $1 AND role = 'teacher'`,
      [id, name, phone, email]
    );
    await pool.query(
      `UPDATE groups SET teacher_name = $2 WHERE teacher_id = $1`,
      [id, name]
    );
    await pool.query(
      `UPDATE schedule_entries SET teacher_name = $2 WHERE teacher_id = $1`,
      [id, name]
    );
    const result = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, COALESCE(u.photo_url, '') AS photo_url,
              COUNT(g.id)::int AS groups_count
       FROM users u
       LEFT JOIN groups g ON g.teacher_id = u.id
       WHERE u.id = $1 AND u.role = 'teacher'
       GROUP BY u.id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'O\'qituvchi topilmadi' });
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      phone: row.phone ?? '',
      email: row.email ?? '',
      photoUrl: row.photo_url ?? '',
      groupsCount: row.groups_count,
    });
  } catch {
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.delete('/api/teachers/:id', async (req, res) => {
  const { id } = req.params;



  try {
    const groups = await pool.query('SELECT id FROM groups WHERE teacher_id = $1 LIMIT 1', [id]);
    if (groups.rows.length > 0) {
      return res.status(400).json({ error: 'Guruhlari bor o\'qituvchini o\'chirib bo\'lmaydi' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id', [id, 'teacher']);
    if (result.rowCount === 0) return res.status(404).json({ error: 'O\'qituvchi topilmadi' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'O\'chirishda xatolik' });
  }
});

app.post('/api/groups', async (req, res) => {
  const body = req.body;



  try {
    const teacherResult = await pool.query(
      `SELECT id, name FROM users WHERE id = $1 AND role = 'teacher'`,
      [body.teacherId]
    );
    if (teacherResult.rows.length === 0) {
      return res.status(400).json({ error: "O'qituvchi topilmadi" });
    }
    const teacher = teacherResult.rows[0];

    const code = normalizeGroupCode(body.code) ?? (await nextGroupCode(pool));

    const existing = await pool.query('SELECT id FROM groups WHERE id = $1 OR code = $1', [code]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Guruh kodi "${code}" band. Boshqa kod kiriting yoki bo'sh qoldiring.` });
    }

    const rawName = body.name?.trim();
    if (!rawName) {
      return res.status(400).json({ error: 'Guruh nomi kiritilishi shart' });
    }
    const name = rawName.startsWith('Guruh') ? rawName : `Guruh ${code} — ${rawName}`;
    const groupColor = body.color?.trim() || (await pickGroupColorFromDb(pool));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO groups (id, code, name, teacher_id, teacher_name, room_number, start_time, end_time, day_type, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          code,
          code,
          name,
          teacher.id,
          teacher.name,
          Number(body.roomNumber) || 1,
          body.startTime,
          body.endTime,
          body.dayType,
          groupColor,
        ]
      );
      await client.query(
        `INSERT INTO schedule_entries (branch_id, group_id, day_type, room_number, start_time, end_time, group_code, teacher_name, teacher_id, color)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          code,
          body.dayType,
          Number(body.roomNumber) || 1,
          body.startTime,
          body.endTime,
          code,
          teacher.name,
          teacher.id,
          groupColor,
        ]
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.status(201).json({
      id: code,
      code,
      name,
      teacherId: teacher.id,
      teacherName: teacher.name,
      roomNumber: Number(body.roomNumber) || 1,
      startTime: body.startTime,
      endTime: body.endTime,
      dayType: body.dayType,
      color: groupColor,
      studentsCount: 0,
    });
  } catch (err) {
    console.error('[POST /api/groups]', err);
    res.status(500).json({ error: 'Guruh saqlashda xatolik' });
  }
});

app.get('/api/groups/:id', async (req, res) => {
  const { id } = req.params;



  try {
    const result = await pool.query(
      `SELECT g.*,
        json_agg(json_build_object(
          'id', u.id,
          'name', u.name,
          'photoUrl', COALESCE(u.photo_url, '')
        )) AS students
       FROM groups g
       LEFT JOIN users u ON u.group_id = g.id AND u.role = 'student'
       WHERE g.id = $1 OR g.code = $1
       GROUP BY g.id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Guruh topilmadi' });
    res.json(mapGroupRow(result.rows[0]));
  } catch (err) {
    dbError(res, 'Guruh', err);
  }
});

app.get('/api/groups/:id/attendance', async (req, res) => {
  const { id } = req.params;
  const date = normalizeDateString(req.query.date) || todayISO();



  try {
    const groupResult = await pool.query(
      'SELECT id FROM groups WHERE id = $1 OR code = $1 LIMIT 1',
      [id]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guruh topilmadi' });
    }
    const groupId = groupResult.rows[0].id;

    const studentsResult = await pool.query(
      `SELECT u.id, u.name, COALESCE(u.photo_url, '') AS photo_url
       FROM users u WHERE u.group_id = $1 AND u.role = 'student' ORDER BY u.name`,
      [groupId]
    );

    const attendanceResult = await pool.query(
      `SELECT student_id, status, grade FROM attendance WHERE group_id = $1 AND date = $2`,
      [groupId, date]
    );

    const savedMap = Object.fromEntries(
      attendanceResult.rows.map((row) => [row.student_id, row.status])
    );
    const gradeMap = Object.fromEntries(
      attendanceResult.rows.map((row) => [row.student_id, row.grade])
    );

    res.json({
      groupId,
      date,
      saved: attendanceResult.rows.length > 0,
      locked: attendanceResult.rows.length > 0,
      students: studentsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        photoUrl: row.photo_url ?? '',
        status: savedMap[row.id] ?? 'present',
        grade: gradeMap[row.id] ?? null,
      })),
    });
  } catch (err) {
    dbError(res, 'Davomat', err);
  }
});

app.put('/api/groups/:id/attendance', async (req, res) => {
  const { id } = req.params;
  const {
    date,
    records,
    sendTelegram = true,
    telegramTarget = 'parents',
    sendSms = false,
    smsTarget = 'parents',
  } = req.body as {
    date: string;
    records: { studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; grade?: 'excellent' | 'good' | 'no_homework' | null }[];
    sendTelegram?: boolean;
    telegramTarget?: NotifyTarget;
    sendSms?: boolean;
    smsTarget?: SmsTarget;
  };

  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Sana va davomat ma\'lumotlari kerak' });
  }

  if (!isTodayDate(date)) {
    return res.status(403).json({ error: 'Davomat faqat bugungi kun uchun qo\'yiladi' });
  }

  const attendanceDate = todayISO();

  try {
    const groupResult = await pool.query(
      `SELECT id, name, day_type,
              to_char(start_time, 'HH24:MI') AS start_time,
              to_char(end_time, 'HH24:MI') AS end_time
       FROM groups WHERE id = $1 OR code = $1 LIMIT 1`,
      [id]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guruh topilmadi' });
    }
    const groupRow = groupResult.rows[0];
    const groupDayType = groupRow.day_type as GroupDayType;
    const startTime = String(groupRow.start_time);
    const endTime = String(groupRow.end_time);
    const blockedMessage = getAttendanceBlockedMessage(groupDayType);
    if (blockedMessage) {
      return res.status(403).json({ error: blockedMessage });
    }

    const classTimeMessage = getClassTimeBlockedMessage(startTime, endTime);
    if (classTimeMessage) {
      return res.status(403).json({ error: classTimeMessage });
    }

    const existingAttendance = await pool.query(
      `SELECT 1 FROM attendance WHERE group_id = $1 AND date = $2 LIMIT 1`,
      [groupRow.id, attendanceDate]
    );
    if (existingAttendance.rows.length > 0) {
      return res.status(403).json({
        error: 'Bugungi davomat allaqachon qo\'yilgan — bir kunda faqat bir marta',
      });
    }

    if (req.auth?.role === 'teacher') {
      const allowed = await isTeacherOfGroup(req.auth.userId, groupRow.id);
      if (!allowed) return res.status(403).json({ error: 'Bu guruh sizga tegishli emas' });
    }

    for (const record of records) {
      if ((record.status === 'present' || record.status === 'late') && !record.grade) {
        return res.status(400).json({ error: 'Kelgan va kechikkan o\'quvchilar uchun baho tanlang' });
      }

      await pool.query(
        `INSERT INTO attendance (group_id, student_id, date, status, grade)
         VALUES ($1, $2, $3, $4, $5)`,
        [groupRow.id, record.studentId, attendanceDate, record.status, record.grade ?? null]
      );
    }

    const studentsResult = await pool.query(
      `SELECT u.id, u.name, u.phone, u.father_phone, u.mother_phone,
              u.telegram_chat_id, u.father_telegram_chat_id, u.mother_telegram_chat_id,
              COALESCE(u.photo_url, '') AS photo_url
       FROM users u WHERE u.group_id = $1 AND u.role = 'student' ORDER BY u.name`,
      [groupRow.id]
    );

    const attendanceResult = await pool.query(
      `SELECT student_id, status, grade FROM attendance WHERE group_id = $1 AND date = $2`,
      [groupRow.id, attendanceDate]
    );

    const savedMap = Object.fromEntries(
      attendanceResult.rows.map((row) => [row.student_id, row.status])
    );
    const gradeMap = Object.fromEntries(
      attendanceResult.rows.map((row) => [row.student_id, row.grade])
    );

    const contacts = studentsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone ?? '',
      fatherPhone: row.father_phone ?? '',
      motherPhone: row.mother_phone ?? '',
      telegramChatId: row.telegram_chat_id ?? '',
      fatherTelegramChatId: row.father_telegram_chat_id ?? '',
      motherTelegramChatId: row.mother_telegram_chat_id ?? '',
    }));

    const telegram = await sendAttendanceTelegramNotifications(
      groupRow.name,
      attendanceDate,
      records,
      contacts,
      telegramTarget,
      Boolean(sendTelegram)
    );

    const sms = await sendAttendanceNotifications(
      groupRow.name,
      attendanceDate,
      records,
      contacts,
      smsTarget,
      Boolean(sendSms)
    );

    res.json({
      groupId: groupRow.id,
      date: attendanceDate,
      saved: true,
      locked: true,
      students: studentsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        photoUrl: row.photo_url ?? '',
        status: savedMap[row.id] ?? 'present',
        grade: gradeMap[row.id] ?? null,
      })),
      telegram,
      sms,
    });
  } catch (err) {
    dbError(res, 'Davomat saqlash', err);
  }
});

app.get('/api/students/list', async (req, res) => {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;

  try {
    res.json(await fetchStudentsWithMonthlyStatus(year, month));
  } catch (err) {
    dbError(res, 'O\'quvchilar ro\'yxati', err);
  }
});

app.post('/api/students', requireAuth, requireRole('director', 'admin'), async (req, res) => {
  if (!canCreateRole(req.auth!.role, 'student')) {
    return res.status(403).json({ error: 'O\'quvchi qo\'shishga ruxsat yo\'q' });
  }

  const { name, phone, email, groupId, paymentDue, monthlyFee, login, password } = req.body;
  const fee = Number(monthlyFee ?? paymentDue ?? 0);

  try {
    const id = await nextUserId(pool, 'student');
    await pool.query(
      `INSERT INTO users (id, name, role, phone, email, group_id, payment_due, monthly_fee)
       VALUES ($1, $2, 'student', $3, $4, $5, $6, $7)`,
      [id, name?.trim(), phone?.trim() || '', email?.trim() || '', groupId || null, fee, fee]
    );

    if (fee > 0) {
      await syncStudentMonthlyFee(id, fee);
    } else {
      await ensureBillForNewStudent(id);
    }

    if (login?.trim() && password) {
      if (!canManageCredentials(req.auth!.role, 'student')) {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return res.status(403).json({ error: 'Login berishga ruxsat yo\'q' });
      }
      const cred = await setUserCredentials(id, login, password);
      if (!cred.ok) {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return res.status(400).json({ error: cred.error });
      }
    }

    let groupName: string | undefined;
    if (groupId) {
      const groupResult = await pool.query('SELECT name FROM groups WHERE id = $1', [groupId]);
      groupName = groupResult.rows[0]?.name;
    }

    const bill = await fetchStudentMonthlyBill(id);

    res.status(201).json({
      id,
      name: name?.trim(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      photoUrl: '',
      groupId: groupId || undefined,
      groupName,
      paymentDue: fee,
      monthlyFee: fee,
      currentBillAmount: bill?.currentBillAmount ?? fee,
      paidAmount: bill?.paidAmount ?? 0,
      remainingAmount: bill?.remainingAmount ?? fee,
      paymentStatus: bill?.paymentStatus ?? 'pending',
      paymentDate: bill?.paymentDate ?? null,
      login: login?.trim().toLowerCase() ?? '',
      hasLogin: Boolean(login?.trim() && password),
    });
  } catch (err) {
    console.error('[POST /api/students]', err);
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, groupId, paymentDue, monthlyFee } = req.body;
  const fee =
    monthlyFee != null && monthlyFee !== ''
      ? Number(monthlyFee)
      : paymentDue != null && paymentDue !== ''
        ? Number(paymentDue)
        : null;

  try {
    await pool.query(
      `UPDATE users SET
        name = COALESCE($2, name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        group_id = $5,
        payment_due = COALESCE($6, payment_due),
        monthly_fee = COALESCE($7, monthly_fee)
       WHERE id = $1 AND role = 'student'`,
      [id, name, phone, email, groupId || null, fee, fee]
    );

    if (fee != null && !Number.isNaN(fee)) {
      await syncStudentMonthlyFee(id, fee);
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, COALESCE(u.photo_url, '') AS photo_url,
              u.group_id, g.name AS group_name, COALESCE(u.payment_due, 0) AS payment_due,
              COALESCE(u.monthly_fee, 0) AS monthly_fee
       FROM users u
       LEFT JOIN groups g ON g.id = u.group_id
       WHERE u.id = $1 AND u.role = 'student'`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'O\'quvchi topilmadi' });
    const row = result.rows[0];
    const bill = await fetchStudentMonthlyBill(id);

    res.json({
      id: row.id,
      name: row.name,
      phone: row.phone ?? '',
      email: row.email ?? '',
      photoUrl: row.photo_url ?? '',
      groupId: row.group_id ?? undefined,
      groupName: row.group_name ?? undefined,
      paymentDue: Number(row.payment_due),
      monthlyFee: Number(row.monthly_fee),
      currentBillAmount: bill?.currentBillAmount ?? Number(row.monthly_fee),
      paidAmount: bill?.paidAmount ?? 0,
      remainingAmount: bill?.remainingAmount ?? Number(row.monthly_fee),
      paymentStatus: bill?.paymentStatus ?? 'pending',
      paymentDate: bill?.paymentDate ?? null,
    });
  } catch {
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;



  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
      [id, 'student']
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'O\'quvchi topilmadi' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'O\'chirishda xatolik' });
  }
});

app.get('/api/students', async (req, res) => {
  const excludeGroup = req.query.excludeGroup as string | undefined;



  try {
    const result = excludeGroup
      ? await pool.query(
          `SELECT u.id, u.name, u.phone, COALESCE(u.photo_url, '') AS photo_url,
                  u.group_id, g.name AS group_name
           FROM users u
           LEFT JOIN groups g ON g.id = u.group_id
           WHERE u.role = 'student' AND (u.group_id IS NULL OR u.group_id != $1)
           ORDER BY u.name`,
          [excludeGroup]
        )
      : await pool.query(
          `SELECT u.id, u.name, u.phone, COALESCE(u.photo_url, '') AS photo_url,
                  u.group_id, g.name AS group_name
           FROM users u
           LEFT JOIN groups g ON g.id = u.group_id
           WHERE u.role = 'student'
           ORDER BY u.name`
        );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone ?? '',
        photoUrl: row.photo_url ?? '',
        groupId: row.group_id ?? undefined,
        groupName: row.group_name ?? undefined,
      }))
    );
  } catch (err) {
    dbError(res, 'Mavjud o\'quvchilar', err);
  }
});

app.post('/api/groups/:id/students', async (req, res) => {
  const { id } = req.params;
  const { userId, name, phone, email } = req.body;



  try {
    const groupResult = await pool.query(
      'SELECT id, name FROM groups WHERE id = $1 OR code = $1 LIMIT 1',
      [id]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guruh topilmadi' });
    }
    const groupRow = groupResult.rows[0];

    if (userId) {
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2',
        [userId, 'student']
      );
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'O\'quvchi topilmadi' });
      }

      await pool.query('UPDATE users SET group_id = $1 WHERE id = $2', [groupRow.id, userId]);
    } else {
      if (!name?.trim()) {
        return res.status(400).json({ error: 'O\'quvchi ismi kiritilishi shart' });
      }

      const newId = await nextUserId(pool, 'student');
      await pool.query(
        `INSERT INTO users (id, name, role, phone, email, group_id)
         VALUES ($1, $2, 'student', $3, $4, $5)`,
        [newId, name.trim(), phone?.trim() || '', email?.trim() || '', groupRow.id]
      );
    }

    const result = await pool.query(
      `SELECT g.*,
        json_agg(json_build_object(
          'id', u.id,
          'name', u.name,
          'photoUrl', COALESCE(u.photo_url, '')
        )) AS students
       FROM groups g
       LEFT JOIN users u ON u.group_id = g.id AND u.role = 'student'
       WHERE g.id = $1
       GROUP BY g.id`,
      [groupRow.id]
    );

    res.json(mapGroupRow(result.rows[0]));
  } catch {
    res.status(500).json({ error: 'O\'quvchi qo\'shishda xatolik' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;



  try {
    const result = await pool.query(
      `SELECT u.*, g.name AS group_name
       FROM users u
       LEFT JOIN groups g ON g.id = u.group_id
       WHERE u.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    const row = result.rows[0];
    const user = mapUserRow({ ...row, group_name: row.group_name });

    if (user.role === 'student') {
      const bill = await fetchStudentMonthlyBill(user.id);
      res.json({
        ...user,
        currentBillAmount: bill?.currentBillAmount ?? user.monthlyFee ?? 0,
        paidAmount: bill?.paidAmount ?? 0,
        remainingAmount: bill?.remainingAmount ?? user.monthlyFee ?? 0,
        paymentStatus: bill?.paymentStatus ?? 'pending',
        paymentDate: bill?.paymentDate ?? null,
      });
      return;
    }

    res.json(user);
  } catch (err) {
    dbError(res, 'Foydalanuvchi', err);
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body;



  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const mapping: Record<string, string> = {
      name: 'name',
      phone: 'phone',
      email: 'email',
      address: 'address',
      paymentDue: 'payment_due',
      monthlyFee: 'monthly_fee',
      photoUrl: 'photo_url',
      fatherName: 'father_name',
      fatherPhone: 'father_phone',
      motherName: 'mother_name',
      motherPhone: 'mother_phone',
      telegramChatId: 'telegram_chat_id',
      fatherTelegramChatId: 'father_telegram_chat_id',
      motherTelegramChatId: 'mother_telegram_chat_id',
    };

    for (const [key, col] of Object.entries(mapping)) {
      if (body[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(
          key === 'paymentDue' || key === 'monthlyFee' ? Number(body[key]) : body[key]
        );
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Yangilash uchun ma\'lumot yo\'q' });
    }

    values.push(id);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`,
      values
    );

    if (body.monthlyFee != null && typeof id === 'string') {
      await syncStudentMonthlyFee(id, Number(body.monthlyFee));
    }

    const result = await pool.query(
      `SELECT u.*, g.name AS group_name FROM users u
       LEFT JOIN groups g ON g.id = u.group_id WHERE u.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    const updatedUser = mapUserRow(result.rows[0]);

    if (updatedUser.role === 'student') {
      const bill = await fetchStudentMonthlyBill(updatedUser.id);
      res.json({
        ...updatedUser,
        currentBillAmount: bill?.currentBillAmount ?? updatedUser.monthlyFee ?? 0,
        paidAmount: bill?.paidAmount ?? 0,
        remainingAmount: bill?.remainingAmount ?? updatedUser.monthlyFee ?? 0,
        paymentStatus: bill?.paymentStatus ?? 'pending',
        paymentDate: bill?.paymentDate ?? null,
      });
      return;
    }

    res.json(updatedUser);
  } catch {
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.put('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body;



  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    let updatedTeacherId: string | undefined;
    let updatedTeacherName: string | undefined;

    const mapping: Record<string, string> = {
      name: 'name',
      roomNumber: 'room_number',
      startTime: 'start_time',
      endTime: 'end_time',
      dayType: 'day_type',
      color: 'color',
    };

    for (const [key, col] of Object.entries(mapping)) {
      if (body[key] !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(body[key]);
      }
    }

    if (body.teacherId !== undefined) {
      const teacherResult = await pool.query(
        `SELECT id, name FROM users WHERE id = $1 AND role = 'teacher'`,
        [body.teacherId]
      );
      if (teacherResult.rows.length === 0) {
        return res.status(400).json({ error: "O'qituvchi topilmadi" });
      }
      const teacher = teacherResult.rows[0];
      updatedTeacherId = teacher.id;
      updatedTeacherName = teacher.name;
      fields.push(`teacher_id = $${i++}`);
      values.push(teacher.id);
      fields.push(`teacher_name = $${i++}`);
      values.push(teacher.name);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Yangilash uchun ma\'lumot yo\'q' });
    }

    values.push(id);
    await pool.query(
      `UPDATE groups SET ${fields.join(', ')} WHERE id = $${i} OR code = $${i}`,
      values
    );

    await pool.query(
      `UPDATE schedule_entries SET
        room_number = COALESCE($2, room_number),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        day_type = COALESCE($5, day_type),
        color = COALESCE($6, color),
        teacher_id = COALESCE($7, teacher_id),
        teacher_name = COALESCE($8, teacher_name)
       WHERE group_id = (SELECT id FROM groups WHERE id = $1 OR code = $1 LIMIT 1)`,
      [
        id,
        body.roomNumber,
        body.startTime,
        body.endTime,
        body.dayType,
        body.color,
        updatedTeacherId ?? null,
        updatedTeacherName ?? null,
      ]
    );

    const result = await pool.query(
      `SELECT g.*,
        json_agg(json_build_object(
          'id', u.id,
          'name', u.name,
          'photoUrl', COALESCE(u.photo_url, '')
        )) AS students
       FROM groups g
       LEFT JOIN users u ON u.group_id = g.id AND u.role = 'student'
       WHERE g.id = $1 OR g.code = $1
       GROUP BY g.id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Guruh topilmadi' });
    res.json(mapGroupRow(result.rows[0]));
  } catch {
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  const { id } = req.params;



  try {
    await pool.query('DELETE FROM schedule_entries WHERE group_id = $1', [id]);
    await pool.query('UPDATE users SET group_id = NULL WHERE group_id = $1', [id]);
    const result = await pool.query('DELETE FROM groups WHERE id = $1 OR code = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Guruh topilmadi' });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'O\'chirishda xatolik' });
  }
});

app.get('/api/finance/overview', async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;



  try {
    res.json(await fetchFinanceOverview(year, month));
  } catch (err) {
    dbError(res, 'Moliya', err);
  }
});

app.post('/api/finance/transactions', async (req, res) => {
  const { type, amount, method, description, transactionDate } = req.body;

  if (!type || !amount) {
    return res.status(400).json({ error: 'Tur va summa kerak' });
  }
  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Tur income yoki expense bo\'lishi kerak' });
  }



  try {
    const created = await createFinanceTransaction({
      type,
      amount: Number(amount),
      method,
      description,
      transactionDate,
    });
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: 'Moliya yozuvini saqlashda xatolik' });
  }
});

app.get('/api/finance/student-payments', async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!year || !month) {
    return res.status(400).json({ error: 'Yil va oy kerak' });
  }

  try {
    res.json(await fetchStudentPayments(year, month));
  } catch (err) {
    dbError(res, 'To\'lovlar', err);
  }
});

app.post('/api/finance/student-payments', async (req, res) => {
  const { studentId, amount, method, paymentDate, note, billYear, billMonth } = req.body;

  if (!studentId || !amount) {
    return res.status(400).json({ error: 'O\'quvchi va summa kerak' });
  }

  try {
    const created = await createStudentPayment({
      studentId,
      amount: Number(amount),
      method,
      paymentDate,
      note,
      billYear: billYear != null ? Number(billYear) : undefined,
      billMonth: billMonth != null ? Number(billMonth) : undefined,
    });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Error && err.message && !String(err).includes('duplicate')) {
      return res.status(400).json({ error: err.message });
    }
    dbError(res, 'To\'lov saqlash', err);
  }
});

app.get('/api/finance/monthly-bills', async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!year || !month) {
    return res.status(400).json({ error: 'Yil va oy kerak' });
  }

  try {
    res.json(await fetchMonthlyBills(year, month));
  } catch (err) {
    dbError(res, 'Oylik to\'lovlar', err);
  }
});

app.put('/api/finance/monthly-bills/:id', async (req, res) => {
  const billId = Number(req.params.id);
  const { expectedAmount } = req.body;

  if (!billId || expectedAmount == null) {
    return res.status(400).json({ error: 'Summa kerak' });
  }

  try {
    const updated = await updateMonthlyBillAmount(billId, Number(expectedAmount));
    if (!updated) {
      return res.status(404).json({ error: 'To\'lov allaqachon qilingan yoki topilmadi' });
    }
    res.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message) {
      return res.status(400).json({ error: err.message });
    }
    dbError(res, 'Oylik to\'lov summasini yangilash', err);
  }
});

app.get('/api/finance/monthly-expenses', async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!year || !month) {
    return res.status(400).json({ error: 'Yil va oy kerak' });
  }



  try {
    res.json(await fetchMonthlyExpenses(year, month));
  } catch (err) {
    dbError(res, 'Xarajatlar', err);
  }
});

app.put('/api/finance/monthly-expenses', async (req, res) => {
  const { year, month, teacherSalaries, electricity, electricityNote } = req.body;

  if (!year || !month) {
    return res.status(400).json({ error: 'Yil va oy kerak' });
  }



  try {
    const saved = await saveMonthlyExpenses({
      year: Number(year),
      month: Number(month),
      teacherSalaries: teacherSalaries ?? [],
      electricity: Number(electricity ?? 0),
      electricityNote,
    });
    res.json(saved);
  } catch {
    res.status(500).json({ error: 'Xarajatlarni saqlashda xatolik' });
  }
});

app.get('/api/leads', async (_req, res) => {
  try {
    res.json(await listLeads());
  } catch (err) {
    dbError(res, 'Lidlar', err);
  }
});

app.post('/api/leads', async (req, res) => {
  const { name, phone, source, status, courseInterest, note } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Ism kiritilishi shart' });
  }
  if (status === 'converted') {
    return res.status(400).json({ error: 'Avval lid sifatida qo\'shing, keyin o\'quvchiga aylantiring' });
  }

  try {
    const created = await createLead({ name, phone, source, status, courseInterest, note });
    res.status(201).json(created);
  } catch (err) {
    dbError(res, 'Lid qo\'shish', err);
  }
});

app.put('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, source, status, courseInterest, note } = req.body;

  if (status === 'converted') {
    return res.status(400).json({
      error: 'O\'quvchiga aylantirish uchun kartadagi "O\'quvchi" tugmasidan foydalaning',
    });
  }

  try {
    const updated = await updateLead(id, { name, phone, source, status, courseInterest, note });
    if (!updated) return res.status(404).json({ error: 'Lid topilmadi' });
    res.json(updated);
  } catch (err) {
    dbError(res, 'Lid yangilash', err);
  }
});

app.post('/api/leads/:id/convert', async (req, res) => {
  const { id } = req.params;
  const { groupId, paymentDue, email } = req.body;

  try {
    const result = await convertLeadToStudent(id, {
      groupId,
      paymentDue: paymentDue != null ? Number(paymentDue) : undefined,
      email,
    });
    if (!result) return res.status(404).json({ error: 'Lid topilmadi' });
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'DUPLICATE_PHONE') {
      return res.status(409).json({ error: 'Bu telefon raqami bilan o\'quvchi allaqachon mavjud' });
    }
    dbError(res, 'Lidni o\'quvchiga aylantirish', err);
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const ok = await deleteLead(id);
    if (!ok) return res.status(404).json({ error: 'Lid topilmadi' });
    res.json({ success: true });
  } catch (err) {
    dbError(res, 'Lid o\'chirish', err);
  }
});

app.get('/api/branches', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM branches ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    dbError(res, 'Filiallar', err);
  }
});

function setupClientApp() {
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  const indexHtml = path.join(clientDist, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.warn('Client build topilmadi:', clientDist);
    return;
  }

  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(indexHtml);
  });
}

setupClientApp();

start()
  .then(() => {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      if (isTelegramConfigured()) {
        const username = getTelegramBotUsername();
        console.log(`Telegram bot: @${username || 'ulangan'}`);
        startTelegramPolling();
      }
    });
  })
  .catch((err) => {
    console.error('Server ishga tushirishda xatolik:', err);
    process.exit(1);
  });
