# MediBuddy — AI-Powered Health Assistant

MediBuddy is an intelligent medical assistant web app that combines a trained ML model, Google Gemini AI, and a conversational chatbot to help users assess symptoms, get urgency triage, find the right specialist, and consult with an AI doctor via video call.

> ⚠️ **Disclaimer:** MediBuddy is for informational purposes only. It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.

---

## Features

- **AI Symptom Chat** — Conversational chatbot that collects symptoms via text, voice, or image
- **Disease Prediction** — ML model trained on 4920+ samples across 41 diseases and 132 symptoms
- **Urgency Triage** — Classifies severity as Critical, High, Medium, or Low
- **Specialist Matching** — Recommends the right specialist from 12+ medical specialties
- **Dr. Aria (AI Doctor)** — Interactive AI video consultation with voice interaction
- **Medicine Suggestions** — OTC medication recommendations with dosage guidance
- **Patient Dashboard** — Health history, vitals, appointments, and AI reports
- **Doctor Dashboard** — Patient queue, schedule, AI insights, and case analytics
- **Gemini AI Integration** — Optional Google Gemini 1.5 Flash for enhanced conversations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Python, Flask, Flask-CORS |
| ML Model | scikit-learn (Random Forest + Voting Classifier) |
| AI Integration | Google Gemini 1.5 Flash API |
| Data | 7 real medical datasets (CSV) |

---

## Project Structure

```
medical-ai-chatbot/
├── index.html                  # Landing page
├── assets/
│   └── logo.png                # MediBuddy logo
├── pages/
│   ├── chat.html               # AI chatbot interface
│   ├── patient-dashboard.html  # Patient health dashboard
│   ├── doctor-dashboard.html   # Doctor management dashboard
│   └── video-call.html         # Dr. Aria AI video consultation
├── js/
│   ├── app.js                  # Theme, modals, shared utilities
│   ├── chatbot.js              # Chatbot logic (agent + Gemini + rule-based)
│   ├── agent-api.js            # Python backend API client
│   ├── gemini.js               # Google Gemini AI integration
│   ├── urgency.js              # Urgency triage engine
│   ├── specialist.js           # Specialist recommendation engine
│   ├── medicine.js             # OTC medicine suggestions
│   ├── scheduler.js            # Appointment scheduling
│   └── ai-doctor.js            # Dr. Aria video call logic
├── styles/
│   ├── main.css                # Core styles and design system
│   └── animations.css          # Animations and transitions
└── backend/
    ├── agent.py                # Flask API + ML model + chatbot logic
    ├── test_agent.py           # Backend tests
    ├── models/
    │   ├── mediAI_v2.pkl       # Trained ML model
    │   └── label_enc_v2.pkl    # Label encoder
    └── data/
        └── raw/                # 7 medical datasets (CSV)
```

---

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### 1. Install backend dependencies

```bash
pip install flask flask-cors scikit-learn pandas numpy
```

### 2. Start the backend

```bash
cd medical-ai-chatbot/backend
python agent.py
```

The Flask API will start at `http://localhost:5000`.

### 3. Start the frontend

```bash
cd medical-ai-chatbot
python -m http.server 8080
```

Open `http://localhost:8080` in your browser.

---

## Gemini AI Setup (Optional)

To enable enhanced AI conversations powered by Google Gemini:

1. Get a free API key at [aistudio.google.com](https://aistudio.google.com/app/apikey)
2. Open the chatbot page and click **⚙ Set API Key**
3. Enter your key (starts with `AIza`) and click **Connect Gemini**

Your key is stored only in your browser's `localStorage` and sent directly to Google's API.

---

## ML Model Details

- **Algorithm:** Voting Classifier (Random Forest + Gradient Boosting + Naive Bayes)
- **Training data:** 4920+ samples
- **Diseases covered:** 41
- **Symptoms tracked:** 132
- **Datasets used:** Training.csv, Testing.csv, symptom_Description.csv, symptom_precaution.csv, medications.csv, diets.csv, workout_df.csv

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health check |
| POST | `/chat` | Send message to AI agent |
| POST | `/predict` | Predict disease from symptoms |
| GET | `/symptoms` | List all known symptoms |
| GET | `/diseases` | List all known diseases |
| POST | `/remedy` | Get home remedy suggestions |
| GET | `/disease-info` | Get disease details |
| POST | `/reset` | Reset chat session |

---

## License

This project is for educational and demonstration purposes only.
