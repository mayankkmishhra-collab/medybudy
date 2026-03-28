// ─── MediBuddy Agent API Client ──────────────────────────────────────────────────
// Connects to the Python Flask backend trained on real medical datasets.

const AGENT_BASE = 'http://localhost:5000/api';

class MediAgentAPI {
  constructor() {
    this.sessionId = this._getOrCreateSession();
    this.isOnline   = false;
    this.checkHealth();
  }

  _getOrCreateSession() {
    let sid = sessionStorage.getItem('mediBuddy_session');
    if (!sid) {
      sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('mediBuddy_session', sid);
    }
    return sid;
  }

  async checkHealth() {
    try {
      const r = await fetch(`${AGENT_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const data = await r.json();
        this.isOnline = true;
        this.serverInfo = data;
        console.log(`MediBuddy Agent online — ${data.diseases} diseases, ${data.symptoms} symptoms`);
        return true;
      }
    } catch (e) {
      this.isOnline = false;
    }
    return false;
  }

  async chat(message) {
    if (!this.isOnline) {
      const alive = await this.checkHealth();
      if (!alive) return { error: 'offline', reply: null };
    }
    try {
      const r = await fetch(`${AGENT_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId, message }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return { error: `http_${r.status}`, reply: null };
      return await r.json();
    } catch (e) {
      this.isOnline = false;
      return { error: 'network', reply: null };
    }
  }

  async predict(text) {
    try {
      const r = await fetch(`${AGENT_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(8000),
      });
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }

  async searchSymptoms(query) {
    try {
      const r = await fetch(`${AGENT_BASE}/symptoms?q=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(3000),
      });
      return r.ok ? (await r.json()).symptoms : [];
    } catch (e) { return []; }
  }

  async resetSession() {
    try {
      await fetch(`${AGENT_BASE}/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId }),
      });
    } catch (e) {}
    // New session ID
    this.sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('mediBuddy_session', this.sessionId);
  }
}

const agentAPI = new MediAgentAPI();
