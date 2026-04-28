# ⚡ VibeMetrics 2.0 — Explainable Sentiment Analysis

> **Minor Project** · MSc AI & BDA (2nd Sem) · CSA-SEC-222  
> **Student:** Kashish Jain · Reg. No. Y25246002  
> **Guide:** Dr. Abhishek Bansal  
> **Institution:** Dr. Harisingh Gour Vishwavidyalaya, Sagar (M.P.)  

---

## 📌 Overview

VibeMetrics 2.0 is an **Explainable Sentiment Analysis** web application that goes beyond simple positive/negative labels. It reveals *why* a piece of text carries a particular sentiment using:

- **Multi-model ML comparison** (Naive Bayes, Logistic Regression, SVM, Random Forest, KNN)  
- **Aspect-Based Sentiment Analysis** (7 categories: Quality, Price, Service, Delivery, Performance, Design, Usability)  
- **RAG-style evidence retrieval** (Jaccard overlap over training corpus — no heavy dependencies)  
- **Word-level signal highlighting** (positive/negative word detection)  
- **Confidence scoring** (sigmoid on SVM decision boundary)

---

## 🗂️ Project Structure

```
vibemetrics2/
│
├── app.py                  # Flask backend (API + routes)
├── train_model.py          # Model training script
├── requirements.txt        # Python dependencies
│
├── data/
│   └── imdb.csv            # (optional) Place IMDB dataset here
│
├── model/                  # Auto-created after training
│   ├── best_model.pkl
│   ├── model_results.json
│   └── rag_corpus.json
│
├── templates/
│   └── index.html          # Jinja2 template
│
└── static/
    ├── css/style.css
    └── js/main.js
```

---

## ⚙️ Setup & Run

### 1 · Clone / open in VS Code
```bash
git clone https://github.com/your-username/vibemetrics-2.0.git
cd vibemetrics-2.0
code .
```

### 2 · Create virtual environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3 · Install dependencies
```bash
pip install -r requirements.txt
```

### 4 · (Optional) Download IMDB dataset
Download `IMDB Dataset.csv` from  
https://www.kaggle.com/datasets/lakshmi25npathi/imdb-dataset-of-50k-movie-reviews  
Rename it to `imdb.csv` and place it in the `data/` folder.  
If absent, a synthetic 6 000-sample corpus is used automatically.

### 5 · Train the model
```bash
python train_model.py
```
This creates `model/best_model.pkl`, `model/model_results.json`, and `model/rag_corpus.json`.

### 6 · Run the Flask app
```bash
python app.py
```
Open **http://localhost:5000** in your browser.

---

## 🔌 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Main web UI |
| POST | `/analyze` | Sentiment analysis `{ "text": "..." }` |
| GET | `/model-info` | Model comparison metrics (JSON) |
| GET | `/health` | Health check |

### Example `/analyze` response
```json
{
  "label": "Positive",
  "confidence": 91.3,
  "aspects": [
    { "aspect": "Quality",   "sentiment": "Positive", "confidence": 87.4 },
    { "aspect": "Delivery",  "sentiment": "Positive", "confidence": 82.1 }
  ],
  "similar": [
    "This product is really outstanding and arrived incredibly fast…"
  ],
  "highlighted": [
    { "word": "fantastic",    "type": "positive" },
    { "word": "outstanding",  "type": "positive" }
  ],
  "word_count": 24
}
```

---

## 🌐 GitHub Pages Deployment

The `docs/` folder contains a **static demo version** of the UI (no backend required).  
To deploy:

1. Push the repo to GitHub  
2. Go to **Settings → Pages**  
3. Set source to `main` branch, `/docs` folder  
4. Your site will be live at `https://your-username.github.io/vibemetrics-2.0/`

> Note: The static version shows the UI with sample data. The live analysis requires the Flask backend running locally or deployed to a server.

---

## 🧠 Methodology

### Preprocessing (NLTK)
1. Lowercase conversion  
2. HTML tag removal  
3. URL / @mention / #hashtag stripping  
4. Non-alphabetic character removal  
5. Stop-word removal  
6. Porter Stemming  

### Feature Extraction
- **TF-IDF Vectorizer**: 15 000 features, 1–2 gram range, sublinear TF, min_df=2

### Models Compared
| Model | Library |
|-------|---------|
| Naive Bayes | `sklearn.naive_bayes.MultinomialNB` |
| Logistic Regression | `sklearn.linear_model.LogisticRegression` |
| SVM | `sklearn.svm.LinearSVC` |
| Random Forest | `sklearn.ensemble.RandomForestClassifier` |
| KNN | `sklearn.neighbors.KNeighborsClassifier` |

### RAG Explanation
Evidence retrieval uses **Jaccard bag-of-words overlap** between the input and the training corpus — no sentence-transformers or FAISS required.

---

## 📚 Dataset

**IMDB Movie Reviews** (Maas et al., 2011)  
- 50 000 labelled reviews (25 000 positive / 25 000 negative)  
- Widely used NLP benchmark  
- Source: https://ai.stanford.edu/~amaas/data/sentiment/

---

## 📄 License

This project is submitted as an academic minor project. For educational use only.
