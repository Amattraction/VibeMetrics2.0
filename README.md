VibeMetrics 2.0 — Explainable Sentiment Analysis System
Minor Project · M.Sc. Artificial Intelligence & Big Data Analytics (Semester II)
Course: CSA-SEC-222
Student: Kashish Jain (Reg. No. Y25246002)
Institution: Dr. Harisingh Gour Vishwavidyalaya, Sagar (M.P.)
Live Demo: 

Project Overview
Traditional sentiment analysis systems typically provide only a classification label such as positive or negative, without explaining how the decision was made. This project addresses that limitation by developing an explainable sentiment analysis system that enhances transparency and interpretability.

VibeMetrics 2.0 provides explanations at multiple levels:

Word Level: Highlights important words influencing the prediction

Aspect Level: Identifies sentiment for specific aspects such as quality, price, and service

Evidence Level: Retrieves similar examples from the dataset to support the prediction (retrieval-based approach)

Technology Stack
Component	Technology Used
Backend	Python, Flask
Machine Learning	scikit-learn (TF-IDF + classifiers)
NLP Processing	NLTK
Frontend	HTML, CSS, JavaScript
Deployment	Render
Version Control	GitHub
Dataset	IMDb Movie Reviews (50,000 samples)
Project Structure
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
Running the Project Locally
# Clone repository
git clone https://github.com/Amattraction/VibeMetrics2.0.git
cd VibeMetrics2.0

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Train the model
python train_model.py

# Run application
python app.py
Access at: http://localhost:5000

Machine Learning Pipeline
Raw Text
   ↓
Preprocessing (NLTK)
   ↓
TF-IDF Feature Extraction
   ↓
Machine Learning Model
   ↓
Prediction
   ↓
Explainability Layer
Preprocessing includes:
Lowercasing

Removal of noise (HTML, symbols, etc.)

Stopword removal

Stemming

Models Used:
Naïve Bayes

Logistic Regression

Support Vector Machine

Random Forest

K-Nearest Neighbors

Explainability Features
The system improves interpretability through:

Word Highlighting: Identifies key positive/negative words

Aspect-Based Analysis: Detects sentiment for different categories

Retrieval-Based Explanation: Finds similar examples from training data

API Endpoints
Method	Endpoint	Description
GET	/	Web interface
POST	/analyze	Sentiment + explanation
GET	/metrics	Model performance
GET	/health	System status
Dataset
The system uses the IMDb Movie Reviews Dataset (Maas et al., 2011):

50,000 labeled reviews

Balanced dataset (positive and negative)

Widely used benchmark dataset

Source: 

Limitations
Retrieval uses word overlap instead of semantic embeddings

Aspect detection is rule-based

Performance may vary across different domains

Difficulty handling sarcasm and complex expressions

Conclusion
This project demonstrates how sentiment analysis can be enhanced with explainability techniques. By combining machine learning, aspect-based analysis, and retrieval methods, it provides both accurate predictions and meaningful insights.

License
Developed by Kashish Jain for academic purposes.
Intended for educational use only.