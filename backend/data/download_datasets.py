"""
Download real medical datasets from verified public GitHub sources.

Sources (all public domain / open license):
  - sarthak25/Disease-Prediction-from-Symptoms  (Training.csv)
  - amMistic/Diseases-Prediction-based-on-Symptoms (descriptions, precautions, severity)
  - SayamAlt/Symptoms-Disease-Text-Classification (Symptom2Disease NLP dataset)
"""

import os, requests

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")
os.makedirs(RAW_DIR, exist_ok=True)

DATASETS = {
    "Training.csv": "https://raw.githubusercontent.com/sarthak25/Disease-Prediction-from-Symptoms/refs/heads/master/Training.csv",
    "Testing.csv":  "https://raw.githubusercontent.com/sarthak25/Disease-Prediction-from-Symptoms/refs/heads/master/Testing.csv",
    "symptom_Description.csv":  "https://raw.githubusercontent.com/amMistic/Diseases-Prediction-based-on-Symptoms/refs/heads/main/Dataset/symptom_Description.csv",
    "symptom_precaution.csv":   "https://raw.githubusercontent.com/amMistic/Diseases-Prediction-based-on-Symptoms/refs/heads/main/Dataset/symptom_precaution.csv",
    "Symptom-severity.csv":     "https://raw.githubusercontent.com/amMistic/Diseases-Prediction-based-on-Symptoms/refs/heads/main/Dataset/Symptom-severity.csv",
    "dataset_ammistic.csv":     "https://raw.githubusercontent.com/amMistic/Diseases-Prediction-based-on-Symptoms/refs/heads/main/Dataset/dataset.csv",
    "Symptom2Disease.csv":      "https://raw.githubusercontent.com/SayamAlt/Symptoms-Disease-Text-Classification/refs/heads/main/Symptom2Disease.csv",
}

def download():
    for filename, url in DATASETS.items():
        dest = os.path.join(RAW_DIR, filename)
        if os.path.exists(dest):
            print(f"  ✓ {filename} already exists")
            continue
        print(f"  ↓ Downloading {filename} ...")
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            with open(dest, "wb") as f:
                f.write(r.content)
            print(f"  ✓ {filename} ({len(r.content)//1024} KB)")
        except Exception as e:
            print(f"  ✗ {filename}: {e}")

if __name__ == "__main__":
    print("Downloading medical datasets...")
    download()
    print("Done.")
