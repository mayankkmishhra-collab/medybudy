// ─── Specialist Recommendation Engine ────────────────────────────────────────

const SPECIALISTS = {
  cardiologist: {
    name: 'Cardiologist',
    icon: '❤️',
    description: 'Heart & cardiovascular system specialist',
    color: '#ff3366',
    waitTime: '2-5 days',
    available: true
  },
  neurologist: {
    name: 'Neurologist',
    icon: '🧠',
    description: 'Brain, spine & nervous system specialist',
    color: '#7c3aed',
    waitTime: '3-7 days',
    available: true
  },
  pulmonologist: {
    name: 'Pulmonologist',
    icon: '🫁',
    description: 'Lungs & respiratory system specialist',
    color: '#00d4ff',
    waitTime: '2-4 days',
    available: true
  },
  gastroenterologist: {
    name: 'Gastroenterologist',
    icon: '🫃',
    description: 'Digestive system & GI tract specialist',
    color: '#ff6b35',
    waitTime: '4-7 days',
    available: false
  },
  orthopedist: {
    name: 'Orthopedist',
    icon: '🦴',
    description: 'Bones, joints & musculoskeletal specialist',
    color: '#ffc107',
    waitTime: '3-5 days',
    available: true
  },
  dermatologist: {
    name: 'Dermatologist',
    icon: '🩺',
    description: 'Skin, hair & nail specialist',
    color: '#00ff88',
    waitTime: '5-10 days',
    available: true
  },
  psychiatrist: {
    name: 'Psychiatrist',
    icon: '🧘',
    description: 'Mental health & behavioral specialist',
    color: '#a78bfa',
    waitTime: '7-14 days',
    available: true
  },
  endocrinologist: {
    name: 'Endocrinologist',
    icon: '⚗️',
    description: 'Hormones & metabolic disorders specialist',
    color: '#34d399',
    waitTime: '5-10 days',
    available: false
  },
  ophthalmologist: {
    name: 'Ophthalmologist',
    icon: '👁️',
    description: 'Eyes & vision specialist',
    color: '#60a5fa',
    waitTime: '3-6 days',
    available: true
  },
  ent: {
    name: 'ENT Specialist',
    icon: '👂',
    description: 'Ear, nose & throat specialist',
    color: '#f472b6',
    waitTime: '2-5 days',
    available: true
  },
  urologist: {
    name: 'Urologist',
    icon: '🫘',
    description: 'Urinary tract & kidney specialist',
    color: '#fb923c',
    waitTime: '4-8 days',
    available: true
  },
  general: {
    name: 'General Practitioner',
    icon: '👨‍⚕️',
    description: 'Primary care & general health',
    color: '#00d4ff',
    waitTime: 'Same day',
    available: true
  }
};

const SYMPTOM_SPECIALIST_MAP = {
  // Cardiology
  'chest pain': ['cardiologist', 'general'],
  'heart': ['cardiologist'],
  'palpitations': ['cardiologist'],
  'rapid heartbeat': ['cardiologist'],
  'irregular heartbeat': ['cardiologist'],
  'high blood pressure': ['cardiologist', 'general'],
  'hypertension': ['cardiologist'],
  // Neurology
  'headache': ['neurologist', 'general'],
  'migraine': ['neurologist'],
  'seizure': ['neurologist'],
  'numbness': ['neurologist'],
  'tingling': ['neurologist'],
  'memory loss': ['neurologist'],
  'confusion': ['neurologist'],
  'dizziness': ['neurologist', 'ent'],
  'stroke': ['neurologist'],
  // Pulmonology
  'cough': ['pulmonologist', 'general'],
  'breathing': ['pulmonologist'],
  'shortness of breath': ['pulmonologist', 'cardiologist'],
  'asthma': ['pulmonologist'],
  'wheezing': ['pulmonologist'],
  // Gastroenterology
  'abdominal pain': ['gastroenterologist', 'general'],
  'nausea': ['gastroenterologist', 'general'],
  'vomiting': ['gastroenterologist', 'general'],
  'diarrhea': ['gastroenterologist', 'general'],
  'constipation': ['gastroenterologist'],
  'bloating': ['gastroenterologist'],
  'acid reflux': ['gastroenterologist'],
  // Orthopedics
  'back pain': ['orthopedist', 'general'],
  'joint pain': ['orthopedist'],
  'knee pain': ['orthopedist'],
  'fracture': ['orthopedist'],
  'muscle pain': ['orthopedist', 'general'],
  // Dermatology
  'rash': ['dermatologist', 'general'],
  'skin': ['dermatologist'],
  'acne': ['dermatologist'],
  'eczema': ['dermatologist'],
  'itching': ['dermatologist', 'general'],
  // Psychiatry
  'anxiety': ['psychiatrist', 'general'],
  'depression': ['psychiatrist', 'general'],
  'insomnia': ['psychiatrist', 'general'],
  'stress': ['psychiatrist', 'general'],
  'panic': ['psychiatrist'],
  // ENT
  'ear pain': ['ent'],
  'hearing loss': ['ent'],
  'sore throat': ['ent', 'general'],
  'runny nose': ['ent', 'general'],
  'sinus': ['ent'],
  'tonsil': ['ent'],
  // Ophthalmology
  'eye pain': ['ophthalmologist'],
  'vision': ['ophthalmologist'],
  'blurry': ['ophthalmologist'],
  // Endocrinology
  'diabetes': ['endocrinologist'],
  'thyroid': ['endocrinologist'],
  'weight gain': ['endocrinologist', 'general'],
  'fatigue': ['general', 'endocrinologist'],
  // Urology
  'urination': ['urologist'],
  'kidney': ['urologist'],
  'bladder': ['urologist'],
};

function recommendSpecialists(symptoms, urgencyLevel = 'MEDIUM') {
  const symptomsLower = symptoms.toLowerCase();
  const specialistScores = {};

  for (const [keyword, specialists] of Object.entries(SYMPTOM_SPECIALIST_MAP)) {
    if (symptomsLower.includes(keyword)) {
      specialists.forEach((s, idx) => {
        specialistScores[s] = (specialistScores[s] || 0) + (idx === 0 ? 3 : 1);
      });
    }
  }

  // Always include general if nothing matched
  if (Object.keys(specialistScores).length === 0) {
    specialistScores['general'] = 5;
  }

  // Sort by score
  const sorted = Object.entries(specialistScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, score]) => ({
      key,
      ...SPECIALISTS[key],
      relevanceScore: Math.min(99, 60 + score * 8),
      priority: score
    }));

  return sorted;
}

function renderSpecialistCards(specialists, container) {
  if (!container) return;
  container.innerHTML = specialists.map((s, idx) => `
    <div class="card" style="border-color: ${s.color}33; animation-delay: ${idx * 0.1}s;" onclick="openScheduleModal('${s.key}', '${s.name}')">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:48px; height:48px; border-radius:12px; background:${s.color}22; border:1px solid ${s.color}44; display:flex; align-items:center; justify-content:center; font-size:22px;">
            ${s.icon}
          </div>
          <div>
            <div style="font-weight:700; font-size:15px;">${s.name}</div>
            <div style="font-size:12px; color:var(--text-muted);">${s.description}</div>
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:18px; font-weight:700; color:${s.color};">${s.relevanceScore}%</div>
          <div style="font-size:10px; color:var(--text-muted);">match</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="status-dot ${s.available ? 'online' : 'busy'}"></span>
          <span style="font-size:12px; color:var(--text-secondary);">${s.available ? 'Available' : 'Limited slots'}</span>
          <span style="font-size:12px; color:var(--text-muted);">• Wait: ${s.waitTime}</span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openScheduleModal('${s.key}', '${s.name}')">
          📅 Schedule
        </button>
      </div>
    </div>
  `).join('');
}

// ─── Render to Analysis Panel ─────────────────────────────────────────────────
function renderSpecialistResult(specialists) {
  const container = document.getElementById('specialistResult');
  if (!container || !specialists.length) return;
  container.innerHTML = specialists.map((s, idx) => `
    <div class="specialist-card" style="border-color:${s.color}33;margin-bottom:10px;" onclick="openScheduleModal('${s.key}','${s.name}')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:42px;height:42px;border-radius:var(--radius-sm);background:${s.color}18;border:1px solid ${s.color}33;display:flex;align-items:center;justify-content:center;font-size:20px;">${s.icon}</div>
          <div>
            <div style="font-weight:700;font-size:13px;">${s.name}</div>
            <div style="font-size:11px;color:var(--text-muted);">${s.description}</div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:16px;font-weight:800;color:${s.color};">${s.relevanceScore}%</div>
          <div style="font-size:10px;color:var(--text-muted);">match</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:5px;">
          <span class="status-dot ${s.available ? 'online' : 'busy'}"></span>
          <span style="font-size:11px;color:var(--text-secondary);">${s.available ? 'Available' : 'Limited'}</span>
          <span style="font-size:11px;color:var(--text-muted);">· ${s.waitTime}</span>
        </div>
        <button class="btn btn-primary btn-xs" onclick="event.stopPropagation();openScheduleModal('${s.key}','${s.name}')">📅 Book</button>
      </div>
    </div>
  `).join('') + `
    <div class="safety-note" style="margin-top:8px;">
      <span class="safety-note-icon">⚠️</span>
      <div class="safety-note-text"><strong>AI Suggestion Only.</strong> Specialist match is based on symptom patterns. Consult your GP first.</div>
    </div>
  `;
}
