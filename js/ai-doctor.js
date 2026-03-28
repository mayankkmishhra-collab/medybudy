// ─── AI Female Doctor — Dr. Aria ─────────────────────────────────────────────
// Animated avatar + real webcam PiP + voice TTS + speech recognition

const AI_DOCTOR_RESPONSES = {
  greeting: [
    "Hello! I'm Dr. Aria, your AI medical assistant. I'm here to help you understand your health better. How are you feeling today?",
    "Welcome! I'm Dr. Aria. I've reviewed your symptom report. Let's discuss your health concerns in more detail. What's been bothering you?",
    "Hi there! I'm Dr. Aria. I'm glad you reached out. Tell me — what symptoms have you been experiencing?",
  ],
  symptoms: [
    "I understand. Can you tell me more about when these symptoms started?",
    "That's important information. Have you noticed anything that makes these symptoms better or worse?",
    "I see. On a scale of 1 to 10, how would you rate the severity of your discomfort?",
    "Thank you for sharing that. Have you experienced these symptoms before?",
    "I hear you. Are you experiencing any other symptoms alongside this?",
    "Could you describe the location of the pain or discomfort more precisely?",
  ],
  reassurance: [
    "I hear you, and I want you to know you're doing the right thing by seeking help.",
    "Thank you for sharing that with me. Let's work through this together.",
    "Your health is our priority. You're in good hands — let's figure this out.",
    "It's completely understandable to feel concerned. I'm here to help guide you.",
  ],
  advice: [
    "Based on your symptoms, I recommend staying hydrated and getting adequate rest. Monitor your temperature every few hours.",
    "It's important to avoid strenuous activity for now. If symptoms worsen, please seek emergency care immediately.",
    "I'd suggest scheduling an in-person appointment with a specialist within the next 48 hours.",
    "Make sure to keep track of when symptoms occur and their intensity. This will help your doctor greatly.",
    "For now, focus on rest, hydration, and avoiding triggers. If you notice any sudden worsening, go to the ER.",
  ],
  medicine: [
    "For mild symptoms, over-the-counter options like paracetamol may help with discomfort. Always follow dosage instructions.",
    "I'd recommend avoiding self-medication for now until we have a clearer picture. Let's gather more information first.",
    "Some OTC antihistamines may help if this is allergy-related, but please confirm with a pharmacist first.",
  ],
  closing: [
    "Take care of yourself. Remember, if symptoms worsen suddenly, please call emergency services immediately.",
    "I'll be here if you need more guidance. Your health matters — don't hesitate to reach out.",
    "Thank you for consulting with me today. Please follow up with a licensed physician for a proper diagnosis.",
  ],
  emergency: [
    "This sounds serious. Please call emergency services immediately — dial 911 in the US, 999 in the UK, or 112 in Europe.",
    "I'm concerned about what you've described. Please go to the nearest emergency room right away.",
  ]
};

const EMERGENCY_KEYWORDS = ["chest pain","can't breathe","heart attack","stroke","unconscious","severe bleeding","seizure","dying"];

// ─── Animated Avatar Renderer (Canvas-based) ─────────────────────────────────
class AriaAvatar {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.speaking = false;
    this.mouthOpen = 0;       // 0–1
    this.blinkT = 0;
    this.blinkState = 0;      // 0=open, 1=closing, 2=opening
    this.headBob = 0;
    this.headBobDir = 1;
    this.breathe = 0;
    this.frame = 0;
    this.lipPhase = 0;
    this.raf = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width  || 640;
    this.canvas.height = rect.height || 360;
    this.cx = this.canvas.width  / 2;
    this.cy = this.canvas.height / 2 - 20;
    this.r  = Math.min(this.canvas.width, this.canvas.height) * 0.28;
  }

  start() { if (!this.raf) this._loop(); }
  stop()  { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; } }

  setSpeaking(val) { this.speaking = val; if (!val) this.mouthOpen = 0; }

  _loop() {
    this.raf = requestAnimationFrame(() => this._loop());
    this.frame++;
    this._update();
    this._draw();
  }

  _update() {
    // Breathing
    this.breathe += 0.018;
    const breathOffset = Math.sin(this.breathe) * 3;

    // Head bob (subtle, only when speaking)
    if (this.speaking) {
      this.headBob += 0.06 * this.headBobDir;
      if (Math.abs(this.headBob) > 2.5) this.headBobDir *= -1;
    } else {
      this.headBob *= 0.92;
    }

    // Lip sync
    if (this.speaking) {
      this.lipPhase += 0.22;
      // Natural speech rhythm: fast open/close with variation
      const base = Math.abs(Math.sin(this.lipPhase));
      const flutter = Math.abs(Math.sin(this.lipPhase * 2.7)) * 0.3;
      this.mouthOpen = Math.min(1, base * 0.85 + flutter);
    } else {
      this.mouthOpen += (0 - this.mouthOpen) * 0.15;
    }

    // Blink
    this.blinkT++;
    if (this.blinkState === 0 && this.blinkT > 120 + Math.random() * 180) {
      this.blinkState = 1; this.blinkT = 0;
    }
    if (this.blinkState === 1) { this.blinkT++; if (this.blinkT > 6) { this.blinkState = 2; this.blinkT = 0; } }
    if (this.blinkState === 2) { this.blinkT++; if (this.blinkT > 6) { this.blinkState = 0; this.blinkT = 0; } }

    this._breatheOffset = breathOffset;
  }

  _draw() {
    const { ctx, cx, r, speaking } = this;
    const cy = this.cy + this._breatheOffset + this.headBob;
    const W = this.canvas.width, H = this.canvas.height;

    // Background
    const bg = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r * 2.2);
    bg.addColorStop(0, '#0d1433');
    bg.addColorStop(0.5, '#080f1e');
    bg.addColorStop(1, '#020817');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Ambient glow behind head
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
    glow.addColorStop(0, speaking ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.1)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2); ctx.fill();

    // Neck
    ctx.fillStyle = '#c8956c';
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.18, cy + r * 0.72, r * 0.36, r * 0.45, 4);
    ctx.fill();

    // Shoulders / coat
    const coatGrad = ctx.createLinearGradient(cx - r, cy + r * 0.9, cx + r, cy + r * 1.6);
    coatGrad.addColorStop(0, '#1a2a5e');
    coatGrad.addColorStop(0.5, '#2a3f8f');
    coatGrad.addColorStop(1, '#1a2a5e');
    ctx.fillStyle = coatGrad;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.9, H);
    ctx.quadraticCurveTo(cx - r * 0.7, cy + r * 1.0, cx - r * 0.22, cy + r * 0.85);
    ctx.lineTo(cx + r * 0.22, cy + r * 0.85);
    ctx.quadraticCurveTo(cx + r * 0.7, cy + r * 1.0, cx + r * 0.9, H);
    ctx.closePath(); ctx.fill();

    // White coat lapels
    ctx.fillStyle = '#e8eeff';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.22, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.08, cy + r * 1.1);
    ctx.lineTo(cx, cy + r * 0.95);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.22, cy + r * 0.85);
    ctx.lineTo(cx + r * 0.08, cy + r * 1.1);
    ctx.lineTo(cx, cy + r * 0.95);
    ctx.closePath(); ctx.fill();

    // Stethoscope hint
    ctx.strokeStyle = 'rgba(200,200,220,0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.78, r * 0.12, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.12, cy + r * 0.78);
    ctx.lineTo(cx - r * 0.18, cy + r * 1.05);
    ctx.moveTo(cx + r * 0.12, cy + r * 0.78);
    ctx.lineTo(cx + r * 0.18, cy + r * 1.05);
    ctx.stroke();

    // Hair (back layer)
    ctx.fillStyle = '#2c1810';
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.1, r * 0.72, r * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head / face
    const skinGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.2, r * 0.05, cx, cy, r * 0.85);
    skinGrad.addColorStop(0, '#f5c5a0');
    skinGrad.addColorStop(0.6, '#e8a882');
    skinGrad.addColorStop(1, '#c8956c');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.62, r * 0.76, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair (front)
    ctx.fillStyle = '#3d2010';
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.55, r * 0.62, r * 0.32, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // Side hair strands
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.55, cy - r * 0.1, r * 0.14, r * 0.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.55, cy - r * 0.1, r * 0.14, r * 0.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#3d2010';
    ctx.lineWidth = r * 0.045;
    ctx.lineCap = 'round';
    // Left brow
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy - r * 0.28);
    ctx.quadraticCurveTo(cx - r * 0.28, cy - r * 0.36, cx - r * 0.14, cy - r * 0.3);
    ctx.stroke();
    // Right brow
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.14, cy - r * 0.3);
    ctx.quadraticCurveTo(cx + r * 0.28, cy - r * 0.36, cx + r * 0.42, cy - r * 0.28);
    ctx.stroke();

    // Eyes
    const blinkScale = this.blinkState === 1
      ? 1 - (this.blinkT / 6)
      : this.blinkState === 2
        ? this.blinkT / 6
        : 1;

    this._drawEye(ctx, cx - r * 0.28, cy - r * 0.12, r * 0.14, r * 0.1 * blinkScale);
    this._drawEye(ctx, cx + r * 0.28, cy - r * 0.12, r * 0.14, r * 0.1 * blinkScale);

    // Nose
    ctx.strokeStyle = '#c8956c';
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.06, cy - r * 0.02);
    ctx.lineTo(cx, cy + r * 0.12);
    ctx.lineTo(cx + r * 0.06, cy - r * 0.02);
    ctx.stroke();

    // Mouth
    this._drawMouth(ctx, cx, cy + r * 0.3, r * 0.28, this.mouthOpen, speaking);

    // Cheek blush
    ctx.fillStyle = 'rgba(255,150,120,0.12)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.42, cy + r * 0.05, r * 0.18, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.42, cy + r * 0.05, r * 0.18, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();

    // Speaking indicator ring
    if (speaking) {
      const pulse = 0.5 + 0.5 * Math.sin(this.frame * 0.15);
      ctx.strokeStyle = `rgba(16,185,129,${0.4 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.82 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Name tag overlay
    ctx.fillStyle = 'rgba(2,8,23,0.7)';
    ctx.beginPath(); ctx.roundRect(cx - r * 0.55, cy + r * 1.05, r * 1.1, r * 0.32, 6); ctx.fill();
    ctx.fillStyle = '#f0f6ff';
    ctx.font = `bold ${Math.round(r * 0.13)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Dr. Aria', cx, cy + r * 1.22);
    ctx.fillStyle = '#6366f1';
    ctx.font = `${Math.round(r * 0.1)}px "Space Grotesk", sans-serif`;
    ctx.fillText('AI Medical Assistant', cx, cy + r * 1.33);
  }

  _drawEye(ctx, x, y, rx, ry) {
    // White
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x, y, rx, Math.max(0.5, ry), 0, 0, Math.PI * 2); ctx.fill();
    if (ry > 1) {
      // Iris
      ctx.fillStyle = '#5b3a8c';
      ctx.beginPath(); ctx.ellipse(x, y, rx * 0.6, Math.min(rx * 0.6, ry * 0.85), 0, 0, Math.PI * 2); ctx.fill();
      // Pupil
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(x, y, rx * 0.3, Math.min(rx * 0.3, ry * 0.5), 0, 0, Math.PI * 2); ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.ellipse(x - rx * 0.15, y - ry * 0.25, rx * 0.1, rx * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Eyelid outline
    ctx.strokeStyle = '#8b6050';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(x, y, rx, Math.max(0.5, ry), 0, 0, Math.PI * 2); ctx.stroke();
    // Lashes (top)
    if (ry > 2) {
      ctx.strokeStyle = '#2c1810';
      ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        const lx = x + i * rx * 0.35;
        ctx.beginPath();
        ctx.moveTo(lx, y - ry);
        ctx.lineTo(lx + i * 1.5, y - ry - 4);
        ctx.stroke();
      }
    }
  }

  _drawMouth(ctx, x, y, w, openAmt, speaking) {
    const h = openAmt * w * 0.45;
    // Lips outer
    ctx.fillStyle = '#c0605a';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y);
    ctx.quadraticCurveTo(x - w * 0.25, y - w * 0.12, x, y - w * 0.08);
    ctx.quadraticCurveTo(x + w * 0.25, y - w * 0.12, x + w * 0.5, y);
    ctx.quadraticCurveTo(x + w * 0.25, y + w * 0.1 + h, x, y + w * 0.12 + h);
    ctx.quadraticCurveTo(x - w * 0.25, y + w * 0.1 + h, x - w * 0.5, y);
    ctx.fill();
    // Mouth interior (when open)
    if (h > 2) {
      ctx.fillStyle = '#3a1a1a';
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.3, w * 0.32, h * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Teeth
      ctx.fillStyle = '#f5f0e8';
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.1, w * 0.28, h * 0.3, 0, 0, Math.PI);
      ctx.fill();
    }
    // Lip line
    ctx.strokeStyle = '#a04848';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y);
    ctx.quadraticCurveTo(x - w * 0.25, y - w * 0.12, x, y - w * 0.08);
    ctx.quadraticCurveTo(x + w * 0.25, y - w * 0.12, x + w * 0.5, y);
    ctx.stroke();
    // Smile corners
    if (!speaking || openAmt < 0.2) {
      ctx.strokeStyle = '#a04848';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x - w * 0.5, y, w * 0.06, -0.3, 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w * 0.5, y, w * 0.06, Math.PI - 0.5, Math.PI + 0.3); ctx.stroke();
    }
  }
}

// ─── Main AIDoctorCall Class ──────────────────────────────────────────────────
class AIDoctorCall {
  constructor() {
    this.isCallActive = false;
    this.isMuted = false;
    this.isVideoOff = false;
    this.isSpeaking = false;
    this.callDuration = 0;
    this.callTimer = null;
    this.speechSynth = window.speechSynthesis;
    this.recognition = null;
    this.selectedVoice = null;
    this.userStream = null;   // webcam MediaStream
    this.ariaAvatar = null;   // canvas avatar
    this.initVoice();
    this.initSpeechRecognition();
    this.initControls();
  }

  // ── Voice setup ──────────────────────────────────────────────────────────────
  initVoice() {
    const load = () => {
      const voices = this.speechSynth.getVoices();
      this.selectedVoice = voices.find(v =>
        v.lang.startsWith('en') && (
          v.name.includes('Female') || v.name.includes('Samantha') ||
          v.name.includes('Victoria') || v.name.includes('Karen') ||
          v.name.includes('Zira') || v.name.includes('Google UK English Female') ||
          v.name.includes('Aria') || v.name.includes('Jenny')
        )
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    };
    load();
    if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = load;
  }

  // ── Speech recognition ───────────────────────────────────────────────────────
  initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.onresult = (e) => {
      const t = e.results[e.results.length - 1][0].transcript.trim();
      if (t) this.handleUserSpeech(t);
    };
    this.recognition.onerror = () => {};
    this.recognition.onend = () => {
      // Auto-restart if call still active
      if (this.isCallActive && !this.isMuted) {
        try { this.recognition.start(); } catch(e) {}
      }
    };
  }

  // ── Button wiring ────────────────────────────────────────────────────────────
  initControls() {
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('endCallBtn')?.addEventListener('click', () => this.endCall());
      document.getElementById('muteBtn')?.addEventListener('click', () => this.toggleMute());
      document.getElementById('videoToggleBtn')?.addEventListener('click', () => this.toggleVideo());
    });
  }

  // ── Webcam ───────────────────────────────────────────────────────────────────
  async startUserCamera() {
    const pip = document.getElementById('userVideoFeed');
    if (!pip) return;
    try {
      this.userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // Replace placeholder emoji with live <video>
      pip.innerHTML = '';
      const vid = document.createElement('video');
      vid.srcObject = this.userStream;
      vid.autoplay = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;transform:scaleX(-1);';
      pip.appendChild(vid);
      pip.style.border = '2px solid var(--accent-green)';
    } catch (err) {
      // Camera denied — show a styled placeholder
      pip.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:4px;">
          <span style="font-size:22px;">📷</span>
          <span style="font-size:9px;color:var(--text-muted);text-align:center;padding:0 4px;">Camera<br>blocked</span>
        </div>`;
      if (typeof Toast !== 'undefined')
        Toast.show('Camera access denied — allow it in browser settings', 'warning', 5000);
    }
  }

  stopUserCamera() {
    if (this.userStream) {
      this.userStream.getTracks().forEach(t => t.stop());
      this.userStream = null;
    }
    const pip = document.getElementById('userVideoFeed');
    if (pip) {
      pip.innerHTML = '<span style="font-size:30px;">👤</span>';
      pip.style.border = '2px solid var(--border)';
    }
  }

  // ── Canvas avatar ────────────────────────────────────────────────────────────
  initAriaAvatar() {
    const container = document.getElementById('ariaAvatarContainer');
    if (!container) return;
    // Replace old emoji div with canvas
    container.innerHTML = '<canvas id="ariaCanvas" style="width:100%;height:100%;display:block;"></canvas>';
    const canvas = document.getElementById('ariaCanvas');
    canvas.width  = container.offsetWidth  || 640;
    canvas.height = container.offsetHeight || 360;
    this.ariaAvatar = new AriaAvatar(canvas);
    this.ariaAvatar.start();
  }

  // ── Speak ────────────────────────────────────────────────────────────────────
  speak(text) {
    if (!this.speechSynth) return;
    this.speechSynth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.voice  = this.selectedVoice;
    utt.rate   = 0.88;
    utt.pitch  = 1.12;
    utt.volume = 1;
    utt.onstart = () => {
      this.isSpeaking = true;
      if (this.ariaAvatar) this.ariaAvatar.setSpeaking(true);
      this.updateAvatarState('speaking');
    };
    utt.onend = () => {
      this.isSpeaking = false;
      if (this.ariaAvatar) this.ariaAvatar.setSpeaking(false);
      this.updateAvatarState('listening');
    };
    if (!this.isMuted) this.speechSynth.speak(utt);
    this.addCallMessage(text, 'doctor');
  }

  handleUserSpeech(transcript) {
    this.addCallMessage(transcript, 'user');
    const response = this.generateResponse(transcript);
    setTimeout(() => this.speak(response), 700);
  }

  generateResponse(input) {
    const l = input.toLowerCase();
    if (EMERGENCY_KEYWORDS.some(k => l.includes(k))) return this._pick(AI_DOCTOR_RESPONSES.emergency);
    if (l.includes('pain') || l.includes('hurt') || l.includes('ache') || l.includes('symptom') || l.includes('feel'))
      return this._pick(AI_DOCTOR_RESPONSES.symptoms);
    if (l.includes('scared') || l.includes('worried') || l.includes('anxious') || l.includes('nervous'))
      return this._pick(AI_DOCTOR_RESPONSES.reassurance);
    if (l.includes('medicine') || l.includes('medication') || l.includes('drug') || l.includes('tablet') || l.includes('pill'))
      return this._pick(AI_DOCTOR_RESPONSES.medicine);
    if (l.includes('what should') || l.includes('recommend') || l.includes('advice') || l.includes('do i') || l.includes('help'))
      return this._pick(AI_DOCTOR_RESPONSES.advice);
    if (l.includes('bye') || l.includes('thank') || l.includes('end') || l.includes('goodbye'))
      return this._pick(AI_DOCTOR_RESPONSES.closing);
    return this._pick(AI_DOCTOR_RESPONSES.symptoms);
  }

  _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Start call ───────────────────────────────────────────────────────────────
  async startCall() {
    this.isCallActive = true;
    this.callDuration = 0;
    this.callTimer = setInterval(() => { this.callDuration++; this._updateTimer(); }, 1000);

    // Init canvas avatar
    this.initAriaAvatar();

    // Start user webcam
    await this.startUserCamera();

    // Start speech recognition
    if (this.recognition) { try { this.recognition.start(); } catch(e) {} }

    // Greet after short delay
    setTimeout(() => this.speak(this._pick(AI_DOCTOR_RESPONSES.greeting)), 1400);
    this.updateAvatarState('listening');
  }

  // ── End call ─────────────────────────────────────────────────────────────────
  endCall() {
    this.isCallActive = false;
    clearInterval(this.callTimer);
    this.speechSynth?.cancel();
    if (this.recognition) { try { this.recognition.stop(); } catch(e) {} }
    if (this.ariaAvatar) { this.ariaAvatar.stop(); this.ariaAvatar = null; }
    this.stopUserCamera();
    this.updateAvatarState('idle');
    // Restore pre-call UI
    const startCard = document.getElementById('startCallCard');
    const controls  = document.getElementById('callControls');
    const textArea  = document.getElementById('callTextArea');
    if (startCard) startCard.style.display = 'block';
    if (controls)  controls.style.display  = 'none';
    if (textArea)  textArea.style.display  = 'none';
    // Restore emoji placeholder in avatar container
    const container = document.getElementById('ariaAvatarContainer');
    if (container) container.innerHTML = '<span id="aiDoctorAvatar" style="font-size:68px;position:relative;z-index:2;">👩‍⚕️</span>';
    if (typeof Toast !== 'undefined') Toast.show('Call ended. Summary saved to your dashboard.', 'success');
  }

  // ── Controls ─────────────────────────────────────────────────────────────────
  toggleMute() {
    this.isMuted = !this.isMuted;
    const btn = document.getElementById('muteBtn');
    if (btn) { btn.textContent = this.isMuted ? '🔇' : '🎤'; btn.classList.toggle('muted', this.isMuted); }
    if (this.isMuted && this.recognition) { try { this.recognition.stop(); } catch(e) {} }
    else if (!this.isMuted && this.isCallActive && this.recognition) { try { this.recognition.start(); } catch(e) {} }
    if (typeof Toast !== 'undefined') Toast.show(this.isMuted ? 'Microphone muted' : 'Microphone on', 'info', 1500);
  }

  toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    const btn = document.getElementById('videoToggleBtn');
    if (btn) btn.textContent = this.isVideoOff ? '🚫' : '📹';
    const pip = document.getElementById('userVideoFeed');
    if (pip) {
      if (this.isVideoOff) {
        // Pause video track
        this.userStream?.getVideoTracks().forEach(t => t.enabled = false);
        pip.style.opacity = '0.3';
      } else {
        this.userStream?.getVideoTracks().forEach(t => t.enabled = true);
        pip.style.opacity = '1';
      }
    }
  }

  _updateTimer() {
    const el = document.getElementById('callTimer');
    if (!el) return;
    const m = Math.floor(this.callDuration / 60).toString().padStart(2, '0');
    const s = (this.callDuration % 60).toString().padStart(2, '0');
    el.textContent = `${m}:${s}`;
  }

  updateAvatarState(state) {
    // Waveform + status text handled by page-level patch
  }

  addCallMessage(text, sender) {
    const container = document.getElementById('callTranscript');
    if (!container) return;
    container.querySelector('[data-placeholder]')?.remove();
    const msg = document.createElement('div');
    msg.className = `transcript-msg ${sender === 'doctor' ? 'ai' : 'user'}`;
    msg.innerHTML = `<div class="speaker">${sender === 'doctor' ? '🩺 Dr. Aria' : '👤 You'}</div>${text}`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }
}

let aiDoctor;
document.addEventListener('DOMContentLoaded', () => { aiDoctor = new AIDoctorCall(); });
