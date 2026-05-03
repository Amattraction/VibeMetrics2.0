# VibeMetrics 2.0 — Explainable Sentiment Analysis System

**Minor Project** · M.Sc. Artificial Intelligence & Big Data Analytics (Semester II)
**Course:** CSA-SEC-222
**Student:** Kashish Jain (Reg. No. Y25246002)
**Institution:** Dr. Harisingh Gour Vishwavidyalaya, Sagar (M.P.)
**Live Demo:** https://vibemetrics-2-0.onrender.com

---

## Project Overview

Traditional sentiment analysis systems return only a classification label — positive or negative — without explaining how that decision was reached. VibeMetrics 2.0 addresses this limitation by building an explainable sentiment analysis system that enhances transparency and interpretability.

The system provides explanations at three levels:

- **Word Level:** Highlights specific words that influenced the prediction
- **Aspect Level:** Identifies sentiment for individual aspects such as Direction, Acting, Screenplay, Cinematography, and Editing
- **Evidence Level:** Retrieves similar examples from the training corpus using keyword-overlap similarity to support the prediction

---

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Python, Flask |
| Machine Learning | scikit-learn (TF-IDF + classifiers) |
| NLP Processing | NLTK |
| Frontend | HTML, CSS, JavaScript |
| Deployment | Render |
| Version Control | GitHub |
| Dataset | IMDb Movie Reviews (50,000 samples) |

---

## Project Structure

```
VibeMetrics2.0/
│
├── app.py                  # Flask application (routes & API)
├── train_model.py          # Model training script
├── wsgi.py                 # Deployment entry point
├── Procfile                # Deployment configuration
├── requirements.txt        # Dependencies
│
├── model/
│   ├── best_model.pkl
│   ├── model_results.json
│   └── rag_corpus.json
│
├── templates/
│   └── index.html
│
└── static/
    ├── css/style.css
    └── js/main.js
```

---

## Running the Project Locally

```bash
# Clone repository
git clone https://github.com/Amattraction/VibeMetrics2.0.git
cd VibeMetrics2.0

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Train the model (generates model/ artefacts)
python train_model.py

# Run application
python app.py
```

Access at: **http://localhost:5000**

---

## Machine Learning Pipeline

```
Raw Text
   ↓
Preprocessing (NLTK)
— Lowercasing
— Noise removal (HTML tags, URLs, symbols)
— Stopword removal
— Porter Stemming
   ↓
TF-IDF Feature Extraction
— 15,000 features, unigrams + bigrams, sublinear TF scaling
   ↓
Sentiment Classification
— Best model selected by F1 score on 20% held-out test set
   ↓
Explainability Layer
— Word highlights, aspect scores, corpus retrieval
```

---

## Model Performance

| Model | Accuracy | F1 Score | Remark |
|---|---|---|---|
| Logistic Regression | 89.97% | 90.09% | **Best — selected for deployment** |
| SVM | 89.25% | 89.30% | Close runner-up |
| Naive Bayes | 87.07% | 87.20% | Beats Maas et al. 2011 baseline |
| Random Forest | 85.19% | 85.17% | Consistent with ensemble baselines |
| KNN | 80.92% | 82.13% | Weakest — high memory cost at inference |

---

## Explainability Features

- **Word Highlighting:** Identifies positive and negative signal words in the input
- **Aspect-Based Analysis:** Detects sentiment across seven movie-review categories — Direction, Acting, Screenplay, Cinematography, Music/Score, Editing, Emotions
- **Retrieval-Based Explanation:** Finds the three most similar examples from the training corpus using Jaccard bag-of-words overlap
- **Session History:** Stores the last five analyses of a session for quick reference and re-analysis

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Web interface |
| POST | `/analyze` | Sentiment prediction + explanation |
| GET | `/metrics` | Model performance results |
| GET | `/health` | System status check |

---

## Dataset

**IMDb Movie Reviews** — Maas et al., 2011
- 50,000 labelled reviews, balanced: 25,000 positive / 25,000 negative
- Standard benchmark for binary sentiment classification
- Source: https://ai.stanford.edu/~amaas/data/sentiment/

---

## Limitations

- Retrieval uses Jaccard word overlap, not dense semantic embeddings
- Aspect detection is rule-based, not learned from data
- Model trained on movie reviews — accuracy may vary on other text domains
- Sarcasm and complex linguistic expressions are not fully handled
- Hosted on Render free tier — cold start of approximately 30 seconds after inactivity

---

## License

Developed by Kashish Jain for academic purposes. Educational use only.