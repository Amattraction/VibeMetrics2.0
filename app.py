import os, re, json, math
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

_load()

# ── Text Cleaning ───────────────────────────────
def clean(text):
    text = str(text).lower()
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'http\S+', ' ', text)
    text = re.sub(r'[@#]\w+', ' ', text)
    text = re.sub(r"[^a-z\s]", ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return ' '.join(
        stemmer.stem(t)
        for t in text.split()
        if t not in STOPS and len(t) > 2
    )

# ── Prediction ──────────────────────────────────
def predict(text):
    if MODEL is None:
        raise Exception("Model not loaded")

    c = clean(text)

    clf = MODEL.named_steps['clf']
    vec = MODEL.named_steps['tfidf']

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
    return jsonify({'trained': MODEL is not None})

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json(silent=True) or {}
    text = (data.get('text') or '').strip()

    if len(text) < 5:
        return jsonify({'error': 'Enter valid text'}), 400

    if MODEL is None:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        pred, conf = predict(text)
        label = 'Positive' if pred == 1 else 'Negative'

        return jsonify({
            'label': label,
            'confidence': conf,
            'aspects': [],
            'similar': [],
            'highlighted': [],
            'word_count': len(text.split())
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

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