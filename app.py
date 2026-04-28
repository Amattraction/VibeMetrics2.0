import os, re, json, math, random
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from flask import Flask, render_template, request, jsonify
import joblib

# ── NLTK ─────────────────────────────────────────
for r in ['stopwords','punkt']:
    nltk.download(r, quiet=True)

STOPS = set(stopwords.words('english'))
stemmer = PorterStemmer()

# ── App ──────────────────────────────────────────
app = Flask(__name__)
BASE = os.path.dirname(os.path.abspath(__file__))

# IMPORTANT: initialize globals
MODEL = None
RAG_CORPUS = []

# ── Model Path Detection ─────────────────────────
POSSIBLE_MODEL_DIRS = [
    os.path.join(BASE, 'model'),
    os.path.join(os.getcwd(), 'model'),
    '/opt/render/project/src/model'
]

def get_model_dir():
    for path in POSSIBLE_MODEL_DIRS:
        if os.path.exists(path):
            print(f"✅ Found model directory at: {path}")
            return path
    print("❌ Model directory NOT FOUND")
    return os.path.join(BASE, 'model')

MDL_DIR = get_model_dir()

# ── Load Model ───────────────────────────────────
def _load():
    global MODEL, RAG_CORPUS

    model_path = os.path.join(MDL_DIR, "best_model.pkl")
    rag_path = os.path.join(MDL_DIR, "rag_corpus.json")

    print("🔍 Loading model from:", model_path)

    if os.path.exists(model_path):
        MODEL = joblib.load(model_path)
        print("✅ Model loaded")
    else:
        print("❌ Model NOT found")

    if os.path.exists(rag_path):
        with open(rag_path, "r") as f:
            RAG_CORPUS = json.load(f)
        print("✅ RAG loaded")
    else:
        print("⚠️ RAG not found")

# 🔥 VERY IMPORTANT → LOAD MODEL ON START
_load()

# ── Text Cleaning ───────────────────────────────
def clean(text):
    text = str(text).lower()
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'http\S+', ' ', text)
    text = re.sub(r'[@#]\w+', ' ', text)
    text = re.sub(r"[^a-z\s]", ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return ' '.join(stemmer.stem(t) for t in text.split()
                    if t not in STOPS and len(t) > 2)

# ── Prediction ──────────────────────────────────
def predict(text):
    if MODEL is None:
    return jsonify({'error': 'Model still loading, try again'}), 503

    c = clean(text)

    try:
        clf = MODEL.named_steps['clf']
        vec = MODEL.named_steps['tfidf']
    except Exception as e:
        raise Exception(f"Model structure error: {e}")

    X = vec.transform([c])
    pred = int(MODEL.predict([c])[0])

    if hasattr(clf, 'decision_function'):
        score = float(clf.decision_function(X)[0])
        prob = 1 / (1 + math.exp(-score))
        conf = prob if pred == 1 else 1 - prob
    elif hasattr(clf, 'predict_proba'):
        conf = float(max(clf.predict_proba(X)[0]))
    else:
        conf = 0.8

    return pred, round(conf * 100, 1)

# ── Routes ──────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/model-info')
def model_info():
    if MODEL is None:
        return jsonify({'trained': False})
    return jsonify({'trained': True})

@app.route('/analyze', methods=['POST'])
return jsonify({
    'label': label,
    'confidence': conf,
    'aspects': [],
    'similar': [],
    'highlighted': [],
    'word_count': len(text.split())
})

@app.route('/health')
def health():
    model_path = os.path.join(MDL_DIR, "best_model.pkl")

    return jsonify({
        "status": "ok",
        "model_loaded": MODEL is not None,
        "model_exists": os.path.exists(model_path),
        "model_path": model_path
    })

# ── Run ─────────────────────────────────────────
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)