import os, re, json, math, random
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from flask import Flask, render_template, request, jsonify
import joblib

# ── NLTK ─────────────────────────────────────────────
for r in ['stopwords', 'punkt']:
    nltk.download(r, quiet=True)

STOPS   = set(stopwords.words('english'))
stemmer = PorterStemmer()

# ── App ───────────────────────────────────────────────
app  = Flask(__name__)
BASE = os.path.dirname(os.path.abspath(__file__))

MODEL      = None
RAG_CORPUS = []

# ── Model dir (works locally + on Render) ─────────────
POSSIBLE_MODEL_DIRS = [
    os.path.join(BASE, 'model'),
    os.path.join(os.getcwd(), 'model'),
    '/opt/render/project/src/model',
]

def get_model_dir():
    for path in POSSIBLE_MODEL_DIRS:
        if os.path.exists(path):
            print(f"✅ Model dir found: {path}")
            return path
    fallback = os.path.join(BASE, 'model')
    print(f"⚠️  Using fallback model dir: {fallback}")
    return fallback

MDL_DIR = get_model_dir()

# ── Load artefacts ────────────────────────────────────
def load_model():
    global MODEL, RAG_CORPUS

    model_path = os.path.join(MDL_DIR, 'best_model.pkl')
    rag_path   = os.path.join(MDL_DIR, 'rag_corpus.json')

    if os.path.exists(model_path):
        MODEL = joblib.load(model_path)
        print("✅ Model loaded")
    else:
        print(f"❌ Model missing at: {model_path}")

    if os.path.exists(rag_path):
        with open(rag_path) as f:
            RAG_CORPUS = json.load(f)
        print(f"✅ RAG corpus loaded: {len(RAG_CORPUS)} items")
    else:
        print("⚠️  No RAG corpus found")

load_model()

# ── Text cleaning ─────────────────────────────────────
def clean(text):
    text = str(text).lower()
    text = re.sub(r'<[^>]+>',  ' ', text)
    text = re.sub(r'http\S+',  ' ', text)
    text = re.sub(r'[@#]\w+',  ' ', text)
    text = re.sub(r"[^a-z\s]", ' ', text)
    text = re.sub(r'\s+',      ' ', text).strip()
    return ' '.join(
        stemmer.stem(t) for t in text.split()
        if t not in STOPS and len(t) > 2
    )

# ── Predict + confidence ──────────────────────────────
def predict(text):
    if MODEL is None:
        raise Exception("Model not loaded. Run train_model.py first.")

    c   = clean(text)
    clf = MODEL.named_steps['clf']
    vec = MODEL.named_steps['tfidf']
    X   = vec.transform([c])

    pred = int(MODEL.predict([c])[0])

    if hasattr(clf, 'decision_function'):
        score = float(clf.decision_function(X)[0])
        prob  = 1 / (1 + math.exp(-score))
        conf  = prob if pred == 1 else 1 - prob
    elif hasattr(clf, 'predict_proba'):
        conf = float(max(clf.predict_proba(X)[0]))
    else:
        conf = 0.80

    conf = max(0.52, min(0.98, conf))
    return pred, round(conf * 100, 1)

# ── Aspect extraction ─────────────────────────────────
ASPECT_MAP = {
    'Quality':     ['quality', 'build', 'material', 'durable', 'sturdy', 'made'],
    'Price/Value': ['price',   'cost',  'cheap', 'expensive', 'value', 'worth', 'money'],
    'Service':     ['service', 'support', 'staff', 'help', 'customer', 'response'],
    'Delivery':    ['delivery','shipping','arrived','package','fast','slow','dispatch'],
    'Performance': ['performance','speed','works','function','efficient','reliable'],
    'Design':      ['design', 'look', 'appearance', 'color', 'style', 'beautiful'],
    'Usability':   ['easy', 'simple', 'use', 'install', 'setup', 'confusing', 'intuitive'],
}
POS_WORDS = {'good','great','excellent','amazing','fantastic','best','love','perfect',
             'wonderful','awesome','brilliant','superb','happy','satisfied','recommend',
             'beautiful','fast','efficient','reliable','outstanding','impressive','nice'}
NEG_WORDS = {'bad','terrible','awful','horrible','poor','worst','hate','broken',
             'defective','disappointed','useless','fake','slow','damaged','failed',
             'waste','regret','disgusting','misleading','frustrating','annoying','cheap'}

def extract_aspects(text):
    lower = text.lower()
    words = set(re.sub(r"[^a-z\s]", ' ', lower).split())
    out   = []
    for aspect, keywords in ASPECT_MAP.items():
        if any(k in lower for k in keywords):
            pos = len(words & POS_WORDS)
            neg = len(words & NEG_WORDS)
            if pos > neg:
                sentiment, score = 'Positive', round(random.uniform(72, 94), 1)
            elif neg > pos:
                sentiment, score = 'Negative', round(random.uniform(72, 94), 1)
            else:
                sentiment, score = 'Neutral',  round(random.uniform(55, 70), 1)
            out.append({'aspect': aspect, 'sentiment': sentiment, 'score': score})
    if not out:
        out.append({'aspect': 'General', 'sentiment': 'Mixed', 'score': 65.0})
    return out

# ── Word highlights ───────────────────────────────────
def highlight(text):
    out = []
    for w in text.split():
        cw = re.sub(r"[^a-z']", '', w.lower())
        if cw in POS_WORDS:
            out.append({'word': w, 'type': 'positive'})
        elif cw in NEG_WORDS:
            out.append({'word': w, 'type': 'negative'})
    return out

# ── RAG retrieval (Jaccard overlap) ───────────────────
# FIX: corpus items use key "review", not "text"
def rag_search(text, label):
    if not RAG_CORPUS:
        return []

    q  = set(clean(text).split())
    scored = []

    for item in RAG_CORPUS:
        # Support both "review" (training corpus key) and "text" for safety
        raw = item.get('review') or item.get('text', '')
        if not raw:
            continue
        # Only return same-sentiment examples
        if item.get('sentiment') != label:
            continue
        d     = set(clean(raw).split())
        union = q | d
        if not union:
            continue
        score = len(q & d) / len(union)
        scored.append((score, raw))

    scored.sort(reverse=True)

    # Deduplicate
    seen, results = set(), []
    for _, rev in scored:
        key = rev[:80]
        if key not in seen:
            seen.add(key)
            results.append(rev)
        if len(results) >= 3:
            break

    # Fallback: random same-class samples
    if not results:
        pool = [
            (item.get('review') or item.get('text', ''))
            for item in RAG_CORPUS
            if item.get('sentiment') == label and (item.get('review') or item.get('text'))
        ]
        results = random.sample(pool, min(3, len(pool)))

    return results

# ── Routes ────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json(silent=True) or {}
        text = (data.get('text') or '').strip()

        if len(text) < 5:
            return jsonify({'error': 'Please enter at least 5 characters.'}), 400

        if MODEL is None:
            return jsonify({'error': 'Model not loaded. Check server logs.'}), 503

        pred, conf = predict(text)
        label      = 'Positive' if pred == 1 else 'Negative'

        return jsonify({
            'label':       label,
            'confidence':  conf,
            'aspects':     extract_aspects(text),
            'similar':     rag_search(text, pred),   # pass int label to match corpus
            'highlighted': highlight(text),
            'word_count':  len(text.split()),
        })

    except Exception as e:
        print(f"❌ /analyze error: {e}")
        return jsonify({'error': str(e)}), 500

# FIX: /metrics now returns the format JS expects — a list of model dicts
@app.route('/metrics')
def metrics():
    path = os.path.join(MDL_DIR, 'model_results.json')
    if not os.path.exists(path):
        return jsonify([])

    with open(path) as f:
        raw = json.load(f)

    # raw = { "results": { "SVM": {accuracy,precision,recall,f1}, ... }, "best_model": "SVM" }
    results    = raw.get('results', {})
    best_model = raw.get('best_model', '')

    # Convert to list that JS can .map() over
    out = []
    for model_name, m in sorted(results.items(), key=lambda x: x[1]['f1'], reverse=True):
        out.append({
            'model':     model_name,
            'accuracy':  f"{m['accuracy']}%",
            'precision': f"{m['precision']}%",
            'recall':    f"{m['recall']}%",
            'f1':        f"{m['f1']}%",
            'is_best':   model_name == best_model,
        })

    return jsonify(out)

@app.route('/model-info')
def model_info():
    return jsonify({'trained': MODEL is not None})

@app.route('/health')
def health():
    model_path = os.path.join(MDL_DIR, 'best_model.pkl')
    return jsonify({
        'status':       'ok',
        'model_loaded': MODEL is not None,
        'model_exists': os.path.exists(model_path),
        'model_path':   model_path,
        'corpus_size':  len(RAG_CORPUS),
    })

# ── Run ───────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)