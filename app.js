const STORAGE_KEY = 'asistencia-colegio-data';
const SENDER_WHATSAPP_NUMBER = '04142475155';
const DEFAULT_PHONE = '04125486575';
const DEFAULT_MESSAGE = 'La estudiante Arianny Suarez está asistente';
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_SEND_WHATSAPP = `${API_BASE_URL}/api/send-whatsapp`;
const API_SEND_EMAIL = `${API_BASE_URL}/api/send-email`;
const API_STUDENTS = `${API_BASE_URL}/api/students`;
const API_ATTENDANCE = `${API_BASE_URL}/api/attendance`;

const SUBJECTS_BY_YEAR = {
  1: [
    { id: 'matematicas', label: 'Matemáticas' },
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
  2: [
    { id: 'matematicas', label: 'Matemáticas' },
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
  3: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'frances', label: 'Francés' },
    { id: 'crp', label: 'CRP' },
  ],
  4: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ghc', label: 'GHC' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'frances', label: 'Francés' },
  ],
  5: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ciencias-tierra', label: 'Ciencias de la Tierra' },
    { id: 'ghc', label: 'GHC' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
};

const yearSelect = document.getElementById('yearSelect');
const subjectSelect = document.getElementById('subjectSelect');
const dateInput = document.getElementById('dateInput');
const currentSelectionEl = document.getElementById('currentSelection');
const studentSummaryEl = document.getElementById('studentSummary');
const studentForm = document.getElementById('studentForm');
const studentNameInput = document.getElementById('studentName');
const studentEmailInput = document.getElementById('studentEmail');
const studentPhoneInput = document.getElementById('studentPhone');
const studentListContainer = document.getElementById('studentListContainer');
const lastEmailStatusEl = document.getElementById('lastEmailStatus');
const toastEl = document.getElementById('toast');
const exportWordBtn = document.getElementById('exportWord');
const subjectInfoEl = document.getElementById('subjectInfo');
const addStudentView = document.getElementById('addStudentView');
const addStudentSubjectInfo = document.getElementById('addStudentSubjectInfo');
const landingView = document.getElementById('landingView');
const mainView = document.getElementById('mainView');
const landingAddStudentBtn = document.getElementById('landingAddStudent');
const mainAddStudentBtn = document.getElementById('mainAddStudent');
const closeAddStudentBtn = document.getElementById('closeAddStudent');
const backToLandingBtn = document.getElementById('backToLanding');
const yearTabs = document.getElementById('yearTabs');
const subjectCards = document.getElementById('subjectCards');

let selectedYear = '1';
let selectedSubject = SUBJECTS_BY_YEAR[1][0].id;
let selectedDate = new Date().toISOString().slice(0, 10);
let attendanceData = {};
let editingStudentId = null;
let addStudentReturnView = 'landing';
// Configure hora diaria de envío (local cliente)
const DAILY_SEND_HOUR = 20; // 20 = 8 PM
const DAILY_SEND_MINUTE = 46; // :46
let _sendingInProgress = false;

const getSubjectsByYear = (year) => SUBJECTS_BY_YEAR[Number(year)] || [];

const getSubjectLabel = (year, subjectId) => {
  return getSubjectsByYear(year).find((subject) => subject.id === subjectId)?.label || 'Materia';
};

const showView = (view) => {
  if (landingView) landingView.classList.toggle('hidden', view !== 'landing');
  if (mainView) mainView.classList.toggle('hidden', view !== 'main' && view !== 'addStudent');
  if (addStudentView) addStudentView.classList.toggle('hidden', view !== 'addStudent');
};

const updateAddStudentSubjectInfo = () => {
  const label = getSubjectLabel(selectedYear, selectedSubject);
  if (addStudentSubjectInfo) {
    addStudentSubjectInfo.textContent = `Curso: Año ${selectedYear} · Materia: ${label}`;
  }
};

const openAddStudentView = (returnTo) => {
  addStudentReturnView = returnTo;
  updateAddStudentSubjectInfo();
  showView('addStudent');
  studentForm.reset();
  editingStudentId = null;
  studentForm.querySelector('button[type="submit"]').textContent = 'Agregar alumno';
  studentNameInput.focus();
};

const openEditStudentView = (student) => {
  addStudentReturnView = 'main';
  updateAddStudentSubjectInfo();
  showView('addStudent');
  editingStudentId = student.id;
  studentNameInput.value = student.name;
  studentEmailInput.value = student.email || '';
  studentPhoneInput.value = student.phone;
  studentForm.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
  studentNameInput.focus();
};

const closeAddStudentView = () => {
  showView(addStudentReturnView);
};

const renderYearTabs = () => {
  if (!yearTabs) return;
  yearTabs.innerHTML = '';
  Object.keys(SUBJECTS_BY_YEAR).forEach((year) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `year-tab ${selectedYear === year ? 'active' : ''}`;
    button.textContent = `Año ${year}`;
    button.addEventListener('click', () => selectLandingYear(year));
    yearTabs.appendChild(button);
  });
};

const renderSubjectCards = () => {
  if (!subjectCards) return;
  const subjects = getSubjectsByYear(selectedYear);
  subjectCards.innerHTML = '';
  subjects.forEach((subject) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `subject-card ${selectedSubject === subject.id ? 'active' : ''}`;
    card.innerHTML = `<h3>${subject.label}</h3><span>Año ${selectedYear}</span>`;
    card.addEventListener('click', () => navigateToMain(subject.id));
    subjectCards.appendChild(card);
  });
};

const selectLandingYear = (year) => {
  selectedYear = year;
  const subjects = getSubjectsByYear(year);
  selectedSubject = subjects[0]?.id || selectedSubject;
  updateSubjectOptions(year);
  renderLanding();
};

const navigateToMain = (subjectId) => {
  selectedSubject = subjectId;
  selectedYear = selectedYear || '1';
  updateSubjectOptions(selectedYear);
  showView('main');
  renderStudentList();
  renderSelectionInfo();
};

const renderLanding = () => {
  renderYearTabs();
  renderSubjectCards();
};

const handleLandingAddStudent = () => {
  openAddStudentView('landing');
};

const renderSelectionInfo = () => {
  const subjectLabel = getSubjectLabel(selectedYear, selectedSubject);
  const studentCount = getCurrentStudents().length;
  if (currentSelectionEl) {
    currentSelectionEl.textContent = `Año ${selectedYear} · Materia: ${subjectLabel} · Fecha: ${selectedDate} · Estudiantes: ${studentCount}`;
  }
  if (studentSummaryEl) {
    studentSummaryEl.textContent = `${studentCount} estudiante${studentCount === 1 ? '' : 's'} en esta materia`;
  }
  if (subjectInfoEl) {
    subjectInfoEl.textContent = `Materia seleccionada: ${subjectLabel}`;
  }
};

const updateSubjectOptions = (year) => {
  const subjects = getSubjectsByYear(year);
  subjectSelect.innerHTML = '';
  subjects.forEach((subject) => {
    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = subject.label;
    subjectSelect.appendChild(option);
  });
  if (!subjects.some((subject) => subject.id === selectedSubject)) {
    selectedSubject = subjects[0]?.id || '';
  }
  subjectSelect.value = selectedSubject;
  renderLanding();
};

const getInitialData = () => {
  const data = { years: {}, selectedDate, lastDailyEmailSentDate: '' };
  for (let year = 1; year <= 5; year += 1) {
    data.years[year] = {
      students: [
        {
          id: `arianny-${year}`,
          name: 'Arianny Suarez',
          email: 'arianny@example.com',
          phone: DEFAULT_PHONE,
          status: '',
          attendance: {},
          year,
        },
      ],
    };
  }
  return data;
};

const loadData = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.years) {
        attendanceData = parsed;
        selectedDate = parsed.selectedDate || selectedDate;
        attendanceData.lastDailyEmailSentDate = parsed.lastDailyEmailSentDate || '';
        Object.keys(attendanceData.years).forEach((year) => {
          attendanceData.years[year].students = (attendanceData.years[year].students || []).map((student) => ({
            ...student,
            attendance: student.attendance || {},
            year: student.year || Number(year),
          }));
        });
        return;
      }
    } catch (error) {
      console.warn('Error leyendo storage, se recreará datos:', error);
    }
  }
  attendanceData = getInitialData();
  saveData();
};

const saveData = () => {
  attendanceData.selectedDate = selectedDate;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceData));
};

const showToast = (message) => {
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  toastEl.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toastEl.classList.remove('visible');
    toastEl.classList.add('hidden');
  }, 2800);
};

const showAttendanceModal = (message) => {
  const modal = document.getElementById('attendanceModal');
  const msg = document.getElementById('attendanceModalMessage');
  const closeBtn = document.getElementById('attendanceModalClose');
  if (!modal || !msg) return;
  msg.textContent = message;
  modal.classList.remove('hidden');
  // allow close button
  if (closeBtn) {
    const handler = () => {
      modal.classList.add('hidden');
      closeBtn.removeEventListener('click', handler);
    };
    closeBtn.addEventListener('click', handler);
  }
  // auto hide after 2.5s
  clearTimeout(showAttendanceModal.timeoutId);
  showAttendanceModal.timeoutId = setTimeout(() => {
    modal.classList.add('hidden');
  }, 2500);
};

const buildSelectors = () => {
  yearSelect.innerHTML = '';
  subjectSelect.innerHTML = '';

  for (let year = 1; year <= 5; year += 1) {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = `Año ${year}`;
    yearSelect.appendChild(option);
  }
  updateSubjectOptions(selectedYear);
};

const getCurrentStudents = () => {
  return attendanceData.years[selectedYear]?.students || [];
};

const renderStudentList = () => {
  // Try to fetch persisted students from server; fallback to localStorage.
  let students = getCurrentStudents();
  (async () => {
    try {
      const r = await fetch(`${API_STUDENTS}?year=${encodeURIComponent(selectedYear)}`);
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) {
          attendanceData.years[selectedYear] = attendanceData.years[selectedYear] || {};
          attendanceData.years[selectedYear].students = data.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email || '',
            phone: row.phone || '',
            status: row.status || '',
            attendance: row.attendance || {},
            year: Number(selectedYear),
          }));
          students = attendanceData.years[selectedYear].students;
        }
      }
    } catch (e) {
      // ignore and use local storage fallback
      console.warn('No se pudo cargar estudiantes desde la API, usando localStorage', e);
    }

    if (!students || !students.length) {
      studentListContainer.innerHTML = '<p>No hay estudiantes aún en este curso y materia.</p>';
      renderSelectionInfo();
      return;
    }

    const table = document.createElement('div');
    table.className = 'table-wrapper';
    table.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Representante</th>
            <th>Asistencia</th>
          </tr>
        </thead>
        <tbody>
          ${students
            .map((student) => {
              const currentStatus = getAttendanceStatus(student, selectedSubject);
              const asistClass = currentStatus === 'asistente' ? 'active' : '';
              const inasistClass = currentStatus === 'inasistente' ? 'active' : '';
              return `
                <tr data-id="${student.id}">
                  <td>${student.name}</td>
                  <td>${student.email || '-'}</td>
                  <td>${student.phone}</td>
                  <td>
                    <div class="state-buttons">
                      <button class="state-button ${asistClass}" data-action="asistente" data-id="${student.id}">Asistente</button>
                      <button class="state-button ${inasistClass}" data-action="inasistente" data-id="${student.id}">Inasistente</button>
                      <button class="secondary" data-action="edit" data-id="${student.id}">Editar</button>
                      <button class="secondary" data-action="delete" data-id="${student.id}">Borrar</button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    studentListContainer.innerHTML = '';
    studentListContainer.appendChild(table);
    renderSelectionInfo();
  })();
};

const updateYearSelection = () => {
  selectedYear = yearSelect.value;
  updateSubjectOptions(selectedYear);
  renderStudentList();
};

const updateSubjectSelection = () => {
  selectedSubject = subjectSelect.value;
  renderStudentList();
};

const updateDateSelection = (event) => {
  selectedDate = event.target.value;
  saveData();
  renderSelectionInfo();
};

const normalizeName = (name) => name.trim().replace(/\s+/g, ' ');

const findStudentById = (id) => {
  const students = getCurrentStudents();
  return students.find((student) => student.id === id);
};

const openWhatsAppNotification = (student) => {
  if (student.name.toLowerCase() !== 'arianny suarez') {
    return;
  }
  const phone = student.phone.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(`La estudiante ${student.name} está asistente`);
  const finalNumber = phone.startsWith('58') ? phone : `58${phone}`;
  const url = `https://wa.me/${finalNumber}?text=${text}`;
  window.open(url, '_blank');
  showToast(`Notificación enviada por WhatsApp a ${student.phone}`);
};

const getAttendanceStatus = (student, subjectId) => {
  return (student.attendance && student.attendance[subjectId]) || '';
};

const buildAttendanceEmailMessage = (student, year) => {
  const subjects = getSubjectsByYear(year);
  const rows = subjects.map((subject) => {
    const status = getAttendanceStatus(student, subject.id);
    const label = subject.label;
    if (!status) {
      return `-- ${label}: pendiente`;
    }
    return `-- ${label}: ${status === 'asistente' ? 'Asistió' : 'No asistió'}`;
  });
  const attendedSubjects = subjects.filter((subject) => getAttendanceStatus(student, subject.id) === 'asistente').map((s) => s.label);
  const absentSubjects = subjects.filter((subject) => getAttendanceStatus(student, subject.id) === 'inasistente').map((s) => s.label);
  return `Estimado/a representante,

Aquí está el resumen diario de asistencia del/la estudiante ${student.name} para el curso Año ${year}.

Resumen por materia:
${rows.join('\n')}

Asistió en: ${attendedSubjects.length ? attendedSubjects.join(', ') : 'ninguna'}
No asistió en: ${absentSubjects.length ? absentSubjects.join(', ') : 'ninguna'}

Este correo se envía automáticamente a las 8:46 PM con la asistencia registrada hasta ese momento.

Saludos cordiales,
Sistema de Gestión Escolar`;
};

const sendEmail = async (student, year) => {
  const email = (student.email || '').trim();
  if (!email) {
    console.log('No hay email configurado para este estudiante');
    return;
  }

  const subject = `✅ [Aula Virtual] Resumen diario de asistencia de ${student.name}`;
  const message = buildAttendanceEmailMessage(student, year);

  try {
    console.log(`Intentando enviar correo a: ${email}`);

    const response = await fetch(API_SEND_EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        to: email, 
        subject, 
        message,
        fromName: 'Sistema de Gestión Escolar'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log('Correo enviado:', result);
    showToast(`✅ Correo diario enviado a ${student.email}`);
  } catch (error) {
    console.error('Error detallado enviando correo:', error);
    console.log('URL del servidor:', API_SEND_EMAIL);
    console.log('Servidor debería estar en:', API_BASE_URL);
  }
};

const shouldSendDailySummaryEmails = () => {
  const today = new Date().toISOString().slice(0, 10);
  return attendanceData.lastDailyEmailSentDate !== today;
};

const markDailyEmailsSent = () => {
  attendanceData.lastDailyEmailSentDate = new Date().toISOString().slice(0, 10);
  saveData();
  updateLastEmailStatus();
};

const updateLastEmailStatus = () => {
  if (!lastEmailStatusEl) return;
  if (!attendanceData.lastDailyEmailSentDate) {
    lastEmailStatusEl.textContent = 'Último resumen diario: no enviado aún.';
    return;
  }
  lastEmailStatusEl.textContent = `Último resumen diario enviado: ${attendanceData.lastDailyEmailSentDate}`;
};

const getNextNoonDelay = () => {
  const now = new Date();
  const nextSend = new Date(now);
  nextSend.setHours(DAILY_SEND_HOUR, DAILY_SEND_MINUTE, 0, 0);
  if (now >= nextSend) {
    nextSend.setDate(nextSend.getDate() + 1);
  }
  return nextSend - now;
};

const sendDailySummaryEmails = async () => {
  if (!shouldSendDailySummaryEmails()) return;

  const today = new Date().toISOString().slice(0, 10);
  const years = Object.keys(attendanceData.years || {});
  let sentAny = false;

  for (const year of years) {
    const students = attendanceData.years[year].students || [];
    for (const student of students) {
      const attendanceKeys = Object.keys(student.attendance || {});
      if (!student.email || !attendanceKeys.length) continue;
      await sendEmail(student, year);
      sentAny = true;
    }
  }

  if (sentAny) {
    markDailyEmailsSent();
  }
};

const startDailySendChecker = () => {
  // Comprobar cada 30 segundos si llegó la hora objetivo y no se ha enviado hoy.
  setInterval(async () => {
    try {
      if (_sendingInProgress) return;
      const now = new Date();
      if (now.getHours() === DAILY_SEND_HOUR && now.getMinutes() >= DAILY_SEND_MINUTE) {
        if (!shouldSendDailySummaryEmails()) return;
        _sendingInProgress = true;
        await sendDailySummaryEmails();
        _sendingInProgress = false;
      }
    } catch (e) {
      console.error('daily-send-checker error', e);
      _sendingInProgress = false;
    }
  }, 30 * 1000);
};

const scheduleDailyEmailSummary = () => {
  const delay = getNextNoonDelay();
  setTimeout(async () => {
    await sendDailySummaryEmails();
    scheduleDailyEmailSummary();
  }, delay);
};

const setStudentStatus = (id, status) => {
  const students = getCurrentStudents();
  const student = students.find((item) => item.id === id);
  if (!student) return;
  student.attendance = student.attendance || {};
  student.attendance[selectedSubject] = status;
  student.status = status;
  saveData();
  renderStudentList();
  // mostrar modal de confirmación
  if (status === 'asistente') {
    showAttendanceModal('Se marcó asistente');
  } else if (status === 'inasistente') {
    showAttendanceModal('Se marcó inasistente');
  }
  (async () => {
    try {
      await fetch(API_ATTENDANCE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          year: Number(selectedYear),
          subject: selectedSubject,
          subjectLabel: getSubjectLabel(selectedYear, selectedSubject),
          status,
        }),
      });
    } catch (e) {
      console.warn('No se pudo guardar la asistencia en el servidor', e);
    }
  })();
};

const deleteStudent = (id) => {
  (async () => {
    try {
      await fetch(`${API_STUDENTS}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('No se pudo eliminar en servidor, se eliminará localmente', e);
    }
    attendanceData.years[selectedYear].students = getCurrentStudents().filter((student) => student.id !== id);
    saveData();
    renderStudentList();
    showToast('Estudiante eliminado correctamente');
  })();
};

const startEditStudent = (id) => {
  const student = findStudentById(id);
  if (!student) return;

  openEditStudentView(student);
};

const saveEditedStudent = () => {
  const student = findStudentById(editingStudentId);
  if (!student) return;

  const name = normalizeName(studentNameInput.value);
  const email = studentEmailInput.value.trim();
  const phone = studentPhoneInput.value.trim();
  if (!name || !email) {
    showToast('Completa nombre y correo para guardar');
    return;
  }
  student.name = name;
  student.email = email;
  student.phone = phone;
  editingStudentId = null;
  studentForm.querySelector('button[type="submit"]').textContent = 'Agregar alumno';
  saveData();
  renderStudentList();
  studentForm.reset();
  showToast('Datos actualizados correctamente');
  // try to update on server
  (async () => {
    try {
      await fetch(API_STUDENTS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, name: student.name, email: student.email, phone: student.phone }),
      });
    } catch (e) {
      console.warn('No se pudo actualizar estudiante en servidor', e);
    }
  })();
};

const handleStudentFormSubmit = (event) => {
  event.preventDefault();
  const name = normalizeName(studentNameInput.value);
  const email = studentEmailInput.value.trim();
  const phone = studentPhoneInput.value.trim();

  if (!name || !email) {
    showToast('Debes ingresar nombre y correo');
    return;
  }

  if (editingStudentId) {
    saveEditedStudent();
    return;
  }
  (async () => {
    try {
      const r = await fetch(API_STUDENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, year: Number(selectedYear) }),
      });
      if (r.ok) {
        const created = await r.json();
        attendanceData.years[selectedYear] = attendanceData.years[selectedYear] || {};
        attendanceData.years[selectedYear].students = attendanceData.years[selectedYear].students || [];
        attendanceData.years[selectedYear].students.push({ id: created.id, name: created.name, email: created.email || '', phone: created.phone || '', status: created.status || '', attendance: {}, year: Number(selectedYear) });
        saveData();
        studentForm.reset();
        renderStudentList();
        showToast('Estudiante agregado correctamente');
        if (addStudentView && !addStudentView.classList.contains('hidden')) {
          showView('main');
        }
        return;
      }
    } catch (e) {
      console.warn('No se pudo crear estudiante en servidor, se creará localmente', e);
    }

    // fallback local
    const newStudent = {
      id: `student-${Date.now()}`,
      name,
      email,
      phone,
      status: '',
      attendance: {},
      year: Number(selectedYear),
    };
    attendanceData.years[selectedYear] = attendanceData.years[selectedYear] || { students: [] };
    attendanceData.years[selectedYear].students.push(newStudent);
    saveData();
    studentForm.reset();
    renderStudentList();
    showToast('Estudiante agregado correctamente (local)');
    if (addStudentView && !addStudentView.classList.contains('hidden')) {
      showView('main');
    }
  })();
};

const exportCurrentToCSV = () => {
  const students = getCurrentStudents();
  const subjectLabel = getSubjectLabel(selectedYear, selectedSubject);
  const headers = ['Año', 'Materia', 'Nombre', 'Representante', 'Asistencia'];
  const rows = [headers.join(',')];
  students.forEach((s) => {
    const line = [selectedYear, `"${subjectLabel}"`, `"${s.name}"`, `"${s.phone}"`, s.status || 'pendiente'];
    rows.push(line.join(','));
  });
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asistencia_ano${selectedYear}_${subjectLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportCurrentToWord = () => {
  const students = getCurrentStudents();
  const subjectLabel = getSubjectLabel(selectedYear, selectedSubject);
  let html = `<html><head><meta charset="utf-8"><title>Asistencia</title></head><body>`;
  html += `<h2>Asistencia - Año ${selectedYear} - ${subjectLabel}</h2>`;
  html += `<p>Fecha: ${selectedDate}</p>`;
  html += `<table border="1" cellspacing="0" cellpadding="6"><tr><th>Nombre</th><th>Representante</th><th>Asistencia</th></tr>`;
  students.forEach((s) => {
    html += `<tr><td>${s.name}</td><td>${s.phone}</td><td>${s.status || ''}</td></tr>`;
  });
  html += `</table></body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asistencia_ano${selectedYear}_${subjectLabel}_${selectedDate}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleStudentListClick = (event) => {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  const studentId = actionButton.dataset.id;

  if (action === 'toggle') {
    // legacy - ignore
    return;
  }
  if (action === 'delete') {
    deleteStudent(studentId);
  }
  if (action === 'edit') {
    startEditStudent(studentId);
  }
  if (action === 'asistente') {
    setStudentStatus(studentId, 'asistente');
  }
  if (action === 'inasistente') {
    setStudentStatus(studentId, 'inasistente');
  }
};

const resetData = () => {
  if (!confirm('¿Seguro que deseas borrar todos los datos y volver a los valores iniciales?')) {
    return;
  }
  attendanceData = getInitialData();
  saveData();
  renderStudentList();
  showToast('Datos restaurados');
};

const init = () => {
  buildSelectors();
  loadData();
  yearSelect.value = selectedYear;
  updateSubjectOptions(selectedYear);
  dateInput.value = selectedDate;
  renderLanding();
  showView('landing');
  renderSelectionInfo();
  updateLastEmailStatus();
  // programar envíos locales y arrancar comprobador robusto
  scheduleDailyEmailSummary();
  startDailySendChecker();

  if (window.location.protocol === 'file:') {
    showToast('Abre la página desde http://localhost:3000 para usar el correo automático.');
  }

  yearSelect.addEventListener('change', updateYearSelection);
  subjectSelect.addEventListener('change', updateSubjectSelection);
  dateInput.addEventListener('change', updateDateSelection);
  studentForm.addEventListener('submit', handleStudentFormSubmit);
  studentListContainer.addEventListener('click', handleStudentListClick);
  if (exportWordBtn) exportWordBtn.addEventListener('click', exportCurrentToWord);
  if (landingAddStudentBtn) landingAddStudentBtn.addEventListener('click', handleLandingAddStudent);
  if (mainAddStudentBtn) mainAddStudentBtn.addEventListener('click', () => openAddStudentView('main'));
  if (closeAddStudentBtn) closeAddStudentBtn.addEventListener('click', closeAddStudentView);
  if (backToLandingBtn) backToLandingBtn.addEventListener('click', () => showView('landing'));
};

init();
