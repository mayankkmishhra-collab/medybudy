// ─── Mock Video Call Scheduler ────────────────────────────────────────────────

const MOCK_DOCTORS = [
  { id: 1, name: 'Dr. Sarah Chen', specialty: 'Cardiologist', avatar: 'SC', rating: 4.9, reviews: 312, available: true, nextSlot: 'Today 3:00 PM', color: '#ff3366' },
  { id: 2, name: 'Dr. James Okafor', specialty: 'Neurologist', avatar: 'JO', rating: 4.8, reviews: 245, available: true, nextSlot: 'Today 4:30 PM', color: '#7c3aed' },
  { id: 3, name: 'Dr. Priya Sharma', specialty: 'General Practitioner', avatar: 'PS', rating: 4.9, reviews: 520, available: true, nextSlot: 'Today 2:00 PM', color: '#00d4ff' },
  { id: 4, name: 'Dr. Michael Torres', specialty: 'Pulmonologist', avatar: 'MT', rating: 4.7, reviews: 189, available: false, nextSlot: 'Tomorrow 10:00 AM', color: '#00ff88' },
  { id: 5, name: 'Dr. Aisha Rahman', specialty: 'Dermatologist', avatar: 'AR', rating: 4.8, reviews: 278, available: true, nextSlot: 'Today 5:00 PM', color: '#ffc107' },
  { id: 6, name: 'Dr. Liu Wei', specialty: 'Orthopedist', avatar: 'LW', rating: 4.6, reviews: 156, available: false, nextSlot: 'Tomorrow 9:00 AM', color: '#ff6b35' },
];

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
];

const DAYS = ['Today', 'Tomorrow', 'Wed Mar 30', 'Thu Mar 31', 'Fri Apr 1', 'Sat Apr 2'];

let selectedDoctor = null;
let selectedDay = 0;
let selectedTime = null;
let scheduledAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');

function openScheduleModal(specialtyKey, specialtyName) {
  const modal = document.getElementById('scheduleModal');
  if (!modal) return;

  const matchingDoctors = MOCK_DOCTORS.filter(d =>
    d.specialty.toLowerCase().includes(specialtyKey) ||
    specialtyKey === 'general' ||
    d.specialty.toLowerCase().includes(specialtyName?.toLowerCase()?.split(' ')[0] || '')
  );

  const doctors = matchingDoctors.length > 0 ? matchingDoctors : MOCK_DOCTORS.slice(0, 3);

  document.getElementById('scheduleModalTitle').textContent = `Schedule with ${specialtyName || 'Specialist'}`;
  renderDoctorList(doctors);
  renderTimeSlots();
  openModal('scheduleModal');
}

function renderDoctorList(doctors) {
  const container = document.getElementById('doctorList');
  if (!container) return;
  container.innerHTML = doctors.map(doc => `
    <div class="card doctor-card" data-id="${doc.id}" onclick="selectDoctor(${doc.id})"
      style="cursor:pointer;padding:12px;margin-bottom:8px;border-color:${doc.color}22;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:42px;height:42px;border-radius:50%;background:${doc.color}28;color:${doc.color};border:1px solid ${doc.color}44;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">
          ${doc.avatar}
        </div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:13px;">${doc.name}</div>
          <div style="font-size:11px;color:var(--text-muted);">${doc.specialty}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
            <span style="font-size:11px;color:#f59e0b;">⭐ ${doc.rating}</span>
            <span style="font-size:10px;color:var(--text-muted);">(${doc.reviews})</span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <span class="status-dot ${doc.available ? 'online' : 'busy'}" style="display:block;margin:0 auto 4px;"></span>
          <div style="font-size:10px;color:var(--text-muted);">${doc.nextSlot}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function selectDoctor(id) {
  selectedDoctor = MOCK_DOCTORS.find(d => d.id === id);
  document.querySelectorAll('.doctor-card').forEach(c => {
    c.style.borderColor = 'var(--border)';
    c.style.background = 'var(--bg-card)';
  });
  const card = document.querySelector(`.doctor-card[data-id="${id}"]`);
  if (card && selectedDoctor) {
    card.style.borderColor = selectedDoctor.color;
    card.style.background = selectedDoctor.color + '11';
  }
}

function renderTimeSlots() {
  const dayContainer = document.getElementById('daySlots');
  const timeContainer = document.getElementById('timeSlots');
  if (!dayContainer || !timeContainer) return;

  dayContainer.innerHTML = DAYS.map((day, idx) => `
    <button class="chip ${idx === selectedDay ? 'selected' : ''}" onclick="selectDay(${idx})">${day}</button>
  `).join('');

  timeContainer.innerHTML = TIME_SLOTS.map(time => {
    const isBooked = Math.random() < 0.3;
    const isSelected = time === selectedTime;
    return `
      <button onclick="${isBooked ? '' : `selectTime('${time}')`}"
        style="padding:7px 10px;border-radius:var(--radius-xs);border:1px solid ${isSelected ? 'var(--accent-indigo)' : 'var(--border)'};
        background:${isSelected ? 'rgba(99,102,241,0.15)' : isBooked ? 'var(--bg-secondary)' : 'var(--bg-card)'};
        color:${isBooked ? 'var(--text-muted)' : isSelected ? 'var(--accent-indigo)' : 'var(--text-primary)'};
        font-size:12px;cursor:${isBooked ? 'not-allowed' : 'pointer'};transition:all 0.2s;
        text-decoration:${isBooked ? 'line-through' : 'none'};font-family:var(--font-sans);">
        ${time}
      </button>
    `;
  }).join('');
}

function selectDay(idx) {
  selectedDay = idx;
  selectedTime = null;
  renderTimeSlots();
}

function selectTime(time) {
  selectedTime = time;
  renderTimeSlots();
}

function confirmAppointment() {
  if (!selectedDoctor || !selectedTime) {
    Toast.show('Please select a doctor and time slot', 'warning');
    return;
  }

  const appointment = {
    id: Date.now(),
    doctor: selectedDoctor,
    day: DAYS[selectedDay],
    time: selectedTime,
    status: 'confirmed',
    type: 'video',
    createdAt: new Date().toISOString()
  };

  scheduledAppointments.push(appointment);
  localStorage.setItem('appointments', JSON.stringify(scheduledAppointments));

  closeModal('scheduleModal');
  Toast.show(`Appointment confirmed with ${selectedDoctor.name} on ${DAYS[selectedDay]} at ${selectedTime}`, 'success');

  // Refresh appointments list if on dashboard
  if (typeof renderAppointments === 'function') renderAppointments();

  // Show confirmation modal
  showAppointmentConfirmation(appointment);
}

function showAppointmentConfirmation(appt) {
  const modal = document.getElementById('confirmModal');
  if (!modal) return;

  document.getElementById('confirmDetails').innerHTML = `
    <div style="text-align:center; padding:20px 0;">
      <div style="font-size:48px; margin-bottom:16px;">✅</div>
      <div style="font-size:20px; font-weight:700; margin-bottom:8px;">Appointment Confirmed!</div>
      <div style="color:var(--text-secondary); margin-bottom:20px;">Your video consultation has been scheduled</div>
      <div class="card" style="text-align:left;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div class="avatar-placeholder" style="width:48px; height:48px; background:${appt.doctor.color}33; color:${appt.doctor.color}; border-color:${appt.doctor.color}44;">
            ${appt.doctor.avatar}
          </div>
          <div>
            <div style="font-weight:700;">${appt.doctor.name}</div>
            <div style="font-size:13px; color:var(--text-muted);">${appt.doctor.specialty}</div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div style="background:var(--bg-secondary); padding:10px; border-radius:8px;">
            <div style="font-size:11px; color:var(--text-muted);">DATE</div>
            <div style="font-weight:600;">${appt.day}</div>
          </div>
          <div style="background:var(--bg-secondary); padding:10px; border-radius:8px;">
            <div style="font-size:11px; color:var(--text-muted);">TIME</div>
            <div style="font-weight:600;">${appt.time}</div>
          </div>
        </div>
        <div style="margin-top:12px;padding:10px;background:rgba(99,102,241,0.08);border-radius:var(--radius-sm);border:1px solid rgba(99,102,241,0.2);">
          <div style="font-size:12px;color:var(--accent-indigo);">📹 Video Call Link will be sent to your email 15 minutes before the appointment</div>
        </div>
      </div>
    </div>
  `;
  openModal('confirmModal');
}

function startMockVideoCall(doctorId) {
  const doctor = MOCK_DOCTORS.find(d => d.id === doctorId) || MOCK_DOCTORS[0];
  window.location.href = `pages/video-call.html?doctor=${encodeURIComponent(JSON.stringify(doctor))}`;
}
