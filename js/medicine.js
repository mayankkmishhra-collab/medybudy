// ─── Medicine Suggestion Engine ──────────────────────────────────────────────
// ⚠️ FOR INFORMATIONAL PURPOSES ONLY — NOT MEDICAL ADVICE

const MEDICINE_DB = {
  headache: [
    { name: 'Paracetamol (Acetaminophen)', dose: '500-1000mg every 4-6 hours', sideEffects: ['Rare at normal doses', 'Liver stress if overused'], safety: 'high', otc: true, note: 'Safest first-line option' },
    { name: 'Ibuprofen', dose: '200-400mg every 6-8 hours with food', sideEffects: ['Stomach upset', 'Avoid on empty stomach'], safety: 'medium', otc: true, note: 'Anti-inflammatory, avoid if stomach issues' },
  ],
  fever: [
    { name: 'Paracetamol (Acetaminophen)', dose: '500-1000mg every 4-6 hours', sideEffects: ['Minimal at correct dose'], safety: 'high', otc: true, note: 'Preferred for fever reduction' },
    { name: 'Ibuprofen', dose: '200-400mg every 6-8 hours', sideEffects: ['GI irritation', 'Not for children under 6 months'], safety: 'medium', otc: true, note: 'Also reduces inflammation' },
  ],
  cough: [
    { name: 'Dextromethorphan (DXM)', dose: '10-20mg every 4 hours', sideEffects: ['Drowsiness', 'Dizziness'], safety: 'medium', otc: true, note: 'Dry cough suppressant' },
    { name: 'Guaifenesin', dose: '200-400mg every 4 hours with water', sideEffects: ['Nausea if not enough water'], safety: 'high', otc: true, note: 'Expectorant — loosens mucus' },
  ],
  'sore throat': [
    { name: 'Benzocaine lozenges', dose: '1 lozenge every 2 hours', sideEffects: ['Rare allergic reaction'], safety: 'high', otc: true, note: 'Local numbing relief' },
    { name: 'Ibuprofen', dose: '200-400mg every 6-8 hours', sideEffects: ['GI upset'], safety: 'medium', otc: true, note: 'Reduces throat inflammation' },
  ],
  nausea: [
    { name: 'Dimenhydrinate (Dramamine)', dose: '50-100mg every 4-6 hours', sideEffects: ['Drowsiness', 'Dry mouth'], safety: 'medium', otc: true, note: 'Motion sickness & nausea' },
    { name: 'Ginger supplements', dose: '250mg 4x daily', sideEffects: ['Heartburn in high doses'], safety: 'high', otc: true, note: 'Natural anti-nausea option' },
  ],
  allergy: [
    { name: 'Cetirizine (Zyrtec)', dose: '10mg once daily', sideEffects: ['Mild drowsiness'], safety: 'high', otc: true, note: 'Non-drowsy antihistamine' },
    { name: 'Loratadine (Claritin)', dose: '10mg once daily', sideEffects: ['Headache (rare)'], safety: 'high', otc: true, note: 'Least sedating option' },
  ],
  'acid reflux': [
    { name: 'Omeprazole (Prilosec)', dose: '20mg once daily before meal', sideEffects: ['Headache', 'Long-term: B12 deficiency'], safety: 'medium', otc: true, note: 'Proton pump inhibitor' },
    { name: 'Antacids (Tums/Maalox)', dose: 'As needed after meals', sideEffects: ['Constipation or diarrhea'], safety: 'high', otc: true, note: 'Fast relief, not long-term' },
  ],
  anxiety: [
    { name: 'Magnesium Glycinate', dose: '200-400mg daily', sideEffects: ['Loose stools if too much'], safety: 'high', otc: true, note: 'Natural calming supplement' },
    { name: 'L-Theanine', dose: '100-200mg as needed', sideEffects: ['None significant'], safety: 'high', otc: true, note: 'Promotes calm without sedation' },
  ],
  insomnia: [
    { name: 'Melatonin', dose: '0.5-5mg 30 min before bed', sideEffects: ['Grogginess if too high dose'], safety: 'high', otc: true, note: 'Start with lowest dose' },
    { name: 'Diphenhydramine (Benadryl)', dose: '25-50mg at bedtime', sideEffects: ['Next-day drowsiness', 'Tolerance builds quickly'], safety: 'medium', otc: true, note: 'Short-term use only' },
  ],
  'muscle pain': [
    { name: 'Ibuprofen', dose: '400mg every 6-8 hours with food', sideEffects: ['GI upset', 'Avoid long-term'], safety: 'medium', otc: true, note: 'Anti-inflammatory for muscle pain' },
    { name: 'Topical Diclofenac (Voltaren)', dose: 'Apply to affected area 3-4x daily', sideEffects: ['Local skin irritation'], safety: 'high', otc: true, note: 'Targeted relief, fewer systemic effects' },
  ],
};

const SAFETY_COLORS = { high: '#00ff88', medium: '#ffc107', low: '#ff6b35' };

function suggestMedicines(symptoms) {
  const symptomsLower = symptoms.toLowerCase();
  const suggestions = [];
  const seen = new Set();

  for (const [condition, meds] of Object.entries(MEDICINE_DB)) {
    if (symptomsLower.includes(condition)) {
      meds.forEach(med => {
        if (!seen.has(med.name)) {
          seen.add(med.name);
          suggestions.push({ condition, ...med });
        }
      });
    }
  }

  // Default if nothing matched
  if (suggestions.length === 0 && symptomsLower.includes('pain')) {
    MEDICINE_DB['headache'].forEach(med => {
      suggestions.push({ condition: 'general pain', ...med });
    });
  }

  return suggestions.slice(0, 4);
}

function renderMedicineCards(medicines, container) {
  if (!container || medicines.length === 0) {
    if (container) container.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">No specific OTC suggestions for these symptoms. Please consult a doctor.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="safety-note" style="margin-bottom:16px;">
      <span class="safety-note-icon">⚠️</span>
      <div class="safety-note-text">
        <strong>AI Safety Disclaimer</strong>
        These suggestions are generated by AI for informational purposes only. AI is not 100% accurate and this does NOT replace professional medical advice. Always consult a licensed physician before taking any medication. Individual reactions vary — stop use and seek help if adverse effects occur.
      </div>
    </div>
    ${medicines.map(med => `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px;">
          <div>
            <div style="font-weight:700; font-size:15px; margin-bottom:2px;">💊 ${med.name}</div>
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">For: ${med.condition}</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${med.otc ? '<span class="badge badge-info">OTC</span>' : '<span class="badge badge-high">Rx</span>'}
            <span style="font-size:11px; font-weight:700; color:${SAFETY_COLORS[med.safety]}; background:${SAFETY_COLORS[med.safety]}22; padding:3px 8px; border-radius:10px; border:1px solid ${SAFETY_COLORS[med.safety]}44;">
              ${med.safety.toUpperCase()} SAFETY
            </span>
          </div>
        </div>
        <div style="background:var(--bg-secondary); border-radius:8px; padding:10px 12px; margin-bottom:10px;">
          <div style="font-size:11px; color:var(--text-muted); margin-bottom:3px; text-transform:uppercase; letter-spacing:0.5px;">Dosage</div>
          <div style="font-size:13px; color:var(--text-primary);">${med.dose}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
          ${med.sideEffects.map(se => `
            <span style="font-size:11px; color:#ffc107; background:rgba(255,193,7,0.1); padding:3px 8px; border-radius:10px; border:1px solid rgba(255,193,7,0.2);">⚡ ${se}</span>
          `).join('')}
        </div>
        <div style="font-size:12px; color:var(--text-secondary); font-style:italic;">💡 ${med.note}</div>
      </div>
    `).join('')}
  `;
}

// ─── Render to Analysis Panel ─────────────────────────────────────────────────
function renderMedicineResult(medicines) {
  const container = document.getElementById('medicineResult');
  if (!container) return;
  if (!medicines || medicines.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px;">No specific OTC suggestions. Please consult a doctor.</div>`;
    return;
  }
  const safetyColors = { high:'#10b981', medium:'#f59e0b', low:'#ef4444' };
  container.innerHTML = `
    <div class="safety-note" style="margin-bottom:12px;">
      <span class="safety-note-icon">⚠️</span>
      <div class="safety-note-text"><strong>AI Safety Disclaimer:</strong> These are AI-generated OTC suggestions only. Not medical advice. AI is not 100% accurate. Always consult a licensed physician before taking any medication.</div>
    </div>
    ${medicines.map(med => `
      <div class="medicine-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div>
            <div style="font-weight:700;font-size:13px;margin-bottom:2px;">💊 ${med.name}</div>
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">For: ${med.condition}</div>
          </div>
          <div style="display:flex;gap:5px;align-items:center;flex-shrink:0;">
            ${med.otc ? '<span class="badge badge-info">OTC</span>' : '<span class="badge badge-high">Rx</span>'}
            <span class="safety-pill safety-${med.safety}">${med.safety.toUpperCase()}</span>
          </div>
        </div>
        <div style="background:var(--bg-secondary);border-radius:var(--radius-xs);padding:8px 10px;margin-bottom:8px;">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px;">Dosage</div>
          <div style="font-size:12px;">${med.dose}</div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px;">
          ${med.sideEffects.map(se=>`<span style="font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.1);padding:2px 7px;border-radius:8px;border:1px solid rgba(245,158,11,0.2);">⚡ ${se}</span>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-secondary);font-style:italic;">💡 ${med.note}</div>
      </div>
    `).join('')}
  `;
}
