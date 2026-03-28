// ─── Urgency Prediction Engine ───────────────────────────────────────────────

const URGENCY_LEVELS = {
  CRITICAL: { label: 'Critical', color: '#ff3366', score: 4, badge: 'badge-critical', icon: '🚨', action: 'Go to ER immediately' },
  HIGH:     { label: 'High',     color: '#ff6b35', score: 3, badge: 'badge-high',     icon: '⚠️', action: 'See doctor within 24 hours' },
  MEDIUM:   { label: 'Medium',   color: '#ffc107', score: 2, badge: 'badge-medium',   icon: '🔶', action: 'Schedule appointment this week' },
  LOW:      { label: 'Low',      color: '#00ff88', score: 1, badge: 'badge-low',      icon: '✅', action: 'Monitor at home, consult if worsens' }
};

const SYMPTOM_WEIGHTS = {
  // Critical symptoms
  'chest pain': { urgency: 'CRITICAL', weight: 10 },
  'difficulty breathing': { urgency: 'CRITICAL', weight: 10 },
  'shortness of breath': { urgency: 'CRITICAL', weight: 9 },
  'stroke': { urgency: 'CRITICAL', weight: 10 },
  'unconscious': { urgency: 'CRITICAL', weight: 10 },
  'severe bleeding': { urgency: 'CRITICAL', weight: 10 },
  'heart attack': { urgency: 'CRITICAL', weight: 10 },
  'seizure': { urgency: 'CRITICAL', weight: 9 },
  'anaphylaxis': { urgency: 'CRITICAL', weight: 10 },
  'allergic reaction': { urgency: 'CRITICAL', weight: 8 },
  'severe abdominal pain': { urgency: 'CRITICAL', weight: 8 },
  'high fever': { urgency: 'HIGH', weight: 7 },
  'fever': { urgency: 'HIGH', weight: 6 },
  // High urgency
  'vomiting blood': { urgency: 'CRITICAL', weight: 9 },
  'severe headache': { urgency: 'HIGH', weight: 7 },
  'sudden vision loss': { urgency: 'CRITICAL', weight: 9 },
  'numbness': { urgency: 'HIGH', weight: 6 },
  'confusion': { urgency: 'HIGH', weight: 7 },
  'dizziness': { urgency: 'MEDIUM', weight: 4 },
  'fainting': { urgency: 'HIGH', weight: 7 },
  'rapid heartbeat': { urgency: 'HIGH', weight: 6 },
  'palpitations': { urgency: 'HIGH', weight: 6 },
  // Medium urgency
  'persistent cough': { urgency: 'MEDIUM', weight: 4 },
  'cough': { urgency: 'MEDIUM', weight: 3 },
  'abdominal pain': { urgency: 'MEDIUM', weight: 4 },
  'back pain': { urgency: 'MEDIUM', weight: 3 },
  'joint pain': { urgency: 'MEDIUM', weight: 3 },
  'rash': { urgency: 'MEDIUM', weight: 4 },
  'swelling': { urgency: 'MEDIUM', weight: 4 },
  'nausea': { urgency: 'MEDIUM', weight: 3 },
  'headache': { urgency: 'MEDIUM', weight: 3 },
  'fatigue': { urgency: 'LOW', weight: 2 },
  // Low urgency
  'runny nose': { urgency: 'LOW', weight: 1 },
  'sore throat': { urgency: 'LOW', weight: 2 },
  'mild fever': { urgency: 'LOW', weight: 2 },
  'sneezing': { urgency: 'LOW', weight: 1 },
  'mild headache': { urgency: 'LOW', weight: 1 },
  'insomnia': { urgency: 'LOW', weight: 2 },
  'anxiety': { urgency: 'MEDIUM', weight: 3 },
  'depression': { urgency: 'MEDIUM', weight: 3 },
};

const AGE_MODIFIERS = {
  infant: 1.5,    // 0-2
  child: 1.2,     // 3-12
  teen: 1.0,      // 13-17
  adult: 1.0,     // 18-60
  senior: 1.3,    // 61+
};

function getAgeGroup(age) {
  if (age <= 2) return 'infant';
  if (age <= 12) return 'child';
  if (age <= 17) return 'teen';
  if (age <= 60) return 'adult';
  return 'senior';
}

function predictUrgency(symptoms, age = 30, medicalHistory = [], duration = 'hours') {
  if (!symptoms || symptoms.length === 0) return null;

  const symptomsLower = symptoms.toLowerCase();
  let maxUrgencyScore = 0;
  let maxUrgencyLevel = 'LOW';
  let totalWeight = 0;
  let matchedSymptoms = [];

  // Check each symptom keyword
  for (const [keyword, data] of Object.entries(SYMPTOM_WEIGHTS)) {
    if (symptomsLower.includes(keyword)) {
      const score = URGENCY_LEVELS[data.urgency].score;
      if (score > maxUrgencyScore) {
        maxUrgencyScore = score;
        maxUrgencyLevel = data.urgency;
      }
      totalWeight += data.weight;
      matchedSymptoms.push({ symptom: keyword, urgency: data.urgency });
    }
  }

  // Apply age modifier
  const ageGroup = getAgeGroup(age);
  const modifier = AGE_MODIFIERS[ageGroup];

  // Duration modifier
  const durationModifier = {
    'minutes': 1.3,
    'hours': 1.1,
    'days': 1.0,
    'weeks': 0.9,
    'months': 0.8
  }[duration] || 1.0;

  // Medical history risk factors
  const riskConditions = ['diabetes', 'heart disease', 'hypertension', 'asthma', 'cancer', 'immunocompromised'];
  const hasRiskFactor = medicalHistory.some(h =>
    riskConditions.some(r => h.toLowerCase().includes(r))
  );
  const historyModifier = hasRiskFactor ? 1.2 : 1.0;

  // Recalculate with modifiers
  const adjustedScore = maxUrgencyScore * modifier * durationModifier * historyModifier;

  // Map back to urgency level
  let finalLevel;
  if (adjustedScore >= 4.5 || maxUrgencyLevel === 'CRITICAL') finalLevel = 'CRITICAL';
  else if (adjustedScore >= 3.0 || maxUrgencyLevel === 'HIGH') finalLevel = 'HIGH';
  else if (adjustedScore >= 2.0 || maxUrgencyLevel === 'MEDIUM') finalLevel = 'MEDIUM';
  else finalLevel = 'LOW';

  const confidence = Math.min(95, 60 + (matchedSymptoms.length * 8) + (totalWeight * 2));

  return {
    level: finalLevel,
    data: URGENCY_LEVELS[finalLevel],
    confidence: Math.round(confidence),
    matchedSymptoms,
    ageGroup,
    recommendation: URGENCY_LEVELS[finalLevel].action,
    score: Math.round(adjustedScore * 10) / 10
  };
}

function renderUrgencyCard(result, container) {
  if (!result || !container) return;
  const { level, data, confidence, recommendation, matchedSymptoms } = result;
  const percentage = { CRITICAL: 95, HIGH: 75, MEDIUM: 50, LOW: 25 }[level];

  container.innerHTML = `
    <div class="card urgency-${level.toLowerCase()}" style="border-color: ${data.color}33;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:28px;">${data.icon}</span>
          <div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Urgency Level</div>
            <div style="font-size:22px; font-weight:800; color:${data.color};">${data.label}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; color:var(--text-muted);">AI Confidence</div>
          <div style="font-size:20px; font-weight:700; color:var(--accent-cyan);">${confidence}%</div>
        </div>
      </div>
      <div class="urgency-bar">
        <div class="urgency-fill" style="width:${percentage}%; background: linear-gradient(90deg, ${data.color}, ${data.color}88);"></div>
      </div>
      <div style="margin-top:14px; padding:12px; background:${data.color}11; border-radius:8px; border-left:3px solid ${data.color};">
        <div style="font-size:12px; font-weight:600; color:${data.color}; margin-bottom:4px;">RECOMMENDED ACTION</div>
        <div style="font-size:14px; color:var(--text-primary);">${recommendation}</div>
      </div>
      ${matchedSymptoms.length > 0 ? `
        <div style="margin-top:12px;">
          <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Detected Symptoms</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${matchedSymptoms.slice(0, 5).map(s => `
              <span class="badge badge-${s.urgency.toLowerCase()}">${s.symptom}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ─── Render to Analysis Panel ─────────────────────────────────────────────────
function renderUrgencyResult(result) {
  const container = document.getElementById('urgencyResult');
  if (!container || !result) return;
  const { level, confidence, recommendation, matchedSymptoms } = result;
  const data = result.data || URGENCY_LEVELS[level];
  const percentage = { CRITICAL:95, HIGH:75, MEDIUM:50, LOW:25 }[level] || 50;

  container.innerHTML = `
    <div class="card" style="border-color:${data.color}33;margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:26px;">${data.icon}</span>
          <div>
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Urgency Level</div>
            <div style="font-size:20px;font-weight:800;color:${data.color};">${data.label}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:var(--text-muted);">AI Confidence</div>
          <div style="font-size:18px;font-weight:700;color:var(--accent-indigo);">${confidence}%</div>
        </div>
      </div>
      <div class="urgency-bar">
        <div class="urgency-fill" style="width:${percentage}%;background:linear-gradient(90deg,${data.color},${data.color}88);"></div>
      </div>
      <div style="margin-top:12px;padding:10px 12px;background:${data.color}11;border-radius:var(--radius-sm);border-left:3px solid ${data.color};">
        <div style="font-size:11px;font-weight:600;color:${data.color};margin-bottom:3px;">RECOMMENDED ACTION</div>
        <div style="font-size:13px;color:var(--text-primary);">${recommendation}</div>
      </div>
      ${matchedSymptoms && matchedSymptoms.length > 0 ? `
        <div style="margin-top:10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Detected Symptoms</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">
            ${matchedSymptoms.slice(0,5).map(s=>`<span class="badge badge-${s.urgency.toLowerCase()}">${s.symptom}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    <div class="safety-note">
      <span class="safety-note-icon">⚠️</span>
      <div class="safety-note-text"><strong>AI Assessment Only.</strong> Not a medical diagnosis. Consult a licensed physician.</div>
    </div>
  `;
}
