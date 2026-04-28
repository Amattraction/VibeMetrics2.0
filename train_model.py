"""
VibeMetrics 2.0 — Model Training
=================================
Dataset : IMDB Movie Reviews  (place imdb.csv in data/ to use full 50 k set)
          Falls back to a balanced built-in corpus when the CSV is absent.
Models  : Naive Bayes · Logistic Regression · SVM · Random Forest · KNN
Saved   : model/best_model.pkl · model/model_results.json · model/rag_corpus.json
Run     : python train_model.py
"""

import os, re, json, pickle, random
import numpy as np
import pandas as pd
import nltk
from nltk.corpus import stopwords
from nltk.stem   import PorterStemmer
from sklearn.model_selection    import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline           import Pipeline
from sklearn.naive_bayes        import MultinomialNB
from sklearn.linear_model       import LogisticRegression
from sklearn.svm                import LinearSVC
from sklearn.ensemble           import RandomForestClassifier
from sklearn.neighbors          import KNeighborsClassifier
from sklearn.metrics            import (accuracy_score, precision_score,
                                        recall_score, f1_score)

# ── NLTK ──────────────────────────────────────────────────────
for r in ['stopwords', 'punkt', 'wordnet']:
    nltk.download(r, quiet=True)

STOPS   = set(stopwords.words('english'))
stemmer = PorterStemmer()

BASE = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────────────────────
# 1. Preprocessing
# ─────────────────────────────────────────────────────────────
def clean(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r'<[^>]+>',  ' ', text)   # HTML tags
    text = re.sub(r'http\S+',  ' ', text)   # URLs
    text = re.sub(r'@\w+',     ' ', text)   # @mentions
    text = re.sub(r'#\w+',     ' ', text)   # hashtags
    text = re.sub(r"[^a-z\s]", ' ', text)   # keep letters only
    text = re.sub(r'\s+',      ' ', text).strip()
    tokens = [stemmer.stem(t) for t in text.split()
              if t not in STOPS and len(t) > 2]
    return ' '.join(tokens)

# ─────────────────────────────────────────────────────────────
# 2. Dataset
# ─────────────────────────────────────────────────────────────
POS_SEEDS = [
    "This product is absolutely fantastic I love it so much",
    "Amazing experience highly recommend to everyone around me",
    "Best purchase ever totally worth every single penny spent",
    "Incredible quality and fast delivery exceeded all my expectations",
    "Superb value for money the quality is simply outstanding brilliant",
    "Outstanding performance and excellent customer support overall great",
    "Very satisfied with this wonderful item I will definitely buy again",
    "Loved every moment using this product five stars all the way",
    "Exceptional item that delivers exactly what was promised to me",
    "Great service arrived quickly and in absolutely perfect condition",
    "Brilliant experience from start to finish absolutely recommend it",
    "Delighted with my purchase and would recommend to all my friends",
    "Fantastic quality and performs far beyond all of my expectations",
    "I am so happy with this purchase it changed my daily routine",
    "Perfectly built product works flawlessly and looks beautiful",
    "Shipped faster than expected and packaging was very secure",
    "Exceeded my expectations in every way shape and form",
    "Would buy again without hesitation truly a top quality product",
    "The customer service team was incredibly helpful and responsive",
    "Exactly as described and arrived in pristine immaculate condition",
]

NEG_SEEDS = [
    "This product is terrible and completely broke after one day",
    "Worst purchase ever made absolute waste of money avoid it",
    "Extremely disappointed with the poor quality and awful service",
    "Do not buy this it stopped working immediately after arrival",
    "Horrible experience the product is defective and support useless",
    "Total disaster broken on arrival and no refund was provided",
    "Very bad quality customer service was extremely rude and unhelpful",
    "Disgusting product that failed immediately and smelled horrible",
    "Completely useless item that did not work as advertised at all",
    "Regret this purchase so much the quality is absolutely dreadful",
    "Arrived damaged and customer service completely refused to help",
    "Misleading description and the product is nothing like advertised",
    "One star is too generous for this awful defective terrible product",
    "Never again terrible quality and the delivery was extremely late",
    "Waste of money broken parts and impossible to assemble safely",
    "The packaging was ripped and the product was completely scratched",
    "Stopped working after three uses absolutely furious with this",
    "Sent the wrong item and customer support never replied to me",
    "Cheaply made falls apart immediately do not waste your money",
    "False advertising the product looks nothing like the photos",
]

POS_EXTRAS = ['really','truly','definitely','absolutely','genuinely',
              'incredibly','remarkably','wonderfully','perfectly','brilliantly']
NEG_EXTRAS = ['very','extremely','utterly','completely','totally',
              'terribly','horribly','awfully','dreadfully','badly']


def build_synthetic(n_per_class=3000):
    random.seed(42)
    reviews, labels = [], []
    for _ in range(n_per_class):
        t = random.choice(POS_SEEDS).split()
        t.insert(random.randint(0, len(t)), random.choice(POS_EXTRAS))
        reviews.append(' '.join(t)); labels.append(1)
    for _ in range(n_per_class):
        t = random.choice(NEG_SEEDS).split()
        t.insert(random.randint(0, len(t)), random.choice(NEG_EXTRAS))
        reviews.append(' '.join(t)); labels.append(0)
    df = pd.DataFrame({'review': reviews, 'sentiment': labels})
    return df.sample(frac=1, random_state=42).reset_index(drop=True)


def load_imdb_from_folders(base_path):
    reviews = []
    sentiments = []

    for split in ['train', 'test']:
        split_path = os.path.join(base_path, split)

        if not os.path.exists(split_path):
            continue

        for label in ['pos', 'neg']:
            label_path = os.path.join(split_path, label)

            if not os.path.exists(label_path):
                continue

            for file in os.listdir(label_path):
                file_path = os.path.join(label_path, file)

                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        reviews.append(f.read())
                        sentiments.append(1 if label == 'pos' else 0)
                except:
                    continue

    df = pd.DataFrame({
        'review': reviews,
        'sentiment': sentiments
    })

    return df


def load_data():
    # 🔥 NEW: Check for folder dataset first
    folder_path = os.path.join(BASE, 'dataset', 'IMDB')

    if os.path.exists(folder_path):
        print("✔ Loading IMDB dataset from folders...")
        df = load_imdb_from_folders(folder_path)

    else:
        # fallback to CSV
        csv_path = os.path.join(BASE, 'data', 'imdb.csv')

        if os.path.exists(csv_path):
            print("✔ Loading IMDB CSV …")
            df = pd.read_csv(csv_path)
            df.columns = [c.lower().strip() for c in df.columns]
            df = df[['review','sentiment']].dropna()
            df['sentiment'] = (df['sentiment'].str.strip().str.lower()
                               .map({'positive':1,'negative':0}))
            df.dropna(inplace=True)
            df['sentiment'] = df['sentiment'].astype(int)

        else:
            print("⚠ Using synthetic dataset (fallback)")
            df = build_synthetic()

    print(f"   Samples: {len(df)}  |  Positive: {df['sentiment'].sum()}  "
          f"|  Negative: {(df['sentiment']==0).sum()}")

    return df
# ─────────────────────────────────────────────────────────────
# 3. Train & Evaluate
# ─────────────────────────────────────────────────────────────
MODELS = {
    'Naive Bayes':          MultinomialNB(alpha=0.5),
    'Logistic Regression':  LogisticRegression(C=1.0, max_iter=1000, random_state=42),
    'SVM':                  LinearSVC(C=1.0, max_iter=3000, random_state=42),
    'Random Forest':        RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
    'KNN':                  KNeighborsClassifier(n_neighbors=7, n_jobs=-1),
}

def train(df):
    df['clean'] = df['review'].apply(clean)
    X_tr, X_te, y_tr, y_te = train_test_split(
        df['clean'], df['sentiment'],
        test_size=0.20, random_state=42, stratify=df['sentiment'])

    tfidf = TfidfVectorizer(max_features=15000, ngram_range=(1,2),
                            sublinear_tf=True, min_df=2)

    results, pipelines = {}, {}
    for name, clf in MODELS.items():
        print(f"   Training {name} …", end='', flush=True)
        pipe = Pipeline([('tfidf', tfidf), ('clf', clf)])
        pipe.fit(X_tr, y_tr)
        preds = pipe.predict(X_te)
        results[name] = {
            'accuracy':  round(accuracy_score (y_te, preds)*100, 2),
            'precision': round(precision_score(y_te, preds, zero_division=0)*100, 2),
            'recall':    round(recall_score   (y_te, preds, zero_division=0)*100, 2),
            'f1':        round(f1_score       (y_te, preds, zero_division=0)*100, 2),
        }
        pipelines[name] = pipe
        print(f"  Accuracy {results[name]['accuracy']}%  F1 {results[name]['f1']}%")
    return pipelines, results

# ─────────────────────────────────────────────────────────────
# 4. RAG Corpus (keyword-overlap retrieval — no heavy deps)
# ─────────────────────────────────────────────────────────────
def build_rag_corpus(df, n=400):
    pos = df[df['sentiment']==1].sample(min(n//2, len(df[df['sentiment']==1])), random_state=42)
    neg = df[df['sentiment']==0].sample(min(n//2, len(df[df['sentiment']==0])), random_state=42)
    corpus = pd.concat([pos, neg])[['review','sentiment']].reset_index(drop=True)
    return corpus.to_dict('records')

# ─────────────────────────────────────────────────────────────
# 5. Save artefacts
# ─────────────────────────────────────────────────────────────
def save(pipelines, results, rag_corpus):
    out = os.path.join(BASE, 'model')
    os.makedirs(out, exist_ok=True)

    best_name = max(results, key=lambda k: results[k]['f1'])
    print(f"\n★  Best model: {best_name}  (F1 {results[best_name]['f1']}%)")

    with open(os.path.join(out, 'best_model.pkl'), 'wb') as f:
        pickle.dump(pipelines[best_name], f)

    with open(os.path.join(out, 'model_results.json'), 'w') as f:
        json.dump({'results': results, 'best_model': best_name}, f, indent=2)

    with open(os.path.join(out, 'rag_corpus.json'), 'w') as f:
        json.dump(rag_corpus, f, indent=2)

    print("   Saved: model/best_model.pkl")
    print("   Saved: model/model_results.json")
    print("   Saved: model/rag_corpus.json")

# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("\n── VibeMetrics 2.0 · Model Training ──────────────────")
    df        = load_data()
    pipelines, results = train(df)
    rag       = build_rag_corpus(df)
    save(pipelines, results, rag)
    print("\n✅  Training complete!\n")
