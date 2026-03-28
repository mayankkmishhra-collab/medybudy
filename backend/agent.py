"""
MediBuddy Agent v2 — Health Companion + Disease Prediction + Remedies
Trained on 7 real medical datasets (4920+ samples, 132 symptoms, 41 diseases).

New in v2:
  - Medications per disease (from real dataset)
  - Diet recommendations per disease
  - Workout/lifestyle advice per disease
  - Home remedies knowledge base
  - Health companion mode (general wellness Q&A)
  - Empathetic, warm conversational tone
  - Symptom autocomplete endpoint
"""

import os, re, json, pickle, ast, warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import RandomForestClassifier, VotingClassifier, GradientBoostingClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

BASE   = os.path.dirname(__file__)
DATA   = os.path.join(BASE, "data", "raw")
MODELS = os.path.join(BASE, "models")
os.makedirs(MODELS, exist_ok=True)

app = Flask(__name__)
CORS(app, origins="*")

# ── Global state ──────────────────────────────────────────────────────────────
MODEL        = None
FEATURES     = []
LABEL_ENC    = None
DISEASES     = []
DESCRIPTIONS = {}   # disease → description string
PRECAUTIONS  = {}   # disease → [str]
MEDICATIONS  = {}   # disease → [str]
DIETS        = {}   # disease → [str]
WORKOUTS     = {}   # disease → [str]
SEVERITY     = {}   # symptom → int weight
SYMPTOM_ALIAS = {}  # natural phrase → canonical feature name
SESSIONS     = {}   # session_id → state dict

# ─────────────────────────────────────────────────────────────────────────────
# HOME REMEDIES KNOWLEDGE BASE (curated from medical literature)
# ─────────────────────────────────────────────────────────────────────────────
HOME_REMEDIES = {
    "headache": [
        "Apply a cold or warm compress to your forehead or neck",
        "Stay hydrated — drink 2–3 glasses of water",
        "Rest in a quiet, dark room for 20–30 minutes",
        "Gently massage your temples in circular motions",
        "Try peppermint oil on temples (diluted with carrier oil)",
        "Avoid screens and bright lights temporarily",
    ],
    "fever": [
        "Stay well hydrated — water, coconut water, or clear broths",
        "Rest and avoid strenuous activity",
        "Apply a cool damp cloth to forehead, wrists, and neck",
        "Wear light, breathable clothing",
        "Ginger tea with honey can help reduce mild fever",
        "Lukewarm (not cold) bath can help bring temperature down",
    ],
    "cough": [
        "Honey and warm water or honey-lemon tea soothes the throat",
        "Steam inhalation with a few drops of eucalyptus oil",
        "Gargle with warm salt water (1/2 tsp salt in 8 oz water)",
        "Stay hydrated to thin mucus",
        "Ginger tea with honey has natural anti-inflammatory properties",
        "Elevate your head while sleeping to reduce nighttime cough",
    ],
    "sore throat": [
        "Gargle with warm salt water every 2–3 hours",
        "Honey and lemon in warm water soothes irritation",
        "Suck on ice chips or cold popsicles for numbing relief",
        "Turmeric milk (golden milk) has anti-inflammatory properties",
        "Avoid cold drinks and spicy foods",
        "Licorice root tea can reduce throat inflammation",
    ],
    "cold": [
        "Chicken soup — genuinely helps reduce inflammation and congestion",
        "Steam inhalation clears nasal passages",
        "Zinc lozenges within 24 hours of symptoms may shorten duration",
        "Vitamin C (citrus fruits, bell peppers) supports immune function",
        "Elderberry syrup has shown antiviral properties in studies",
        "Rest is the most important remedy — your immune system needs energy",
    ],
    "nausea": [
        "Ginger — ginger tea, ginger ale, or ginger candies are effective",
        "Peppermint tea or peppermint oil aromatherapy",
        "Eat small, bland meals (crackers, toast, rice)",
        "Avoid strong smells and greasy or spicy foods",
        "Acupressure on the P6 point (inner wrist) can reduce nausea",
        "Stay upright for 30 minutes after eating",
    ],
    "stomach pain": [
        "Peppermint tea relaxes stomach muscles and reduces cramping",
        "Chamomile tea has anti-inflammatory and antispasmodic properties",
        "Apply a warm heating pad to your abdomen",
        "Eat small, easily digestible meals (bananas, rice, applesauce, toast)",
        "Avoid dairy, caffeine, and fatty foods temporarily",
        "Fennel seeds chewed after meals reduce bloating and gas",
    ],
    "diarrhea": [
        "BRAT diet: Bananas, Rice, Applesauce, Toast",
        "Stay hydrated with ORS (oral rehydration solution) or coconut water",
        "Probiotics (yogurt with live cultures) restore gut bacteria",
        "Avoid dairy, fatty foods, and high-fiber foods temporarily",
        "Ginger tea reduces intestinal inflammation",
        "Boiled rice water is a traditional remedy for loose stools",
    ],
    "constipation": [
        "Drink 8–10 glasses of water daily",
        "Prunes or prune juice — natural laxative effect",
        "Increase fiber: fruits, vegetables, whole grains",
        "Warm lemon water in the morning stimulates digestion",
        "Light exercise like walking stimulates bowel movement",
        "Flaxseeds added to food provide soluble and insoluble fiber",
    ],
    "back pain": [
        "Apply ice for first 48 hours, then switch to heat",
        "Gentle stretching — cat-cow, child's pose, knee-to-chest",
        "Maintain good posture when sitting — use lumbar support",
        "Sleep on your side with a pillow between knees",
        "Turmeric and ginger have natural anti-inflammatory properties",
        "Epsom salt bath relaxes muscles and reduces inflammation",
    ],
    "anxiety": [
        "Deep breathing: 4-7-8 technique (inhale 4s, hold 7s, exhale 8s)",
        "Progressive muscle relaxation — tense and release each muscle group",
        "Chamomile tea has mild anxiolytic properties",
        "Regular exercise releases endorphins and reduces cortisol",
        "Limit caffeine and alcohol which worsen anxiety",
        "Journaling helps process anxious thoughts",
        "Lavender aromatherapy has calming effects",
    ],
    "insomnia": [
        "Maintain a consistent sleep schedule — same time every day",
        "Avoid screens 1 hour before bed (blue light disrupts melatonin)",
        "Chamomile or valerian root tea before bed",
        "Keep bedroom cool, dark, and quiet",
        "Warm milk contains tryptophan which promotes sleep",
        "Progressive muscle relaxation or meditation before sleep",
        "Avoid caffeine after 2 PM",
    ],
    "fatigue": [
        "Ensure 7–9 hours of quality sleep",
        "Stay hydrated — even mild dehydration causes fatigue",
        "Eat iron-rich foods (spinach, lentils, red meat) if iron-deficient",
        "B12-rich foods (eggs, dairy, fish) support energy metabolism",
        "Short 20-minute naps can restore alertness",
        "Light exercise paradoxically increases energy levels",
        "Ashwagandha supplement has evidence for reducing fatigue",
    ],
    "skin rash": [
        "Apply cool, damp cloth to reduce itching and inflammation",
        "Aloe vera gel soothes and reduces redness",
        "Oatmeal bath (colloidal oatmeal) relieves itching",
        "Avoid scratching — it worsens inflammation and risks infection",
        "Calamine lotion for itchy rashes",
        "Identify and avoid the trigger (soap, detergent, food, plant)",
        "Coconut oil has antimicrobial and anti-inflammatory properties",
    ],
    "joint pain": [
        "Apply ice for acute pain, heat for chronic stiffness",
        "Turmeric with black pepper — curcumin is a potent anti-inflammatory",
        "Omega-3 fatty acids (fish oil, flaxseed) reduce joint inflammation",
        "Gentle range-of-motion exercises maintain flexibility",
        "Epsom salt bath reduces inflammation and muscle tension",
        "Maintain healthy weight to reduce joint load",
        "Ginger tea has anti-inflammatory properties similar to NSAIDs",
    ],
    "high blood pressure": [
        "DASH diet: fruits, vegetables, whole grains, low sodium",
        "Reduce sodium intake to under 2300mg/day",
        "Regular aerobic exercise (30 min/day, 5 days/week)",
        "Limit alcohol to 1 drink/day for women, 2 for men",
        "Manage stress through meditation, yoga, or deep breathing",
        "Hibiscus tea has shown modest blood pressure reduction in studies",
        "Garlic supplements may have mild antihypertensive effects",
    ],
    "diabetes": [
        "Monitor blood sugar regularly",
        "Low glycemic index foods: whole grains, legumes, non-starchy vegetables",
        "Cinnamon may improve insulin sensitivity (1/2 tsp daily)",
        "Regular exercise improves glucose uptake by muscles",
        "Stay hydrated — dehydration raises blood sugar",
        "Bitter melon (karela) juice is a traditional remedy for blood sugar",
        "Fenugreek seeds soaked overnight may help regulate blood sugar",
    ],
    "acidity": [
        "Eat smaller, more frequent meals",
        "Avoid lying down for 2–3 hours after eating",
        "Cold milk or yogurt provides immediate relief",
        "Banana neutralizes stomach acid",
        "Fennel seeds after meals reduce acid production",
        "Elevate head of bed by 6–8 inches",
        "Avoid trigger foods: spicy, fatty, citrus, coffee, alcohol",
    ],
    "migraine": [
        "Rest in a dark, quiet room at first sign of migraine",
        "Apply cold pack to forehead or neck",
        "Caffeine in small amounts can abort early migraines",
        "Magnesium supplement (400mg/day) reduces migraine frequency",
        "Riboflavin (B2) 400mg/day shown to reduce migraine frequency",
        "Identify and avoid triggers: certain foods, stress, sleep changes",
        "Peppermint oil on temples may reduce pain intensity",
    ],
    "urinary tract infection": [
        "Drink plenty of water to flush bacteria",
        "Unsweetened cranberry juice may prevent bacterial adhesion",
        "D-mannose supplement may help prevent recurrent UTIs",
        "Avoid irritants: caffeine, alcohol, spicy foods",
        "Urinate frequently — don't hold urine",
        "Probiotics help maintain healthy urinary tract flora",
        "Note: UTIs usually require antibiotics — see a doctor",
    ],
    "allergy": [
        "Identify and avoid your specific allergen triggers",
        "Local honey may help with seasonal pollen allergies",
        "Quercetin-rich foods (onions, apples) act as natural antihistamines",
        "Nasal saline rinse clears allergens from nasal passages",
        "HEPA air purifier reduces indoor allergens",
        "Shower after outdoor exposure to remove pollen",
        "Vitamin C has natural antihistamine properties",
    ],
    "cold and flu": [
        "Rest is the most important remedy",
        "Zinc lozenges within 24 hours may reduce duration",
        "Elderberry syrup has antiviral properties",
        "Chicken soup reduces inflammation and provides hydration",
        "Steam inhalation with eucalyptus oil clears congestion",
        "Vitamin D deficiency is linked to increased flu susceptibility",
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH COMPANION KNOWLEDGE BASE
# ─────────────────────────────────────────────────────────────────────────────
COMPANION_RESPONSES = {
    "greetings": [
        "Hello! I'm MediBuddy, your personal health companion. I'm here to listen, help assess your symptoms, and guide you toward feeling better. How are you doing today?",
        "Hi there! I'm MediBuddy. Whether you're feeling unwell or just want some health guidance, I'm here for you. What's on your mind?",
        "Hey! Good to see you. I'm your AI health companion — trained on real medical data to help you understand your symptoms and feel supported. How can I help?",
    ],
    "how_are_you": [
        "I'm doing great, thank you for asking! More importantly — how are *you* feeling? That's what I'm here for. 😊",
        "I'm always ready to help! But let's focus on you — how are you feeling today?",
    ],
    "wellness_tips": {
        "sleep": "Quality sleep is foundational to health. Aim for 7–9 hours, keep a consistent schedule, and avoid screens 1 hour before bed. Your body repairs itself during deep sleep.",
        "hydration": "Most adults need 8–10 glasses of water daily. Proper hydration improves energy, skin, digestion, and cognitive function. Start your morning with a glass of water.",
        "exercise": "Even 30 minutes of moderate exercise 5 days a week dramatically reduces risk of heart disease, diabetes, depression, and many cancers. Walking counts!",
        "stress": "Chronic stress is linked to heart disease, immune suppression, and mental health issues. Try 10 minutes of deep breathing, meditation, or journaling daily.",
        "nutrition": "Focus on whole foods: vegetables, fruits, lean proteins, whole grains, and healthy fats. Minimize ultra-processed foods, added sugars, and excess sodium.",
        "mental health": "Mental health is as important as physical health. Regular social connection, purpose, sleep, and exercise are the foundations of mental wellbeing.",
    },
    "emotional_support": [
        "I hear you, and I want you to know that reaching out is the right thing to do. Your health matters, and you deserve support.",
        "It sounds like you're going through a tough time. I'm here to help however I can — whether that's health guidance or just listening.",
        "Thank you for sharing that with me. Let's work through this together, one step at a time.",
        "You're doing the right thing by paying attention to how you feel. That self-awareness is the first step to getting better.",
    ],
    "disclaimer": "⚠️ I'm an AI health companion trained on real medical data. I can provide guidance and information, but I'm not a substitute for professional medical care. Always consult a licensed physician for diagnosis and treatment.",
}

# ─────────────────────────────────────────────────────────────────────────────
# URGENCY & SPECIALIST MAPS
# ─────────────────────────────────────────────────────────────────────────────
URGENCY_CRITICAL = {
    "Heart attack","Stroke","Paralysis (brain hemorrhage)","Pneumonia",
    "Dengue","Malaria","Typhoid","Hepatitis B","Hepatitis C","Hepatitis D",
    "Hepatitis E","AIDS",
}
URGENCY_HIGH = {
    "Diabetes","Hypertension","Bronchial Asthma","Tuberculosis","Jaundice",
    "Chronic cholestasis","Alcoholic hepatitis","Cervical spondylosis",
    "Migraine","Urinary tract infection","Kidney stones","Gallstones",
}
URGENCY_LOW = {
    "Common Cold","Allergy","Drug Reaction","Acne","Chicken pox",
    "Fungal infection","Impetigo",
}
URGENCY_ACTIONS = {
    "Critical": "🚨 Please go to the emergency room or call 911 / 999 / 112 immediately.",
    "High":     "⚠️ Please see a doctor within 24 hours.",
    "Medium":   "🔶 Schedule an appointment with a specialist this week.",
    "Low":      "✅ Monitor at home. Consult a doctor if symptoms worsen.",
}
SPECIALIST_MAP = {
    "Heart attack":"Cardiologist","Hypertension":"Cardiologist",
    "Diabetes":"Endocrinologist","Bronchial Asthma":"Pulmonologist",
    "Tuberculosis":"Pulmonologist","Pneumonia":"Pulmonologist",
    "Migraine":"Neurologist","Cervical spondylosis":"Neurologist",
    "Paralysis (brain hemorrhage)":"Neurologist","Stroke":"Neurologist",
    "Jaundice":"Gastroenterologist","Hepatitis B":"Gastroenterologist",
    "Hepatitis C":"Gastroenterologist","Hepatitis D":"Gastroenterologist",
    "Hepatitis E":"Gastroenterologist","Alcoholic hepatitis":"Gastroenterologist",
    "Chronic cholestasis":"Gastroenterologist","Gastroenteritis":"Gastroenterologist",
    "Peptic ulcer disease":"Gastroenterologist","GERD":"Gastroenterologist",
    "Urinary tract infection":"Urologist","Kidney stones":"Urologist",
    "Acne":"Dermatologist","Fungal infection":"Dermatologist",
    "Psoriasis":"Dermatologist","Impetigo":"Dermatologist",
    "Chicken pox":"Dermatologist","Allergy":"Allergist",
    "Drug Reaction":"Allergist","Arthritis":"Rheumatologist",
    "Osteoarthritis":"Orthopedist","AIDS":"Infectious Disease Specialist",
    "Malaria":"Infectious Disease Specialist","Dengue":"Infectious Disease Specialist",
    "Typhoid":"Infectious Disease Specialist","Varicose veins":"Vascular Surgeon",
    "Hypothyroidism":"Endocrinologist","Hyperthyroidism":"Endocrinologist",
    "Hypoglycemia":"Endocrinologist","Dimorphic hemmorhoids(piles)":"Proctologist",
}

# ─────────────────────────────────────────────────────────────────────────────
# DATA LOADING
# ─────────────────────────────────────────────────────────────────────────────
def clean_sym(s):
    if not isinstance(s, str): return ""
    return re.sub(r'\s+', '_', s.strip().lower().replace('-','_'))

def parse_list_field(val):
    """Parse a stringified Python list like "['item1', 'item2']" into a real list."""
    if not isinstance(val, str): return []
    val = val.strip()
    if val.startswith('['):
        try:
            return [str(x).strip().strip("'\"") for x in ast.literal_eval(val)]
        except Exception:
            pass
    return [val] if val else []

def load_data():
    global FEATURES, DISEASES, DESCRIPTIONS, PRECAUTIONS, MEDICATIONS, DIETS, WORKOUTS, SEVERITY, SYMPTOM_ALIAS

    # ── Training CSV (one-hot) ────────────────────────────────────────────────
    df = pd.read_csv(os.path.join(DATA, "Training.csv"))
    df.columns = [clean_sym(c) if c != 'prognosis' else 'prognosis' for c in df.columns]
    df = df.dropna(subset=['prognosis'])
    FEATURES = [c for c in df.columns if c != 'prognosis']
    DISEASES  = sorted(df['prognosis'].unique().tolist())

    # ── Descriptions ─────────────────────────────────────────────────────────
    for fname in ['description.csv', 'symptom_Description.csv']:
        path = os.path.join(DATA, fname)
        if os.path.exists(path):
            d = pd.read_csv(path)
            for _, row in d.iterrows():
                k = str(row.iloc[0]).strip()
                if k not in DESCRIPTIONS:
                    DESCRIPTIONS[k] = str(row.iloc[1]).strip()

    # ── Precautions ───────────────────────────────────────────────────────────
    for fname in ['precautions_df.csv', 'symptom_precaution.csv']:
        path = os.path.join(DATA, fname)
        if os.path.exists(path):
            d = pd.read_csv(path)
            for _, row in d.iterrows():
                disease = str(row.iloc[1] if 'Unnamed' in str(row.index[0]) else row.iloc[0]).strip()
                precs = [str(row.iloc[i]).strip() for i in range(1, len(row))
                         if pd.notna(row.iloc[i]) and str(row.iloc[i]).strip() not in ('nan','')]
                if disease not in PRECAUTIONS:
                    PRECAUTIONS[disease] = precs

    # ── Medications ───────────────────────────────────────────────────────────
    med_path = os.path.join(DATA, "medications.csv")
    if os.path.exists(med_path):
        d = pd.read_csv(med_path)
        for _, row in d.iterrows():
            MEDICATIONS[str(row.iloc[0]).strip()] = parse_list_field(str(row.iloc[1]))

    # ── Diets ─────────────────────────────────────────────────────────────────
    diet_path = os.path.join(DATA, "diets.csv")
    if os.path.exists(diet_path):
        d = pd.read_csv(diet_path)
        for _, row in d.iterrows():
            DIETS[str(row.iloc[0]).strip()] = parse_list_field(str(row.iloc[1]))

    # ── Workouts ──────────────────────────────────────────────────────────────
    work_path = os.path.join(DATA, "workout_df.csv")
    if os.path.exists(work_path):
        d = pd.read_csv(work_path)
        for _, row in d.iterrows():
            disease = str(row['disease']).strip() if 'disease' in d.columns else str(row.iloc[2]).strip()
            workout = str(row['workout']).strip() if 'workout' in d.columns else str(row.iloc[3]).strip()
            if disease not in WORKOUTS:
                WORKOUTS[disease] = []
            if workout and workout != 'nan':
                WORKOUTS[disease].append(workout)

    # ── Severity ──────────────────────────────────────────────────────────────
    sev_path = os.path.join(DATA, "Symptom-severity.csv")
    if os.path.exists(sev_path):
        d = pd.read_csv(sev_path)
        for _, row in d.iterrows():
            SEVERITY[clean_sym(str(row.iloc[0]))] = int(row.iloc[1]) if pd.notna(row.iloc[1]) else 1

    # ── Symptom aliases ───────────────────────────────────────────────────────
    for feat in FEATURES:
        readable = feat.replace('_', ' ')
        SYMPTOM_ALIAS[readable] = feat
        SYMPTOM_ALIAS[feat] = feat

    SYMPTOM_ALIAS.update({
        "fever":"high_fever","temperature":"high_fever","hot":"high_fever","burning up":"high_fever",
        "cough":"cough","dry cough":"cough","wet cough":"cough","persistent cough":"cough",
        "cold":"runny_nose","runny nose":"runny_nose","stuffy nose":"congestion","blocked nose":"congestion",
        "headache":"headache","head pain":"headache","migraine":"headache","head hurts":"headache",
        "stomach ache":"stomach_pain","tummy ache":"stomach_pain","belly pain":"belly_pain",
        "vomit":"vomiting","throwing up":"vomiting","puking":"vomiting",
        "nausea":"nausea","feel sick":"nausea","queasy":"nausea",
        "tired":"fatigue","exhausted":"fatigue","weakness":"fatigue","no energy":"fatigue","lethargic":"lethargy",
        "chest pain":"chest_pain","heart pain":"chest_pain","chest tightness":"chest_pain",
        "breathless":"breathlessness","short of breath":"breathlessness","can't breathe":"breathlessness",
        "dizzy":"dizziness","vertigo":"dizziness","spinning":"spinning_movements","lightheaded":"dizziness",
        "rash":"skin_rash","skin rash":"skin_rash","itchy skin":"itching","itch":"itching","itchy":"itching",
        "joint pain":"joint_pain","knee pain":"knee_pain","hip pain":"hip_joint_pain",
        "back pain":"back_pain","lower back pain":"back_pain","backache":"back_pain",
        "sore throat":"throat_irritation","throat pain":"throat_irritation","throat hurts":"throat_irritation",
        "anxiety":"anxiety","nervous":"anxiety","panic":"anxiety","stressed":"anxiety",
        "depression":"depression","sad":"depression","low mood":"depression","hopeless":"depression",
        "insomnia":"restlessness","can't sleep":"restlessness","sleep problems":"restlessness",
        "diarrhea":"diarrhoea","loose stool":"diarrhoea","loose motions":"diarrhoea","runs":"diarrhoea",
        "constipation":"constipation","can't poop":"constipation","hard stool":"constipation",
        "bloating":"passage_of_gases","gas":"passage_of_gases","flatulence":"passage_of_gases",
        "yellow eyes":"yellowing_of_eyes","jaundice":"yellowish_skin","yellow skin":"yellowish_skin",
        "swollen":"swelling_joints","swelling":"swelling_joints","puffy":"swelling_joints",
        "muscle pain":"muscle_pain","body ache":"muscle_pain","myalgia":"muscle_pain","sore muscles":"muscle_pain",
        "neck pain":"neck_pain","stiff neck":"stiff_neck","neck stiffness":"stiff_neck",
        "blurred vision":"blurred_and_distorted_vision","vision problems":"blurred_and_distorted_vision",
        "weight loss":"weight_loss","losing weight":"weight_loss",
        "weight gain":"weight_gain","gaining weight":"weight_gain",
        "palpitation":"palpitations","heart racing":"fast_heart_rate","fast heartbeat":"fast_heart_rate",
        "dark urine":"dark_urine","brown urine":"dark_urine",
        "frequent urination":"polyuria","peeing a lot":"polyuria",
        "excessive thirst":"excessive_hunger","always thirsty":"excessive_hunger",
        "skin peeling":"skin_peeling","peeling skin":"skin_peeling",
        "hair loss":"brittle_nails","nail problems":"brittle_nails",
        "eye pain":"redness_of_eyes","red eyes":"redness_of_eyes","watery eyes":"watering_from_eyes",
        "sneezing":"continuous_sneezing","sneeze":"continuous_sneezing",
        "chills":"chills","shivering":"shivering","cold sweats":"sweating",
        "sweating":"sweating","night sweats":"sweating",
        "loss of appetite":"loss_of_appetite","not hungry":"loss_of_appetite","no appetite":"loss_of_appetite",
        "indigestion":"indigestion","heartburn":"acidity","acid reflux":"acidity",
        "abdominal pain":"abdominal_pain","stomach cramps":"abdominal_pain",
        "high blood pressure":"high_fever","hypertension":"high_fever",
        "acne":"pus_filled_pimples","pimples":"pus_filled_pimples","blackheads":"blackheads",
        "burning urination":"burning_micturition","painful urination":"burning_micturition",
        "memory loss":"lack_of_concentration","forgetful":"lack_of_concentration","brain fog":"lack_of_concentration",
        "numbness":"numbness","tingling":"drying_and_tingling_lips","pins and needles":"numbness",
        "confusion":"altered_sensorium","disoriented":"altered_sensorium",
        "mood swings":"mood_swings","irritable":"irritability","irritability":"irritability",
    })

    print(f"  ✓ {len(df)} training samples | {len(FEATURES)} symptoms | {len(DISEASES)} diseases")
    print(f"  ✓ Medications: {len(MEDICATIONS)} | Diets: {len(DIETS)} | Workouts: {len(WORKOUTS)}")
    print(f"  ✓ Descriptions: {len(DESCRIPTIONS)} | Precautions: {len(PRECAUTIONS)}")
    return df

# ─────────────────────────────────────────────────────────────────────────────
# MODEL TRAINING — Ensemble (RF + GBM)
# ─────────────────────────────────────────────────────────────────────────────
def train_model(df):
    global MODEL, LABEL_ENC
    model_path = os.path.join(MODELS, "mediAI_v2.pkl")
    enc_path   = os.path.join(MODELS, "label_enc_v2.pkl")

    if os.path.exists(model_path) and os.path.exists(enc_path):
        print("  ✓ Loading cached model...")
        with open(model_path,"rb") as f: MODEL = pickle.load(f)
        with open(enc_path,  "rb") as f: LABEL_ENC = pickle.load(f)
        return

    print("  ⚙ Training ensemble model (RF + GBM) on real dataset...")
    X = df[FEATURES].fillna(0).values
    y = df['prognosis'].values
    LABEL_ENC = LabelEncoder()
    y_enc = LABEL_ENC.fit_transform(y)
    X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.15, random_state=42, stratify=y_enc)

    rf  = RandomForestClassifier(n_estimators=300, max_depth=None, min_samples_split=2, random_state=42, n_jobs=-1)
    gbm = GradientBoostingClassifier(n_estimators=150, learning_rate=0.1, max_depth=5, random_state=42)

    MODEL = VotingClassifier(estimators=[('rf', rf), ('gbm', gbm)], voting='soft', n_jobs=-1)
    MODEL.fit(X_train, y_train)

    acc = accuracy_score(y_test, MODEL.predict(X_test))
    print(f"  ✓ Ensemble trained — accuracy: {acc*100:.1f}%")

    with open(model_path,"wb") as f: pickle.dump(MODEL, f)
    with open(enc_path,  "wb") as f: pickle.dump(LABEL_ENC, f)

# ─────────────────────────────────────────────────────────────────────────────
# SYMPTOM EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────
def extract_symptoms(text):
    text_lower = text.lower()
    found = set()
    for alias in sorted(SYMPTOM_ALIAS.keys(), key=len, reverse=True):
        if alias in text_lower:
            canonical = SYMPTOM_ALIAS[alias]
            if canonical in FEATURES:
                found.add(canonical)
    for feat in FEATURES:
        if feat.replace('_',' ') in text_lower and feat not in found:
            found.add(feat)
    return list(found)

def build_vector(symptoms):
    vec = np.zeros(len(FEATURES))
    for s in symptoms:
        if s in FEATURES:
            vec[FEATURES.index(s)] = 1
    return vec

# ─────────────────────────────────────────────────────────────────────────────
# PREDICTION
# ─────────────────────────────────────────────────────────────────────────────
def get_urgency(d):
    if d in URGENCY_CRITICAL: return "Critical"
    if d in URGENCY_HIGH:     return "High"
    if d in URGENCY_LOW:      return "Low"
    return "Medium"

def predict_disease(symptoms):
    if not symptoms or MODEL is None: return []
    vec = build_vector(symptoms).reshape(1,-1)
    proba = MODEL.predict_proba(vec)[0]
    top = np.argsort(proba)[::-1][:3]
    results = []
    for idx in top:
        if proba[idx] < 0.01: continue
        disease = LABEL_ENC.inverse_transform([idx])[0]
        results.append({
            "disease":     disease,
            "confidence":  round(float(proba[idx])*100, 1),
            "urgency":     get_urgency(disease),
            "specialist":  SPECIALIST_MAP.get(disease, "General Practitioner"),
            "description": DESCRIPTIONS.get(disease, ""),
            "precautions": PRECAUTIONS.get(disease, []),
            "medications": MEDICATIONS.get(disease, []),
            "diets":       DIETS.get(disease, []),
            "workouts":    WORKOUTS.get(disease, [])[:5],
        })
    return results

# ─────────────────────────────────────────────────────────────────────────────
# COMPANION INTENT DETECTION
# ─────────────────────────────────────────────────────────────────────────────
INTENT_PATTERNS = {
    "greeting":       r'\b(hi|hello|hey|good morning|good evening|good afternoon|howdy|greetings)\b',
    "how_are_you":    r'\b(how are you|how do you do|how\'s it going|you okay)\b',
    "thanks":         r'\b(thank|thanks|thank you|thx|ty|appreciate)\b',
    "bye":            r'\b(bye|goodbye|see you|take care|cya|later)\b',
    "wellness_sleep": r'\b(sleep|insomnia|tired|rest|fatigue|exhausted|can\'t sleep)\b',
    "wellness_stress":r'\b(stress|anxiety|anxious|worried|panic|nervous|overwhelmed)\b',
    "wellness_diet":  r'\b(diet|nutrition|eat|food|weight|healthy eating|what to eat)\b',
    "wellness_exercise":r'\b(exercise|workout|fitness|gym|walk|run|physical activity)\b',
    "remedy":         r'\b(remedy|home remedy|natural|cure|treat at home|what can i do|relief|help with)\b',
    "emergency":      r'\b(chest pain|heart attack|stroke|can\'t breathe|unconscious|severe bleeding|seizure|dying|emergency|911|999|112)\b',
    "mental_health":  r'\b(depressed|depression|sad|hopeless|suicidal|self harm|mental health|feeling down|lonely)\b',
    "general_health": r'\b(healthy|wellness|tips|advice|lifestyle|prevent|prevention|immune|boost)\b',
}

def detect_intent(text):
    text_lower = text.lower()
    for intent, pattern in INTENT_PATTERNS.items():
        if re.search(pattern, text_lower):
            return intent
    return "symptom_query"

def get_home_remedy(text):
    """Find the best matching home remedy category."""
    text_lower = text.lower()
    best_match = None
    best_count = 0
    for condition, remedies in HOME_REMEDIES.items():
        words = condition.replace(' ','_').split('_')
        count = sum(1 for w in words if w in text_lower)
        if count > best_count:
            best_count = count
            best_match = condition
    # Also check symptom aliases
    for alias, canonical in SYMPTOM_ALIAS.items():
        if alias in text_lower:
            readable = canonical.replace('_',' ')
            if readable in HOME_REMEDIES:
                return HOME_REMEDIES[readable]
    return HOME_REMEDIES.get(best_match, []) if best_match else []

# ─────────────────────────────────────────────────────────────────────────────
# CONVERSATIONAL AGENT
# ─────────────────────────────────────────────────────────────────────────────
import random

def agent_reply(session_id, user_message):
    if session_id not in SESSIONS:
        SESSIONS[session_id] = {
            "stage": "greeting", "name": "", "age": 0,
            "symptoms_text": "", "extracted_symptoms": [],
            "predictions": [], "turn": 0, "mood": "neutral",
        }

    s = SESSIONS[session_id]
    s["turn"] += 1
    msg = user_message.strip()
    msg_lower = msg.lower()
    intent = detect_intent(msg)

    # ── Emergency override (always first) ────────────────────────────────────
    if intent == "emergency":
        return _r("🚨 **This sounds like a medical emergency.** Please call emergency services immediately — **911** (US), **999** (UK), or **112** (EU). Do not wait. Go to the nearest emergency room now.", s, "emergency")

    # ── Mental health support ─────────────────────────────────────────────────
    if intent == "mental_health":
        if any(w in msg_lower for w in ["suicidal","self harm","kill myself","end my life"]):
            return _r("I'm really concerned about what you've shared. Please reach out to a crisis helpline immediately:\n\n🇺🇸 **US:** 988 Suicide & Crisis Lifeline — call or text **988**\n🇬🇧 **UK:** Samaritans — **116 123**\n🌍 **International:** findahelpline.com\n\nYou matter, and help is available right now.", s, "crisis")
        return _r(random.choice(COMPANION_RESPONSES["emotional_support"]) + "\n\nIf you're feeling persistently low, anxious, or overwhelmed, speaking with a mental health professional can make a real difference. Would you like me to help you find a psychiatrist or therapist?", s, s["stage"])

    # ── Greeting ──────────────────────────────────────────────────────────────
    if intent == "greeting" and s["stage"] == "greeting":
        s["stage"] = "name"
        return _r(random.choice(COMPANION_RESPONSES["greetings"]) + "\n\nFirst, what's your name?", s, "name")

    # ── How are you ───────────────────────────────────────────────────────────
    if intent == "how_are_you":
        return _r(random.choice(COMPANION_RESPONSES["how_are_you"]), s, s["stage"])

    # ── Thanks ────────────────────────────────────────────────────────────────
    if intent == "thanks":
        return _r(f"You're very welcome{', ' + s['name'] if s['name'] else ''}! 😊 I'm always here if you need anything else. Take care of yourself!", s, s["stage"])

    # ── Bye ───────────────────────────────────────────────────────────────────
    if intent == "bye":
        return _r(f"Take care{', ' + s['name'] if s['name'] else ''}! Remember — if symptoms worsen, don't hesitate to seek medical care. Wishing you good health! 💙", s, "done")

    # ── Home remedy request ───────────────────────────────────────────────────
    if intent == "remedy":
        remedies = get_home_remedy(msg)
        if remedies:
            remedy_text = "\n".join(f"• {r}" for r in remedies[:6])
            return _r(
                f"Here are some evidence-based home remedies that may help:\n\n{remedy_text}\n\n"
                f"⚠️ *These are general wellness tips. If symptoms are severe or persist, please consult a doctor.*",
                s, s["stage"]
            )
        # Fall through to symptom extraction

    # ── Wellness tips ─────────────────────────────────────────────────────────
    if intent == "wellness_sleep":
        return _r("**Sleep Tips:**\n\n" + COMPANION_RESPONSES["wellness_tips"]["sleep"] + "\n\nAre you experiencing sleep problems? Tell me more and I can help assess if there's an underlying cause.", s, s["stage"])
    if intent == "wellness_stress":
        return _r("**Stress & Anxiety:**\n\n" + COMPANION_RESPONSES["wellness_tips"]["stress"] + "\n\nWould you like me to assess your symptoms more thoroughly?", s, s["stage"])
    if intent == "wellness_diet":
        return _r("**Nutrition Guidance:**\n\n" + COMPANION_RESPONSES["wellness_tips"]["nutrition"] + "\n\nIf you have a specific condition, I can give you tailored dietary advice.", s, s["stage"])
    if intent == "wellness_exercise":
        return _r("**Exercise & Fitness:**\n\n" + COMPANION_RESPONSES["wellness_tips"]["exercise"] + "\n\nIf you have a health condition, I can recommend specific exercises that are safe for you.", s, s["stage"])
    if intent == "general_health":
        tips = "\n".join([f"• **{k.title()}:** {v[:100]}..." for k,v in list(COMPANION_RESPONSES["wellness_tips"].items())[:4]])
        return _r(f"Here are some key pillars of good health:\n\n{tips}\n\nWould you like to dive deeper into any of these, or do you have specific symptoms you'd like me to assess?", s, s["stage"])

    # ── Stage machine ─────────────────────────────────────────────────────────
    if s["stage"] == "greeting":
        s["stage"] = "name"
        return _r(random.choice(COMPANION_RESPONSES["greetings"]) + "\n\nWhat's your name?", s, "name")

    if s["stage"] == "name":
        s["name"] = msg.split()[0].capitalize() if msg else "Friend"
        s["stage"] = "age"
        return _r(f"Nice to meet you, **{s['name']}**! 😊 To give you the most accurate assessment, could you tell me your age?", s, "age")

    if s["stage"] == "age":
        age_m = re.search(r'\b(\d{1,3})\b', msg)
        if age_m:
            s["age"] = int(age_m.group(1))
            s["stage"] = "symptoms"
            return _r(f"Got it, {s['name']}. Now, please describe what you're experiencing — your symptoms, how long you've had them, and anything else that feels relevant. The more detail, the better I can help.", s, "symptoms")
        return _r("I didn't catch your age. Could you tell me how old you are? (e.g., 28)", s, "age")

    if s["stage"] == "symptoms":
        s["symptoms_text"] += " " + msg
        extracted = extract_symptoms(s["symptoms_text"])
        s["extracted_symptoms"] = extracted

        # Check for home remedy request within symptoms stage
        remedies = get_home_remedy(msg)

        if len(extracted) == 0:
            remedy_hint = ""
            if remedies:
                remedy_hint = "\n\nIn the meantime, here are some general tips:\n" + "\n".join(f"• {r}" for r in remedies[:3])
            return _r(
                f"I want to make sure I understand you correctly, {s['name']}. Could you describe your symptoms more specifically? "
                f"For example: 'I have a headache, fever, and fatigue' or 'I feel chest pain and shortness of breath'.{remedy_hint}",
                s, "symptoms"
            )

        if len(extracted) < 2 and s["turn"] < 5:
            sym_readable = extracted[0].replace('_',' ') if extracted else "your symptom"
            remedy_hint = ""
            if remedies:
                remedy_hint = "\n\n**Quick tip while we gather more info:**\n" + "\n".join(f"• {r}" for r in remedies[:2])
            return _r(
                f"I've noted **{sym_readable}**. Are you experiencing any other symptoms? "
                f"The more you describe, the more accurate my assessment will be.{remedy_hint}",
                s, "symptoms"
            )

        s["stage"] = "analysis"
        predictions = predict_disease(extracted)
        s["predictions"] = predictions
        return _build_full_reply(s, extracted, predictions)

    if s["stage"] == "analysis":
        s["symptoms_text"] += " " + msg
        new_extracted = extract_symptoms(s["symptoms_text"])
        if len(new_extracted) > len(s["extracted_symptoms"]):
            s["extracted_symptoms"] = new_extracted
            predictions = predict_disease(new_extracted)
            s["predictions"] = predictions
            return _build_full_reply(s, new_extracted, predictions)
        s["stage"] = "followup"
        return _r(f"Do you have any existing medical conditions or are you currently taking any medications, {s['name']}? This helps me refine the assessment.", s, "followup")

    if s["stage"] == "followup":
        if s["predictions"]:
            top = s["predictions"][0]
            disease = top["disease"]
            precs = top["precautions"]
            meds = top["medications"]
            diets = top["diets"]
            workouts = top["workouts"]

            parts = [f"Based on everything you've shared, here's my complete guidance for **{disease}**:\n"]
            if precs:
                parts.append("**Precautions:**\n" + "\n".join(f"• {p}" for p in precs[:4]))
            if meds:
                parts.append("\n**Medications** *(consult your doctor before taking)*:\n" + "\n".join(f"• {m}" for m in meds[:4]))
            if diets:
                parts.append("\n**Recommended Diet:**\n" + "\n".join(f"• {d}" for d in diets[:4]))
            if workouts:
                parts.append("\n**Lifestyle & Exercise:**\n" + "\n".join(f"• {w}" for w in workouts[:3]))

            # Add home remedies
            remedies = get_home_remedy(disease.lower())
            if remedies:
                parts.append("\n**Home Remedies** *(for immediate relief)*:\n" + "\n".join(f"• {r}" for r in remedies[:3]))

            parts.append(f"\n**Next step:** {URGENCY_ACTIONS.get(top['urgency'], 'Consult a doctor.')}")
            parts.append(f"\nWould you like to schedule a video call with Dr. Aria, or book an appointment with a **{top['specialist']}**?")
            parts.append("\n⚠️ *AI assessment based on real medical data — not a diagnosis. Always consult a licensed physician.*")
        else:
            parts = ["I recommend consulting a General Practitioner for a thorough evaluation. Would you like to schedule a consultation?"]

        s["stage"] = "done"
        return _r("\n".join(parts), s, "done")

    # ── Done / open Q&A ───────────────────────────────────────────────────────
    s["symptoms_text"] += " " + msg
    new_extracted = extract_symptoms(s["symptoms_text"])
    if new_extracted:
        s["extracted_symptoms"] = list(set(s["extracted_symptoms"] + new_extracted))
        predictions = predict_disease(s["extracted_symptoms"])
        s["predictions"] = predictions
        return _build_full_reply(s, s["extracted_symptoms"], predictions)

    # General companion response
    remedies = get_home_remedy(msg)
    if remedies:
        return _r("Here are some tips that may help:\n\n" + "\n".join(f"• {r}" for r in remedies[:5]) + "\n\n⚠️ *If symptoms persist or worsen, please consult a doctor.*", s, "done")

    return _r(
        f"I'm here for you, {s['name']}! 💙 You can describe new symptoms, ask about home remedies, request wellness tips, or I can help you schedule a consultation with a specialist.",
        s, "done"
    )

def _r(text, session, stage=None):
    if stage: session["stage"] = stage
    return {"reply": text, "stage": session["stage"], "symptoms": session.get("extracted_symptoms",[]), "predictions": session.get("predictions",[])}

def _build_full_reply(s, extracted, predictions):
    sym_list = ", ".join(sym.replace('_',' ') for sym in extracted[:8])
    name = s.get("name","")

    if not predictions:
        return _r(f"I've identified these symptoms: **{sym_list}**.\n\nI wasn't able to find a strong match in my dataset. Please consult a General Practitioner for a proper evaluation.", s)

    top = predictions[0]
    disease = top["disease"]
    conf    = top["confidence"]
    urgency = top["urgency"]
    spec    = top["specialist"]
    desc    = top["description"]
    action  = URGENCY_ACTIONS.get(urgency, "Consult a doctor.")
    meds    = top["medications"]
    diets   = top["diets"]
    workouts= top["workouts"]
    precs   = top["precautions"]

    parts = [f"{'Based on your symptoms' if not name else f'Based on your symptoms, {name}'} (**{sym_list}**), here's my assessment:\n"]
    parts.append(f"**Most likely condition:** {disease} ({conf:.0f}% confidence)")

    if len(predictions) > 1:
        others = ", ".join(f"{p['disease']} ({p['confidence']:.0f}%)" for p in predictions[1:])
        parts.append(f"**Other possibilities:** {others}")

    parts += [f"\n**Urgency:** {urgency}", f"**Recommended specialist:** {spec}", f"**Action:** {action}"]

    if desc:
        parts.append(f"\n**About {disease}:** {desc[:180]}{'...' if len(desc)>180 else ''}")

    if meds:
        parts.append("\n**Medications** *(consult your doctor)*: " + ", ".join(meds[:3]))

    if diets:
        parts.append("**Diet recommendations:** " + ", ".join(diets[:3]))

    if workouts:
        parts.append("**Lifestyle advice:** " + "; ".join(workouts[:2]))

    # Home remedies for immediate relief
    remedies = get_home_remedy(disease.lower())
    if not remedies:
        remedies = get_home_remedy(sym_list)
    if remedies:
        parts.append("\n**Home remedies for immediate relief:**\n" + "\n".join(f"• {r}" for r in remedies[:3]))

    if precs:
        parts.append("\n**Precautions:**\n" + "\n".join(f"• {p}" for p in precs[:3]))

    parts.append("\n⚠️ *AI assessment based on real medical data — not a diagnosis. Always consult a licensed physician.*")

    return {"reply": "\n".join(parts), "stage": s["stage"], "symptoms": extracted, "predictions": predictions}

# ─────────────────────────────────────────────────────────────────────────────
# FLASK ROUTES
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status":"ok","model":"RF+GBM Ensemble","diseases":len(DISEASES),"symptoms":len(FEATURES),"medications":len(MEDICATIONS),"diets":len(DIETS),"workouts":len(WORKOUTS),"home_remedies":len(HOME_REMEDIES)})

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    sid  = data.get("session_id","default")
    msg  = data.get("message","").strip()
    if not msg: return jsonify({"error":"message required"}), 400
    return jsonify(agent_reply(sid, msg))

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    text = data.get("text","")
    syms = data.get("symptoms",[])
    if text:
        symptoms = extract_symptoms(text)
    elif isinstance(syms, list):
        symptoms = [clean_sym(s) for s in syms if s]
    else:
        return jsonify({"error":"provide text or symptoms"}), 400
    return jsonify({"extracted_symptoms":symptoms,"predictions":predict_disease(symptoms)})

@app.route("/api/symptoms", methods=["GET"])
def get_symptoms():
    q = request.args.get("q","").lower()
    syms = [f.replace('_',' ') for f in FEATURES]
    if q: syms = [s for s in syms if q in s]
    return jsonify({"symptoms":syms[:50]})

@app.route("/api/diseases", methods=["GET"])
def get_diseases():
    return jsonify({"diseases":DISEASES})

@app.route("/api/remedy", methods=["POST"])
def remedy():
    data = request.get_json(silent=True) or {}
    text = data.get("text","")
    remedies = get_home_remedy(text)
    return jsonify({"remedies":remedies,"condition":text})

@app.route("/api/disease-info", methods=["GET"])
def disease_info():
    disease = request.args.get("disease","").strip()
    return jsonify({
        "disease":     disease,
        "description": DESCRIPTIONS.get(disease,""),
        "precautions": PRECAUTIONS.get(disease,[]),
        "medications": MEDICATIONS.get(disease,[]),
        "diets":       DIETS.get(disease,[]),
        "workouts":    WORKOUTS.get(disease,[]),
        "urgency":     get_urgency(disease),
        "specialist":  SPECIALIST_MAP.get(disease,"General Practitioner"),
    })

@app.route("/api/session/reset", methods=["POST"])
def reset_session():
    data = request.get_json(silent=True) or {}
    sid = data.get("session_id","default")
    if sid in SESSIONS: del SESSIONS[sid]
    return jsonify({"status":"reset"})

# ─────────────────────────────────────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────────────────────────────────────
def init():
    print("MediBuddy Agent v2 starting...")
    print("  Loading datasets...")
    df = load_data()
    print("  Training / loading model...")
    train_model(df)
    print(f"  ✓ Ready — {len(DISEASES)} diseases | {len(FEATURES)} symptoms | {len(HOME_REMEDIES)} remedy categories")

if __name__ == "__main__":
    init()
    app.run(host="0.0.0.0", port=5000, debug=False)
