// ─── MediBuddy Chatbot — Real AI Agent + Gemini fallback + Rule-based fallback ───
// Priority: 1. Python ML Agent (real datasets)  2. Gemini AI  3. Rule-based

const CHAT_STAGES = {
  GREETING:'greeting', NAME:'name', AGE:'age',
  SYMPTOMS:'symptoms', DURATION:'duration', HISTORY:'history',
  ANALYSIS:'analysis', FOLLOWUP:'followup', AI:'ai', AGENT:'agent'
};

// Rule-based fallback responses
const AI_RESPONSES = {
  greeting: "Hello! I'm MediBuddy, your intelligent health assistant. I'm here to help assess your symptoms and guide you to the right care. What's your name?",
  name: n => `Nice to meet you, ${n}! To better assist you, could you tell me your age?`,
  age: () => "Thank you. Now, please describe your symptoms in as much detail as possible — what are you experiencing?",
  duration: () => "How long have you been experiencing these symptoms? (e.g., a few hours, 2 days, a week)",
  history: () => "Do you have any existing medical conditions or are you currently taking any medications? (Type 'none' if not applicable)",
  analyzing: () => "🔍 Analyzing your symptoms with our AI engine...",
  followup: [
    "Is there anything else you'd like to add about your symptoms?",
    "On a scale of 1–10, how would you rate your discomfort?",
    "Have you taken any medication for this already?",
    "Do you have any known allergies?",
    "Are you experiencing any fever, chills, or sweating?",
  ]
};

// Urgency badge colours
const URGENCY_BADGE = {
  Critical: 'badge-critical', High: 'badge-high',
  Medium: 'badge-medium', Low: 'badge-low'
};

class MediChatbot {
  constructor() {
    this.stage = CHAT_STAGES.GREETING;
    this.patientData = { name:'', age:0, symptoms:'', duration:'', history:[], followups:[] };
    this.messageCount = 0;
    this.recognition = null;
    this.isListening = false;
    this.analysisComplete = false;
    this.pendingImage = null;
    this.mode = 'detecting'; // 'agent' | 'gemini' | 'rules'
    this.initSpeechRecognition();
    this.initUI();
  }

  // ── Speech recognition ────────────────────────────────────────────────────
  initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      const inp = document.getElementById('chatInput');
      if (inp) inp.value = t;
      if (e.results[0].isFinal) this.stopListening();
    };
    this.recognition.onend = () => this.stopListening();
    this.recognition.onerror = () => this.stopListening();
  }

  // ── UI wiring ─────────────────────────────────────────────────────────────
  async initUI() {
    document.getElementById('sendBtn')?.addEventListener('click', () => this.handleSend());
    const inp = document.getElementById('chatInput');
    if (inp) inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
    });
    document.getElementById('voiceBtn')?.addEventListener('click', () => this.toggleVoice());

    // Detect best available mode
    await this.detectMode();

    // Initial greeting
    setTimeout(() => this._sendGreeting(), 400);
  }

  async detectMode() {
    // 1. Try real ML agent first
    if (typeof agentAPI !== 'undefined') {
      const alive = await agentAPI.checkHealth();
      if (alive) {
        this.mode = 'agent';
        this.stage = CHAT_STAGES.AGENT;
        this.updateModeBadge('agent');
        return;
      }
    }
    // 2. Try Gemini
    if (typeof geminiAI !== 'undefined' && geminiAI.isConfigured) {
      this.mode = 'gemini';
      this.stage = CHAT_STAGES.AI;
      this.updateModeBadge('gemini');
      return;
    }
    // 3. Rule-based fallback
    this.mode = 'rules';
    this.stage = CHAT_STAGES.GREETING;
    this.updateModeBadge('rules');
  }

  updateModeBadge(mode) {
    const badge = document.getElementById('geminiBadge');
    if (!badge) return;
    const configs = {
      agent:  { text: '🤖 AI Agent (Real Data)', cls: 'badge-low',    tip: 'Powered by ML model trained on real medical datasets' },
      gemini: { text: '✦ Gemini AI',             cls: 'badge-info',   tip: 'Powered by Google Gemini 1.5 Flash' },
      rules:  { text: '⚙ Set API Key',           cls: 'badge-medium', tip: 'Click to configure Gemini AI or start the Python backend' },
    };
    const cfg = configs[mode] || configs.rules;
    badge.textContent = cfg.text;
    badge.className = `badge ${cfg.cls}`;
    badge.title = cfg.tip;
    badge.style.cursor = mode === 'rules' ? 'pointer' : 'default';
    badge.onclick = mode === 'rules' ? () => openModal('apiKeyModal') : null;
  }

  _sendGreeting() {
    const greetings = {
      agent:  "Hello! I'm MediBuddy, powered by a real ML model trained on medical datasets. I can assess your symptoms and predict possible conditions. What's your name?",
      gemini: "Hello! I'm MediBuddy, powered by Google Gemini AI. I'm your intelligent health assistant. How are you feeling today?",
      rules:  AI_RESPONSES.greeting,
    };
    this.addMessage(greetings[this.mode] || AI_RESPONSES.greeting, 'ai');
  }

  // ── Send handler ──────────────────────────────────────────────────────────
  handleSend() {
    const inp = document.getElementById('chatInput');
    if (!inp) return;
    const text = inp.value.trim();
    const hasImage = this.pendingImage;
    if (!text && !hasImage) return;

    this.addMessage(text || 'Uploaded an image of my symptoms.', 'user', hasImage);
    inp.value = '';
    const cc = document.getElementById('charCount');
    if (cc) cc.textContent = '0';
    if (hasImage) {
      this.pendingImage = null;
      document.getElementById('imagePreviewArea').style.display = 'none';
      document.getElementById('imageInput').value = '';
    }

    const msg = text || 'Image uploaded for analysis';
    if (this.mode === 'agent') this.processAgent(msg);
    else if (this.mode === 'gemini') this.processGemini(msg);
    else this.processRuleBased(msg);
  }

  // ── AGENT MODE (real ML backend) ──────────────────────────────────────────
  async processAgent(text) {
    this.showTyping();
    const result = await agentAPI.chat(text);
    this.hideTyping();

    if (result.error === 'offline' || result.error === 'network') {
      // Fallback to Gemini or rules
      this.addMessage('⚠️ AI Agent is offline. Switching to backup mode...', 'ai');
      await this.detectMode();
      if (this.mode === 'gemini') this.processGemini(text);
      else this.processRuleBased(text);
      return;
    }

    if (!result.reply) {
      this.addMessage('⚠️ No response from AI Agent. Please try again.', 'ai');
      return;
    }

    this.addMessage(result.reply, 'ai');

    // Update analysis panel with real predictions
    if (result.predictions && result.predictions.length > 0) {
      this.renderAgentPredictions(result.predictions, result.symptoms || []);
      this.analysisComplete = true;
      const st = document.getElementById('analysisStatus');
      if (st) { st.textContent = 'Complete'; st.className = 'badge badge-low'; }
    }

    // Update stage indicator
    const stageMap = {
      greeting:'Step 1/5', name:'Step 1/5', age:'Step 2/5',
      symptoms:'Step 3/5', analysis:'Analyzing...', followup:'Complete', done:'Complete'
    };
    const ind = document.getElementById('stageIndicator');
    if (ind && result.stage) ind.textContent = stageMap[result.stage] || '';
    if (result.stage === 'analysis' || result.stage === 'followup') {
      const st = document.getElementById('analysisStatus');
      if (st) { st.textContent = 'Analyzing'; st.className = 'badge badge-medium'; }
    }
  }

  renderAgentPredictions(predictions, symptoms) {
    const top = predictions[0];
    const urgencyColors  = { Critical:'#ef4444', High:'#f97316', Medium:'#f59e0b', Low:'#10b981' };
    const urgencyPct     = { Critical:95, High:75, Medium:50, Low:25 };
    const urgencyIcons   = { Critical:'🚨', High:'⚠️', Medium:'🔶', Low:'✅' };
    const urgencyActions = {
      Critical: '🚨 Go to ER immediately or call 911/999/112',
      High:     '⚠️ See a doctor within 24 hours',
      Medium:   '🔶 Schedule an appointment this week',
      Low:      '✅ Monitor at home, consult if worsens',
    };
    const color = urgencyColors[top.urgency] || '#6366f1';
    const pct   = urgencyPct[top.urgency] || 50;

    // ── Urgency panel ──────────────────────────────────────────────────────
    const urgencyEl = document.getElementById('urgencyResult');
    if (urgencyEl) {
      urgencyEl.innerHTML = `
        <div class="card" style="border-color:${color}33;margin-bottom:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:24px;">${urgencyIcons[top.urgency]||'🔍'}</span>
              <div>
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Urgency Level</div>
                <div style="font-size:20px;font-weight:800;color:${color};">${top.urgency}</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px;color:var(--text-muted);">ML Confidence</div>
              <div style="font-size:18px;font-weight:700;color:var(--accent-indigo);font-family:var(--font-mono);">${top.confidence}%</div>
            </div>
          </div>
          <div class="urgency-bar"><div class="urgency-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},${color}88);"></div></div>
          <div style="margin-top:10px;padding:9px 12px;background:${color}11;border-radius:var(--radius-xs);border-left:3px solid ${color};">
            <div style="font-size:10px;font-weight:700;color:${color};margin-bottom:2px;">RECOMMENDED ACTION</div>
            <div style="font-size:12px;">${urgencyActions[top.urgency]||''}</div>
          </div>
          ${symptoms.length ? `
          <div style="margin-top:10px;">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;">Detected Symptoms</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              ${symptoms.slice(0,8).map(s=>`<span class="badge badge-info" style="font-size:10px;">${s.replace(/_/g,' ')}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
        <div class="safety-note">
          <span class="safety-note-icon">⚠️</span>
          <div class="safety-note-text"><strong>ML Assessment Only.</strong> Trained on real medical data — not a diagnosis. Always consult a licensed physician.</div>
        </div>`;
    }

    // ── Specialist panel — with disease info, medications, diets ──────────
    const specEl = document.getElementById('specialistResult');
    if (specEl) {
      specEl.innerHTML = predictions.map((p, i) => {
        const meds    = (p.medications||[]).slice(0,4);
        const diets   = (p.diets||[]).slice(0,4);
        const precs   = (p.precautions||[]).slice(0,3);
        const desc    = p.description ? p.description.slice(0,140) + (p.description.length>140?'...':'') : '';
        return `
        <div class="card" style="margin-bottom:10px;${i===0?'border-color:rgba(99,102,241,0.3);':''}" onclick="openScheduleModal('general','${p.specialist}')">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div>
              <div style="font-weight:700;font-size:13px;">${p.disease}</div>
              <div style="font-size:11px;color:var(--text-muted);">→ ${p.specialist}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:15px;font-weight:800;color:var(--accent-indigo);font-family:var(--font-mono);">${p.confidence}%</div>
              <span class="badge ${URGENCY_BADGE[p.urgency]||'badge-info'}" style="font-size:10px;">${p.urgency}</span>
            </div>
          </div>
          ${desc ? `<div style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-bottom:8px;">${desc}</div>` : ''}
          ${meds.length ? `<div style="margin-bottom:6px;"><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">💊 Medications</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${meds.map(m=>`<span style="font-size:10px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:2px 8px;color:var(--accent-indigo);">${m}</span>`).join('')}</div></div>` : ''}
          ${diets.length ? `<div style="margin-bottom:6px;"><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">🥗 Diet</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${diets.map(d=>`<span style="font-size:10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:2px 8px;color:var(--accent-green);">${d}</span>`).join('')}</div></div>` : ''}
          ${precs.length ? `<div style="margin-bottom:8px;"><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">⚠️ Precautions</div>${precs.map(pr=>`<div style="font-size:11px;color:var(--text-secondary);padding:2px 0;">• ${pr}</div>`).join('')}</div>` : ''}
          <button class="btn btn-primary btn-xs" onclick="event.stopPropagation();openScheduleModal('general','${p.specialist}')">📅 Book ${p.specialist}</button>
        </div>`;
      }).join('') + `
        <div class="safety-note" style="margin-top:8px;">
          <span class="safety-note-icon">⚠️</span>
          <div class="safety-note-text"><strong>AI Suggestion.</strong> Based on real medical dataset patterns. Always confirm with a licensed physician.</div>
        </div>`;
    }

    // ── Medicine panel — workouts + home remedies ──────────────────────────
    const medEl = document.getElementById('medicineResult');
    if (medEl) {
      const workouts = (top.workouts||[]).slice(0,5);
      const meds     = (top.medications||[]).slice(0,5);
      const diets    = (top.diets||[]).slice(0,5);
      medEl.innerHTML = `
        <div class="safety-note" style="margin-bottom:10px;">
          <span class="safety-note-icon">⚠️</span>
          <div class="safety-note-text"><strong>AI Safety Disclaimer:</strong> These are AI-generated suggestions from real medical datasets. Not a prescription. Always consult a licensed physician before taking any medication.</div>
        </div>
        ${meds.length ? `
        <div class="card" style="margin-bottom:10px;">
          <div style="font-weight:700;font-size:12px;margin-bottom:8px;">💊 Medications for ${top.disease}</div>
          ${meds.map(m=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;"><span style="color:var(--accent-indigo);">•</span>${m}</div>`).join('')}
        </div>` : ''}
        ${diets.length ? `
        <div class="card" style="margin-bottom:10px;">
          <div style="font-weight:700;font-size:12px;margin-bottom:8px;">🥗 Recommended Diet</div>
          ${diets.map(d=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;"><span style="color:var(--accent-green);">•</span>${d}</div>`).join('')}
        </div>` : ''}
        ${workouts.length ? `
        <div class="card" style="margin-bottom:10px;">
          <div style="font-weight:700;font-size:12px;margin-bottom:8px;">🏃 Lifestyle & Exercise</div>
          ${workouts.map(w=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;"><span style="color:var(--accent-amber);">•</span>${w}</div>`).join('')}
        </div>` : ''}
      `;
    }
  }

  // ── GEMINI MODE ───────────────────────────────────────────────────────────
  async processGemini(text) {
    this.showTyping();
    const result = await geminiAI.chat(text);
    this.hideTyping();

    if (result.error) {
      const msgs = {
        no_key: 'Please set your Gemini API key to use AI-powered responses.',
        bad_key: '❌ Invalid API key. Please check your Gemini API key.',
        quota: '⚠️ API quota exceeded. Please try again later.',
        network: '⚠️ Network error. Please check your connection.',
      };
      this.addMessage(msgs[result.error] || '⚠️ Something went wrong. Please try again.', 'ai');
      if (result.error === 'bad_key' || result.error === 'no_key') {
        this.mode = 'rules'; this.stage = CHAT_STAGES.GREETING;
        this.updateModeBadge('rules');
        setTimeout(() => this.addMessage("Switching to built-in mode. " + AI_RESPONSES.greeting, 'ai'), 800);
      }
      return;
    }
    this.addMessage(result.text, 'ai');
    if (geminiAI.conversationHistory.length >= 6 && !this.analysisComplete) {
      const userMsgs = geminiAI.conversationHistory.filter(m=>m.role==='user').map(m=>m.parts[0].text).join(' ');
      if (typeof predictUrgency === 'function') {
        const u = predictUrgency(userMsgs, 30, [], 'days');
        if (u && typeof renderUrgencyResult === 'function') renderUrgencyResult(u);
      }
      if (typeof recommendSpecialists === 'function') {
        const s = recommendSpecialists(userMsgs);
        if (s.length && typeof renderSpecialistResult === 'function') renderSpecialistResult(s);
      }
      if (typeof suggestMedicines === 'function') {
        const m = suggestMedicines(userMsgs);
        if (m.length && typeof renderMedicineResult === 'function') renderMedicineResult(m);
      }
      this.analysisComplete = true;
      const st = document.getElementById('analysisStatus');
      if (st) { st.textContent = 'Complete'; st.className = 'badge badge-low'; }
    }
  }

  // ── RULE-BASED MODE ───────────────────────────────────────────────────────
  processRuleBased(text) {
    const lower = text.toLowerCase().trim();
    switch (this.stage) {
      case CHAT_STAGES.GREETING:
        this.patientData.name = text.split(' ')[0];
        this.stage = CHAT_STAGES.AGE;
        this.respond(AI_RESPONSES.name(this.patientData.name)); break;
      case CHAT_STAGES.AGE:
        const age = parseInt(text);
        if (isNaN(age)||age<1||age>120) { this.respond("Please enter a valid age (e.g., 25)."); return; }
        this.patientData.age = age;
        this.stage = CHAT_STAGES.SYMPTOMS;
        this.respond(AI_RESPONSES.age()); break;
      case CHAT_STAGES.SYMPTOMS:
        if (text.length < 5) { this.respond("Please describe your symptoms in more detail."); return; }
        this.patientData.symptoms = text;
        this.stage = CHAT_STAGES.DURATION;
        this.respond(AI_RESPONSES.duration()); break;
      case CHAT_STAGES.DURATION:
        this.patientData.duration = text;
        this.stage = CHAT_STAGES.HISTORY;
        this.respond(AI_RESPONSES.history()); break;
      case CHAT_STAGES.HISTORY:
        this.patientData.history = lower === 'none' ? [] : [text];
        this.stage = CHAT_STAGES.ANALYSIS;
        this.runRuleBasedAnalysis(); break;
      default:
        this.patientData.followups.push(text);
        const idx = Math.floor(Math.random() * AI_RESPONSES.followup.length);
        if (this.patientData.followups.length < 3) this.respond(AI_RESPONSES.followup[idx]);
        else this.respond(`Thank you. Please review the analysis panel for your results. Would you like to schedule a consultation?`);
    }
  }

  runRuleBasedAnalysis() {
    this.respond(AI_RESPONSES.analyzing(), 600);
    setTimeout(() => {
      const u = typeof predictUrgency       === 'function' ? predictUrgency(this.patientData.symptoms, this.patientData.age, this.patientData.history, this.patientData.duration) : null;
      const s = typeof recommendSpecialists === 'function' ? recommendSpecialists(this.patientData.symptoms) : [];
      const m = typeof suggestMedicines     === 'function' ? suggestMedicines(this.patientData.symptoms) : [];
      if (u && typeof renderUrgencyResult    === 'function') renderUrgencyResult(u);
      if (s.length && typeof renderSpecialistResult === 'function') renderSpecialistResult(s);
      if (m.length && typeof renderMedicineResult   === 'function') renderMedicineResult(m);
      const lvl  = u ? u.data.label  : 'Unknown';
      const act  = u ? u.data.action : 'Please consult a doctor';
      const icon = u ? u.data.icon   : '🔍';
      const spec = s.length ? s[0].name : 'General Practitioner';
      const meds = m.slice(0,2).map(x=>x.name).join(', ');
      this.addMessage(
        `**Analysis Complete**\n\n${icon} **Urgency:** ${lvl}\n📋 **Action:** ${act}\n🩺 **Specialist:** ${spec}\n` +
        (meds ? `💊 **OTC Options:** ${meds}\n\n` : '\n') +
        `⚠️ *AI assessment only — not a medical diagnosis. Consult a licensed physician.*`, 'ai'
      );
      this.analysisComplete = true;
      this.stage = CHAT_STAGES.FOLLOWUP;
      const st = document.getElementById('analysisStatus');
      if (st) { st.textContent = 'Complete'; st.className = 'badge badge-low'; }
      setTimeout(() => this.respond("Do you have any questions, or would you like to schedule a consultation?"), 1500);
    }, 2200);
  }

  // ── Voice ─────────────────────────────────────────────────────────────────
  toggleVoice() { if (this.isListening) this.stopListening(); else this.startListening(); }
  startListening() {
    if (!this.recognition) { Toast.show('Voice input not supported in this browser', 'warning'); return; }
    this.isListening = true; this.recognition.start();
    const btn = document.getElementById('voiceBtn');
    if (btn) { btn.textContent = '🔴'; btn.classList.add('voice-active'); }
    Toast.show('Listening… speak now', 'info', 3000);
  }
  stopListening() {
    this.isListening = false; try { this.recognition?.stop(); } catch(e) {}
    const btn = document.getElementById('voiceBtn');
    if (btn) { btn.textContent = '🎤'; btn.classList.remove('voice-active'); }
  }

  // ── Message rendering ─────────────────────────────────────────────────────
  addMessage(text, sender, imageData = null) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = `msg ${sender}`;
    const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const modeLabel = { agent:' · AI Agent', gemini:' · Gemini AI', rules:'' };
    const avatarStyle = this.mode === 'agent'
      ? 'background:linear-gradient(135deg,#10b981,#059669);font-size:13px;font-weight:700;'
      : this.mode === 'gemini'
        ? 'background:linear-gradient(135deg,#4285f4,#34a853);font-size:13px;font-weight:700;'
        : '';
    const avatarIcon = this.mode === 'agent' ? '⚕' : this.mode === 'gemini' ? '✦' : '🤖';
    const imgHtml = imageData ? `<img src="${imageData}" class="img-msg-preview" alt="Uploaded symptom image"/>` : '';
    msg.innerHTML = `
      <div class="msg-avatar" style="${sender==='ai'?avatarStyle:''}">${sender==='ai'?avatarIcon:'👤'}</div>
      <div>
        <div class="msg-bubble">${this.formatText(text)}${imgHtml}</div>
        <div class="msg-time">${time}${sender==='ai'?modeLabel[this.mode]||'':''}</div>
      </div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    this.messageCount++;
  }

  formatText(t) {
    return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/\n/g,'<br>');
  }

  showTyping() {
    const c = document.getElementById('chatMessages');
    if (!c || document.getElementById('typingIndicator')) return;
    const t = document.createElement('div');
    t.className = 'msg ai'; t.id = 'typingIndicator';
    const style = this.mode==='agent' ? 'background:linear-gradient(135deg,#10b981,#059669);font-size:13px;font-weight:700;' : '';
    const icon  = this.mode==='agent' ? '⚕' : this.mode==='gemini' ? '✦' : '🤖';
    t.innerHTML = `<div class="msg-avatar" style="${style}">${icon}</div><div class="msg-bubble" style="padding:12px 16px;"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
    c.appendChild(t); c.scrollTop = c.scrollHeight;
  }
  hideTyping() { document.getElementById('typingIndicator')?.remove(); }
  respond(text, delay = 1100) { this.showTyping(); setTimeout(() => { this.hideTyping(); this.addMessage(text, 'ai'); }, delay); }
}

let chatbot;
document.addEventListener('DOMContentLoaded', () => { chatbot = new MediChatbot(); });
