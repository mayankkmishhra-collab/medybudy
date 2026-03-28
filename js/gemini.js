// ─── Gemini AI Integration ────────────────────────────────────────────────────
// Uses Gemini 1.5 Flash via REST — healthcare-focused system prompt

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const HEALTHCARE_SYSTEM_PROMPT = `You are MediBuddy, an expert AI medical assistant. Your role is to:

1. Collect patient symptoms, age, medical history, and duration of symptoms through natural conversation
2. Assess urgency level (Critical / High / Medium / Low) based on symptoms
3. Recommend appropriate medical specialists
4. Suggest general OTC (over-the-counter) medicines with minimal side effects when appropriate
5. Provide empathetic, clear, and professional medical guidance

STRICT RULES:
- Always respond in English
- Keep responses concise (2-4 sentences max per turn)
- NEVER diagnose definitively — always say "this may indicate" or "could suggest"
- ALWAYS include a safety disclaimer when suggesting medicines
- For ANY critical symptoms (chest pain, difficulty breathing, stroke signs, severe bleeding, loss of consciousness) — immediately tell the user to call emergency services (911/999/112)
- Never prescribe prescription medications
- Always recommend consulting a licensed physician for proper diagnosis
- Be warm, empathetic, and professional — like a caring doctor

RESPONSE FORMAT:
- Conversational, not clinical
- Use plain language
- Ask one follow-up question at a time
- After collecting symptoms, provide: urgency level, recommended specialist, and any safe OTC options`;

class GeminiAI {
  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
    this.conversationHistory = [];
    this.isConfigured = !!this.apiKey;
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('gemini_api_key', this.apiKey);
    this.isConfigured = !!this.apiKey;
    this.conversationHistory = [];
  }

  clearKey() {
    this.apiKey = '';
    localStorage.removeItem('gemini_api_key');
    this.isConfigured = false;
  }

  async chat(userMessage) {
    if (!this.isConfigured) {
      return { error: 'no_key', text: null };
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const body = {
      system_instruction: {
        parts: [{ text: HEALTHCARE_SYSTEM_PROMPT }]
      },
      contents: this.conversationHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ]
    };

    try {
      const res = await fetch(
        `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${res.status}`;
        if (res.status === 400 && msg.includes('API_KEY')) return { error: 'bad_key', text: null };
        if (res.status === 429) return { error: 'quota', text: null };
        return { error: 'api_error', text: null, detail: msg };
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) return { error: 'empty', text: null };

      // Add assistant reply to history
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text }]
      });

      // Keep history manageable (last 20 turns)
      if (this.conversationHistory.length > 40) {
        this.conversationHistory = this.conversationHistory.slice(-40);
      }

      return { error: null, text };

    } catch (e) {
      return { error: 'network', text: null, detail: e.message };
    }
  }

  reset() {
    this.conversationHistory = [];
  }
}

// Singleton
const geminiAI = new GeminiAI();
