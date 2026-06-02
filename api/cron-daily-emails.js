const nodemailer = require('nodemailer');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER;

const requireEnv = (res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'No se ha configurado Supabase en el servidor.' });
    return false;
  }
  if (!GMAIL_USER || !GMAIL_PASS) {
    res.status(500).json({ error: 'No se ha configurado Gmail en el servidor.' });
    return false;
  }
  return true;
};

const supabaseFetch = async (path, opts = {}) => {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1${path}`;
  const headers = Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }, opts.headers || {});
  return fetch(url, Object.assign({}, opts, { headers }));
};

const parseStudentRecords = (students) => {
  return students.reduce((acc, student) => {
    acc[student.id] = student;
    return acc;
  }, {});
};

const buildMessage = (student, attendances) => {
  const lines = attendances.map((item) => {
    const status = item.status === 'asistente' ? 'Asistió' : 'No asistió';
    const label = item.subject_label || item.subject;
    return `- ${label}: ${status}`;
  });

  return `Estimado/a representante,

Aquí está el resumen diario de asistencia del/la estudiante ${student.name} para el curso Año ${student.year}.

Materias:
${lines.join('\n')}

Este correo se envía automáticamente a las 12:00 PM con la asistencia registrada hasta ese momento.

Saludos cordiales,
Sistema de Gestión Escolar`;
};

const sendEmail = async (student, attendances) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"Sistema Escolar" <${EMAIL_FROM}>`,
    to: student.email,
    subject: `✅ Resumen diario de asistencia: ${student.name}`,
    text: buildMessage(student, attendances),
  });

  return info;
};

const getToday = () => new Date().toISOString().slice(0, 10);

module.exports = async (req, res) => {
  if (!requireEnv(res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const today = getToday();
    const attendancesResponse = await supabaseFetch(`/attendances?date=eq.${encodeURIComponent(today)}`);
    const attendances = await attendancesResponse.json();

    if (!Array.isArray(attendances) || !attendances.length) {
      return res.json({ success: true, message: 'No hay registros de asistencia para hoy.' });
    }

    const studentIds = [...new Set(attendances.map((item) => item.student_id))];
    const studentsResponse = await supabaseFetch(`/students?id=in.(${studentIds.join(',')})`);
    const students = await studentsResponse.json();
    const studentMap = parseStudentRecords(students);

    const grouped = attendances.reduce((acc, item) => {
      if (!acc[item.student_id]) acc[item.student_id] = [];
      acc[item.student_id].push(item);
      return acc;
    }, {});

    const sent = [];
    for (const [studentId, entries] of Object.entries(grouped)) {
      const student = studentMap[studentId];
      if (!student || !student.email) continue;
      await sendEmail(student, entries);
      sent.push(student.email);
    }

    return res.json({ success: true, sent });
  } catch (error) {
    console.error('cron-daily-emails error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
