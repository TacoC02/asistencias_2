const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WABA_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER;

// Si no usamos la integración WABA, no mostrar advertencia para evitar ruido.
// La verificación se realiza al intentar usar el endpoint /api/send-whatsapp.
if (!GMAIL_USER || !GMAIL_PASS) {
  console.warn('WARNING: Falta GMAIL_USER o GMAIL_PASS en el archivo .env');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
