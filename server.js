const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WABA_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER;
const ATTENDANCE_FILE = path.join(__dirname, 'attendance-data.json');

const loadAttendanceData = () => {
  try {
    if (!fs.existsSync(ATTENDANCE_FILE)) {
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify({ students: {}, lastDailyEmailSentDate: '' }, null, 2));
    }
    const raw = fs.readFileSync(ATTENDANCE_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return {
      students: parsed.students || {},
      lastDailyEmailSentDate: parsed.lastDailyEmailSentDate || '',
    };
  } catch (error) {
    console.error('Error leyendo attendance-data.json:', error);
    return { students: {}, lastDailyEmailSentDate: '' };
  }
};

const saveAttendanceData = (data) => {
  try {
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error guardando attendance-data.json:', error);
  }
};

// Configurar hora de envío diaria en el servidor (por defecto 21:25)
const DAILY_SEND_HOUR = Number(process.env.DAILY_SEND_HOUR || 21);
const DAILY_SEND_MINUTE = Number(process.env.DAILY_SEND_MINUTE || 25);
const getNextNoonDelay = () => {
  const now = new Date();
  const nextSend = new Date(now);
  nextSend.setHours(DAILY_SEND_HOUR, DAILY_SEND_MINUTE, 0, 0);
  if (now >= nextSend) {
    nextSend.setDate(nextSend.getDate() + 1);
  }
  return nextSend - now;
};

const buildStudentAttendanceMessage = (student) => {
  const attendanceEntries = Object.entries(student.attendance || {});
  const rows = attendanceEntries.map(([subjectId, entry]) => {
    const label = entry.label || subjectId;
    const status = entry.status === 'asistente' ? 'Asistió' : 'No asistió';
    return `- ${label}: ${status}`;
  });

  return `Estimado/a representante,

Aquí está el resumen diario de asistencia del/la estudiante ${student.name} para el curso Año ${student.year}.

Materias:
${rows.join('\n')}

Este correo se envía automáticamente a las ${DAILY_SEND_HOUR}:${String(DAILY_SEND_MINUTE).padStart(2,'0')} con la asistencia registrada hasta ese momento.

Saludos cordiales,
Sistema de Gestión Escolar`;
};

const sendEmailToStudent = async (student) => {
  if (!GMAIL_USER || !GMAIL_PASS) {
    console.warn('No se ha configurado Gmail en el servidor. No se envía correo.');
    return;
  }
  if (!student.email) return;
  if (!student.attendance || !Object.keys(student.attendance).length) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Sistema Escolar" <${EMAIL_FROM}>`,
    to: student.email,
    subject: `✅ Resumen diario de asistencia: ${student.name}`,
    text: buildStudentAttendanceMessage(student),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Correo diario enviado a ${student.email}: ${info.messageId}`);
  } catch (error) {
    console.error(`Error enviando correo diario a ${student.email}:`, error);
  }
};

const sendDailyAttendanceEmails = async () => {
  const data = loadAttendanceData();
  const today = new Date().toISOString().slice(0, 10);
  if (data.lastDailyEmailSentDate === today) {
    console.log('El resumen diario ya se envió hoy.');
    return;
  }

  const students = Object.values(data.students).filter((student) => student.email && student.attendance && Object.keys(student.attendance).length);
  if (!students.length) {
    console.log('No hay estudiantes con asistencia registrada para enviar.');
    return;
  }

  for (const student of students) {
    await sendEmailToStudent(student);
  }

  data.lastDailyEmailSentDate = today;
  saveAttendanceData(data);
  console.log('Resumen diario enviado y fecha registrada:', today);
};

const scheduleDailyAttendanceEmails = () => {
  const delay = getNextNoonDelay();
  const minutes = Math.round(delay / 1000 / 60);
  console.log(`Próximo envío diario programado en ${minutes} minutos (a las ${DAILY_SEND_HOUR}:${String(DAILY_SEND_MINUTE).padStart(2,'0')}).`);
  setTimeout(async () => {
    await sendDailyAttendanceEmails();
    scheduleDailyAttendanceEmails();
  }, delay);
};

// Si no usamos la integración WABA, no mostrar advertencia para evitar ruido.
// La verificación se realiza al intentar usar el endpoint /api/send-whatsapp.
if (!GMAIL_USER || !GMAIL_PASS) {
  console.warn('WARNING: Falta GMAIL_USER o GMAIL_PASS en el archivo .env');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/attendance', (req, res) => {
  const { id, name, email, phone, year, subject, subjectLabel, status } = req.body || {};
  if (!id || !name || !email || !year || !subject || !status) {
    return res.status(400).json({ error: 'Falta id, nombre, correo, año, materia o estado.' });
  }

  const data = loadAttendanceData();
  const student = data.students[id] || { id, name, email, phone: phone || '', year: Number(year), attendance: {} };
  student.name = name;
  student.email = email;
  student.phone = phone || student.phone;
  student.year = Number(year);
  student.attendance = student.attendance || {};
  student.attendance[subject] = { status, label: subjectLabel || subject };
  data.students[id] = student;
  saveAttendanceData(data);

  res.json(student);
});

app.get('/api/students', (req, res) => {
  const data = loadAttendanceData();
  const year = req.query.year;
  const students = Object.values(data.students).filter((student) => !year || String(student.year) === String(year));
  res.json(students);
});

app.post('/api/students', (req, res) => {
  const { id, name, email, phone, year } = req.body || {};
  if (!name || !email || !year) {
    return res.status(400).json({ error: 'Falta nombre, correo o año.' });
  }

  const data = loadAttendanceData();
  const studentId = id || `student-${Date.now()}`;
  const student = data.students[studentId] || { id: studentId, attendance: {} };
  student.id = studentId;
  student.name = name;
  student.email = email;
  student.phone = phone || student.phone || '';
  student.year = Number(year);
  student.status = student.status || '';
  student.attendance = student.attendance || {};
  data.students[studentId] = student;
  saveAttendanceData(data);

  res.json(student);
});

app.patch('/api/students', (req, res) => {
  const { id, name, email, phone, year } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'Falta id del estudiante.' });
  }

  const data = loadAttendanceData();
  const student = data.students[id];
  if (!student) {
    return res.status(404).json({ error: 'Estudiante no encontrado.' });
  }

  if (name) student.name = name;
  if (email) student.email = email;
  if (phone) student.phone = phone;
  if (year) student.year = Number(year);
  data.students[id] = student;
  saveAttendanceData(data);

  res.json(student);
});

app.delete('/api/students', (req, res) => {
  const id = req.query.id || req.body?.id;
  if (!id) {
    return res.status(400).json({ error: 'Falta id del estudiante.' });
  }

  const data = loadAttendanceData();
  if (!data.students[id]) {
    return res.status(404).json({ error: 'Estudiante no encontrado.' });
  }

  delete data.students[id];
  saveAttendanceData(data);
  res.json({ success: true, id });
});

app.get('/api/attendance', (req, res) => {
  const data = loadAttendanceData();
  const year = req.query.year;
  const students = Object.values(data.students).filter((student) => !year || String(student.year) === String(year));
  res.json({ students, lastDailyEmailSentDate: data.lastDailyEmailSentDate });
});

app.post('/api/send-daily-emails', async (req, res) => {
  try {
    await sendDailyAttendanceEmails();
    res.json({ success: true, message: 'Envio diario ejecutado.' });
  } catch (error) {
    console.error('Error forzando envío diario:', error);
    res.status(500).json({ error: 'No se pudo ejecutar el envío diario.' });
  }
});

app.post('/api/send-whatsapp', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Falta el número de destino o el mensaje.' });
  }

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ error: 'No se ha configurado WhatsApp Business API en el servidor.' });
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error enviando WhatsApp:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Error enviando el mensaje por WhatsApp.' });
  }
});

app.post('/api/send-email', async (req, res) => {
  const { to, subject, message, fromName } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: 'Falta destinatario, asunto o mensaje.' });
  }

  if (!GMAIL_USER || !GMAIL_PASS) {
    return res.status(500).json({ error: 'No se ha configurado Gmail en el servidor.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${fromName || 'Sistema Escolar'}" <${EMAIL_FROM}>`,
      to,
      subject,
      text: message,
    });

    return res.json({ success: true, data: info });
  } catch (error) {
    console.error('Error enviando correo:', error);
    return res.status(500).json({ error: error.message || 'Error al enviar el correo.', details: error.toString() });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Error: el puerto ${PORT} ya está en uso. Cierra el proceso que usa el puerto o cambia PORT en .env.`);
    process.exit(1);
  }
  console.error('Error en el servidor:', error);
});

scheduleDailyAttendanceEmails();
