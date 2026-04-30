# VibeMetrics 2.0 — Explainable Sentiment Analysis

> **Minor Project** · MSc AI & BDA (2nd Semester) · Course: CSA-SEC-222
> **Student:** Kashish Jain · Reg. No. Y25246002
> **Supervisor:** Dr. Abhishek Bansal
> **Institution:** Dr. Harisingh Gour Vishwavidyalaya, Sagar (M.P.)
> **Live Demo:** https://vibemetrics-2-0.onrender.com

---

## What This Project Does

Standard sentiment classifiers return a label — *positive* or *negative* — with no explanation. VibeMetrics 2.0 addresses this by making the prediction **explainable** at three levels:

1. **Word level** — highlights which specific words drove the classification
2. **Aspect level** — identifies sentiment per category (Quality, Price, Service, Delivery, etc.)
3. **Evidence level** — retrieves similar examples from the training corpus to support the prediction (RAG-style retrieval)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask |
| ML | scikit-learn (TF-IDF + 5 classifiers) |
| NLP Preprocessing | NLTK (stopwords, Porter stemming) |
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Deployment | Render (backend), GitHub (version control) |
| Dataset | IMDB Movie Reviews — 50,000 labelled samples |

---

## Project Structure

```
VibeMetrics2.0/
│
├── app.py                  # Flask app — routes, inference, API
├── train_model.py          # Trains all models, saves best by F1
├── wsgi.py                 # Gunicorn entry point
├── Procfile                # Render process config
├── requirements.txt        # Python dependencies
│
├── model/
│   ├── best_model.pkl      # Serialised best pipeline (TF-IDF + classifier)
│   ├── model_results.json  # Accuracy / Precision / Recall / F1 for all models
│   └── rag_corpus.json     # Sampled training examples for RAG retrieval
│
├── templates/
│   └── index.html          # Jinja2 HTML template
│
└── static/
    ├── css/style.css
    └── js/main.js
```

---

## How to Run Locally

```bash
# 1. Clone and open
git clone https://github.com/Amattraction/VibeMetrics2.0.git
cd VibeMetrics2.0

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Train the model (generates model/ artefacts)
python train_model.py

# 5. Start the server
python app.py
# → http://localhost:5000
```

> The training script works without the IMDB CSV — it falls back to a balanced synthetic corpus. To use the full dataset, download `IMDB Dataset.csv` from [Kaggle](https://www.kaggle.com/datasets/lakshmi25npathi/imdb-dataset-of-50k-movie-reviews), rename it `imdb.csv`, and place it in a `data/` folder before running step 4.

---

## ML Pipeline

```
Raw Text
   │
   ▼
Preprocessing (NLTK)
  • Lowercase, remove HTML / URLs / mentions
  • Remove non-alphabetic characters
  • Strip stopwords
  • Porter stemming
   │
   ▼
TF-IDF Vectorisation
  • 15,000 features, unigrams + bigrams
  • Sublinear TF scaling, min_df = 2
   │
   ▼
Classifier  (best model selected by F1 on 20% held-out test set)
  • Naive Bayes       (MultinomialNB)
  • Logistic Regression
  • SVM               (LinearSVC)
  • Random Forest
  • KNN
   │
   ▼
Explainability Layer
  • Word highlights   — lexicon-based positive/negative signal detection
  • Aspect analysis   — keyword matching across 7 predefined aspect categories
  • RAG retrieval     — Jaccard bag-of-words overlap against training corpus
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Serves the web UI |
| `POST` | `/analyze` | Returns prediction + explanation for input text |
| `GET` | `/metrics` | Returns model comparison results (JSON) |
| `GET` | `/health` | Health check — confirms model load status |

**Sample `/analyze` request:**
```json
{ "text": "Delivery was fast but the build quality feels cheap." }
```

**Sample `/analyze` response:**
```json
{
  "label": "Negative",
  "confidence": 73.2,
  "aspects": [
    { "aspect": "Delivery",    "sentiment": "Positive", "score": 81.4 },
    { "aspect": "Quality",     "sentiment": "Negative", "score": 76.9 },
    { "aspect": "Price/Value", "sentiment": "Negative", "score": 68.3 }
  ],
  "highlighted": [
    { "word": "fast",  "type": "positive" },
    { "word": "cheap", "type": "negative" }
  ],
  "similar": [
    "Shipped quickly but the material feels very flimsy for the price."
  ],
  "word_count": 12
}
```

---

## Dataset

**IMDB Movie Reviews** — Maas et al., 2011
- 50,000 reviews, balanced: 25,000 positive / 25,000 negative
- Standard benchmark for binary sentiment classification
- Source: https://ai.stanford.edu/~amaas/data/sentiment/

---

## Honest Limitations

- The RAG retrieval uses Jaccard word-overlap, not dense embeddings — it is fast and dependency-free but less semantically precise than vector search.
- Aspect sentiment is rule-based (keyword matching), not trained — it can misfire on sarcastic or complex sentences.
- The model is trained on movie reviews; accuracy on domain-specific text (medical, legal, code) will be lower.

---

## License

Kashish Jain (@Amattraction)
Submitted as an academic minor project. For educational use only.