/* ═══════════════════════════════════════════════════
   VibeMetrics 2.0  —  demo.js  (GitHub Pages static)
   All analysis runs client-side — no server needed.
   ═══════════════════════════════════════════════════ */

const SAMPLES = {
  pos: 'This product is absolutely fantastic! The build quality is outstanding, delivery was incredibly fast, and it looks beautiful. I am completely satisfied with my purchase — it exceeded all my expectations. Highly recommend to everyone!',
  neg: 'Worst purchase I have ever made. The product broke after just one day of use, customer service was completely unhelpful and rude. Total waste of money. Arrived damaged and the quality is absolutely terrible. Do NOT buy this — I deeply regret it.',
  mix: 'The design looks really nice and it arrived quickly, which I appreciated. However, the build quality feels a bit cheap for the price and setup was confusing. Customer service was helpful when I reached out. Overall an average experience — decent but not great.'
};

const POS_WORDS = new Set(['good','great','excellent','amazing','fantastic','best','love',
  'perfect','wonderful','awesome','brilliant','superb','happy','satisfied','recommend',
  'beautiful','fast','efficient','reliable','outstanding','impressive','smooth','nice',
  'appreciated','helpful','worth']);
const NEG_WORDS = new Set(['bad','terrible','awful','horrible','poor','worst','hate','broken',
  'defective','disappointed','useless','fake','slow','damaged','failed','waste','regret',
  'disgusting','misleading','frustrating','annoying','cheap','confusing','rude','unhelpful']);

const ASPECTS = {
  'Quality':    ['quality','material','build','durable','sturdy','solid'],
  'Price/Value':['price','cost','cheap','expensive','value','worth','money'],
  'Service':    ['service','support','staff','help','customer','response','helpful'],
  'Delivery':   ['delivery','shipping','arrived','package','fast','slow'],
  'Performance':['performance','speed','works','function','efficient','reliable'],
  'Design':     ['design','look','appearance','color','style','beautiful','nice'],
  'Usability':  ['easy','simple','use','install','setup','confusing','intuitive'],
};

const RAG_EXAMPLES = {
  Positive:[
    'This product is really outstanding — delivery was incredibly fast and packaging superb.',
    'Absolutely love this purchase, the quality is amazing and totally worth every penny.',
    'Excellent customer service and the product performs exactly as described. Very happy!',
  ],
  Negative:[
    'Terrible quality, broke immediately and customer service refused to issue a refund.',
    'Complete waste of money — arrived damaged and nothing like the advertised description.',
    'Worst purchase ever. Stopped working after one day and support was completely unhelpful.',
  ],
};

// ── DOM refs ────────────────────────────────────────
const $ = id => document.getElementById(id);
const input     = $('textInput');
const charCount = $('charCount');
const analyzeBtn= $('analyzeBtn');
const results   = $('results');
const errorBox  = $('errorBox');

input.addEventListener('input', () => {
  const n = input.value.length;
  charCount.textContent = `${n} / 2000`;
  charCount.style.color = n > 1800 ? 'var(--red)' : '';
});
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runDemo();
});

function setSample(k) { input.value = SAMPLES[k]; input.dispatchEvent(new Event('input')); }
function clearInput() {
  input.value = ''; input.dispatchEvent(new Event('input'));
  results.classList.add('hidden'); errorBox.classList.add('hidden');
}

// ── Client-side inference ─────────────────────────────
function clientAnalyze(text) {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g,' ');
  const words = new Set(lower.split(/\s+/));
  const posHits = [...words].filter(w => POS_WORDS.has(w)).length;
  const negHits = [...words].filter(w => NEG_WORDS.has(w)).length;

  let label, conf;
  if (posHits >= negHits) {
    label = 'Positive';
    conf  = Math.round(55 + Math.min(posHits * 8, 40) + Math.random() * 4);
  } else {
    label = 'Negative';
    conf  = Math.round(55 + Math.min(negHits * 8, 40) + Math.random() * 4);
  }
  conf = Math.min(conf, 97);

  // Highlights
  const highlighted = text.split(/\s+/).reduce((acc, w) => {
    const cw = w.toLowerCase().replace(/[^a-z]/g,'');
    if (POS_WORDS.has(cw)) acc.push({ word: w, type: 'positive' });
    else if (NEG_WORDS.has(cw)) acc.push({ word: w, type: 'negative' });
    return acc;
  }, []);

  // Aspects
  const aspects = [];
  for (const [aspect, kws] of Object.entries(ASPECTS)) {
    if (kws.some(k => lower.includes(k))) {
      const pos = [...words].filter(w => POS_WORDS.has(w)).length;
      const neg = [...words].filter(w => NEG_WORDS.has(w)).length;
      const sent = pos > neg ? 'Positive' : neg > pos ? 'Negative' : 'Neutral';
      aspects.push({ aspect, sentiment: sent, confidence: Math.round(60 + Math.random()*30) });
    }
  }
  if (!aspects.length) aspects.push({ aspect:'General', sentiment: label, confidence: Math.round(60+Math.random()*20) });

  const similar = RAG_EXAMPLES[label] || RAG_EXAMPLES.Positive;

  return { label, confidence: conf, highlighted, aspects, similar,
           word_count: text.trim().split(/\s+/).length };
}

// ── Run demo ──────────────────────────────────────────
function runDemo() {
  const text = input.value.trim();
  if (text.length < 5) { showError('Please enter at least 5 characters.'); return; }

  setLoading(true);
  errorBox.classList.add('hidden');
  results.classList.add('hidden');

  setTimeout(() => {
    try {
      const data = clientAnalyze(text);
      renderAll(data, text);
    } catch(e) { showError('Analysis error: ' + e.message); }
    finally { setLoading(false); }
  }, 600);
}

// ── Render ────────────────────────────────────────────
function renderAll(data, text) {
  const isPos = data.label === 'Positive';
  renderVerdict(data, isPos);
  renderHighlights(text, data.highlighted);
  renderAspects(data.aspects);
  renderRAG(data.similar);
  $('wCount').textContent = data.word_count;
  $('aCount').textContent = data.aspects.length;
  results.classList.remove('hidden');
  setTimeout(() => results.scrollIntoView({ behavior:'smooth', block:'start' }), 120);
}

function renderVerdict(data, isPos) {
  $('verdictEmoji').textContent = isPos ? '😊' : '😞';
  const lbl = $('verdictLabel');
  lbl.textContent = data.label;
  lbl.className   = 'verdict__label' + (isPos ? '' : ' verdict__label--neg');
  const fill = $('ringFill');
  fill.className  = 'ring__fill' + (isPos ? '' : ' ring__fill--neg');
  const pct = Math.min(Math.max(data.confidence,0),100);
  setTimeout(() => { fill.style.strokeDashoffset = 301.59 - (pct/100)*301.59; }, 80);
  animateNum('ringNum', 0, Math.round(pct), 900);
}

function renderHighlights(text, hl) {
  const map = {};
  hl.forEach(h => { map[h.word.toLowerCase().replace(/[^a-z]/g,'')] = h.type; });
  const el = $('hlText');
  el.innerHTML = text.split(/(\s+)/).map(seg => {
    const k = seg.toLowerCase().replace(/[^a-z]/g,'');
    if (map[k]==='positive') return `<span class="hl-pos">${esc(seg)}</span>`;
    if (map[k]==='negative') return `<span class="hl-neg">${esc(seg)}</span>`;
    return esc(seg);
  }).join('');
}

function renderAspects(aspects) {
  $('aspectsList').innerHTML = aspects.map(a => {
    const bc = a.sentiment==='Positive'?'bar--pos':a.sentiment==='Negative'?'bar--neg':'bar--neu';
    const sc = a.sentiment==='Positive'?'sent--pos':a.sentiment==='Negative'?'sent--neg':'sent--neu';
    return `
      <div class="aspect-row">
        <div class="aspect-row__name">${esc(a.aspect)}</div>
        <div class="aspect-row__bar-bg">
          <div class="aspect-row__bar ${bc}" style="width:${a.confidence}%"></div>
        </div>
        <div class="aspect-row__sent ${sc}">${esc(a.sentiment)}</div>
        <div class="aspect-row__pct">${a.confidence}%</div>
      </div>`;
  }).join('');
}

function renderRAG(similar) {
  $('ragList').innerHTML = similar.map((t,i) => `
    <div class="rag__item" style="animation-delay:${i*.07}s">
      <div class="rag__num">${i+1}</div>
      <div class="rag__text">${esc(t)}</div>
    </div>`).join('');
}

// Model metrics (static for GitHub Pages)
function loadModelInfo() {
  const STATIC_RESULTS = {
    results: {
      'SVM':                 { accuracy:92.18, precision:92.45, recall:91.96, f1:92.20 },
      'Logistic Regression': { accuracy:91.74, precision:91.88, recall:91.62, f1:91.75 },
      'Naive Bayes':         { accuracy:87.32, precision:87.60, recall:87.01, f1:87.30 },
      'Random Forest':       { accuracy:86.51, precision:86.82, recall:86.21, f1:86.51 },
      'KNN':                 { accuracy:72.40, precision:73.11, recall:71.68, f1:72.39 },
    },
    best_model: 'SVM'
  };
  renderModelTable(STATIC_RESULTS, $('modelArea'));
}

function renderModelTable(data, area) {
  const rows = Object.entries(data.results)
    .sort(([,a],[,b])=>b.f1-a.f1)
    .map(([name,m])=>`
      <tr class="${name===data.best_model?'is-best':''}">
        <td>${esc(name)}${name===data.best_model?'<span class="best-tag">★ Best</span>':''}</td>
        <td><span class="mono">${m.accuracy}%</span></td>
        <td><span class="mono">${m.precision}%</span></td>
        <td><span class="mono">${m.recall}%</span></td>
        <td><span class="mono">${m.f1}%</span></td>
      </tr>`).join('');
  area.innerHTML = `
    <table class="model-table">
      <thead><tr>
        <th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1 Score</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Helpers ───────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled = on;
  analyzeBtn.querySelector('.btn__label').classList.toggle('hidden',on);
  analyzeBtn.querySelector('.btn__spinner').classList.toggle('hidden',!on);
}
function showError(msg) { errorBox.textContent='⚠  '+msg; errorBox.classList.remove('hidden'); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function animateNum(id,from,to,dur){
  const el=$(id),t0=performance.now();
  const ease=t=>1-Math.pow(1-t,3);
  (function step(now){
    const p=Math.min((now-t0)/dur,1);
    el.textContent=Math.round(from+(to-from)*ease(p));
    if(p<1)requestAnimationFrame(step);
  })(t0);
}

document.addEventListener('DOMContentLoaded', loadModelInfo);
