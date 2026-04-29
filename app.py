import os, re, json, math
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from flask import Flask, render_template, request, jsonify
import joblib

# ── NLTK ──
for r in ['stopwords','punkt']:
    nltk.download(r, quiet=True)

STOPS = set(stopwords.words('english'))
stemmer = PorterStemmer()

app = Flask(__name__)
BASE = os.path.dirname(os.path.abspath(__file__))

MODEL = None
RAG_CORPUS = []

# ── MODEL PATH ──
POSSIBLE_MODEL_DIRS = [
    os.path.join(BASE, 'model'),
    '/opt/render/project/src/model'
]

def get_model_dir():
    for p in POSSIBLE_MODEL_DIRS:
        if os.path.exists(p):
            return p
    return os.path.join(BASE, 'model')

MDL_DIR = get_model_dir()

# ── LOAD ──
def load_all():
    global MODEL, RAG_CORPUS

    model_path = os.path.join(MDL_DIR, "best_model.pkl")
    rag_path = os.path.join(MDL_DIR, "rag_corpus.json")

    if os.path.exists(model_path):
        MODEL = joblib.load(model_path)

    if os.path.exists(rag_path):
        with open(rag_path) as f:
            RAG_CORPUS = json.load(f)

load_all()

# ── CLEAN ──
def clean(text):
    text = text.lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    return ' '.join(
        stemmer.stem(t)
        for t in text.split()
        if t not in STOPS and len(t) > 2
    )

# ── PREDICT ──
def predict(text):
    c = clean(text)

    clf = MODEL.named_steps['clf']
    vec = MODEL.named_steps['tfidf']

    X = vec.transform([c])
    pred = int(MODEL.predict([c])[0])

    if hasattr(clf, 'decision_function'):
        score = float(clf.decision_function(X)[0])
        prob = 1 / (1 + math.exp(-score))
        conf = prob if pred == 1 else 1 - prob
    else:
        conf = float(max(clf.predict_proba(X)[0]))

    return pred, round(conf * 100, 1)

# ── ASPECTS ──
ASPECT_KEYWORDS = {
    "quality": ["quality","build","material"],
    "delivery": ["delivery","shipping","late","fast"],
    "price": ["price","cost","value"],
    "service": ["support","service","help"]
}

def extract_aspects(text):
    t = text.lower()
    aspects = []

    for a, words in ASPECT_KEYWORDS.items():
        score = sum(1 for w in words if w in t)
        if score:
            aspects.append({
                "aspect": a,
                "score": round(min(score * 30, 100),1)
            })

    return aspects

# ── RAG ──
def rag_search(text):
    t = clean(text).split()
    results = []

    for item in RAG_CORPUS[:100]:
        overlap = len(set(t) & set(item['text'].split()))
        if overlap > 2:
            results.append(item['text'])

    return results[:3]

# ── HIGHLIGHT ──
POS_WORDS = ["good","great","amazing","excellent","fast"]
NEG_WORDS = ["bad","poor","slow","worst","cheap"]

def highlight(text):
    words = text.split()
    out = []

    for w in words:
        if w.lower() in POS_WORDS:
            out.append({"word": w, "type": "pos"})
        elif w.lower() in NEG_WORDS:
            out.append({"word": w, "type": "neg"})
        else:
            out.append({"word": w, "type": "neu"})
    return out

# ── ROUTES ──
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    text = data.get('text','')

    if not text or MODEL is None:
        return jsonify({"error":"model not ready"}), 400

    pred, conf = predict(text)

    return jsonify({
        "label": "Positive" if pred==1 else "Negative",
        "confidence": conf,
        "aspects": extract_aspects(text),
        "similar": rag_search(text),
        "highlighted": highlight(text),
        "word_count": len(text.split())
    })

@app.route('/metrics')
def metrics():
    return jsonify([
        {"model":"LogReg","accuracy":0.88,"precision":0.87,"recall":0.89,"f1":0.88},
        {"model":"NB","accuracy":0.84,"precision":0.83,"recall":0.85,"f1":0.84},
        {"model":"SVM","accuracy":0.90,"precision":0.89,"recall":0.91,"f1":0.90}
    ])

@app.route('/health')
def health():
    return jsonify({"status":"ok","model_loaded":MODEL is not None})

# ── RUN ──
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)