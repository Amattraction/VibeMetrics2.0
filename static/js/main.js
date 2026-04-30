/* ═══════════════════════════════════════════════════
   VibeMetrics 2.0 — FIXED PRODUCTION JS
   ═══════════════════════════════════════════════════ */

// ── Sample texts ────────────────────────────────────
const SAMPLES = {
  pos: 'Absolutely love this product! The build quality is outstanding and the design looks beautiful. ' +
       'Delivery was incredibly fast — arrived two days early. Customer service was helpful and responsive. ' +
       'Excellent value for money, would highly recommend to everyone. Five stars without hesitation!',

  neg: 'Worst purchase I have ever made. The product broke after just one day of use and the quality is ' +
       'absolutely terrible. Customer service was completely unhelpful and refused to process my refund. ' +
       'Arrived damaged, nothing like the photos. Total waste of money — avoid this at all costs.',

  mix: 'The design looks really nice and delivery was fast, which I appreciated. However the build quality ' +
       'feels a bit cheap for the price and the setup process was quite confusing. Customer service was ' +
       'helpful when I contacted them. Overall an average experience — decent product but not worth the cost.'
};

// ── DOM ─────────────────────────────────────────────
const $       = id => document.getElementById(id);
const input   = $('textInput');
const charCount  = $('charCount');
const analyzeBtn = $('analyzeBtn');
const results    = $('results');
const errorBox   = $('errorBox');

// ── Char counter ────────────────────────────────────
input.addEventListener('input', () => {
  const n = input.value.length;
  charCount.textContent = `${n} / 2000`;
  charCount.style.color = n > 1800 ? 'var(--red, #f87171)' : '';
});

// ── Ctrl + Enter shortcut ───────────────────────────
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAnalysis();
});

// ── Run Analysis ────────────────────────────────────
async function runAnalysis() {
  const text = input.value.trim();

  if (text.length < 5) {
    showError('Please enter at least 5 characters.');
    return;
  }

  setLoading(true);
  errorBox.classList.add('hidden');
  results.classList.add('hidden');

  try {
    const res  = await fetch('/analyze', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ text }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Analysis failed. Please try again.');
      return;
    }

    renderAll(data, text);

  } catch {
    showError('Connection error. Make sure the server is running.');
  } finally {
    setLoading(false);
  }
}

// ── Render All ──────────────────────────────────────
function renderAll(data, text) {
  const isPos = data.label === 'Positive';

  renderVerdict(data, isPos);
  renderHighlights(text, data.highlighted || []);
  renderAspects(data.aspects || []);
  renderRAG(data.similar || []);

  $('wCount').textContent = data.word_count || text.split(/\s+/).length;
  $('aCount').textContent = (data.aspects || []).length;

  results.classList.remove('hidden');

  // Scroll into view
  setTimeout(() => {
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

// ── Verdict ─────────────────────────────────────────
// FIX: set verdictLabel text + colour class; animate ring; toggle ring colour
function renderVerdict(data, isPos) {
  // Emoji
  $('verdictEmoji').textContent = isPos ? '😊' : '😞';

  // Label text + class
  const lbl = $('verdictLabel');
  lbl.textContent = data.label;
  lbl.className   = 'verdict__label' + (isPos ? '' : ' verdict__label--neg');

  // Ring colour
  const fill = $('ringFill');
  fill.className = 'ring__fill' + (isPos ? '' : ' ring__fill--neg');

  // Animate confidence number
  const target = Math.round(data.confidence || 0);
  animateNum('ringNum', 0, target, 900);

  // Animate ring stroke
  const circ = 301.59;
  fill.style.strokeDashoffset = circ; // reset first
  setTimeout(() => {
    fill.style.transition = 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)';
    fill.style.strokeDashoffset = circ - (target / 100) * circ;
  }, 80);
}

// ── Word Highlights ─────────────────────────────────
function renderHighlights(text, hlData) {
  const map = {};
  hlData.forEach(h => {
    // key is cleaned word; store original for display
    const key = h.word.toLowerCase().replace(/[^a-z']/g, '');
    map[key] = h.type;
  });

  const container = $('hlText');
  container.innerHTML = text.split(/(\s+)/).map(seg => {
    const key = seg.toLowerCase().replace(/[^a-z']/g, '');
    if (map[key] === 'positive') return `<span class="hl-pos">${esc(seg)}</span>`;
    if (map[key] === 'negative') return `<span class="hl-neg">${esc(seg)}</span>`;
    return esc(seg);
  }).join('');
}

// ── Aspect bars ─────────────────────────────────────
// FIX: score from backend is already 0–100 float (e.g. 87.4), not 0–1
// FIX: use proper CSS classes for bar colours and sentiment labels
function renderAspects(aspects) {
  const list = $('aspectsList');

  if (!aspects.length) {
    list.innerHTML = '<p style="color:var(--t3,#475569);font-size:.85rem">No specific aspects detected.</p>';
    return;
  }

  list.innerHTML = aspects.map(a => {
    const score   = Math.min(a.score || 50, 100);
    const barCls  = a.sentiment === 'Positive' ? 'bar--pos'
                  : a.sentiment === 'Negative' ? 'bar--neg' : 'bar--neu';
    const sentCls = a.sentiment === 'Positive' ? 'sent--pos'
                  : a.sentiment === 'Negative' ? 'sent--neg' : 'sent--neu';

    return `
      <div class="aspect-row">
        <div class="aspect-row__name">${esc(a.aspect)}</div>
        <div class="aspect-row__bar-bg">
          <div class="aspect-row__bar ${barCls}" style="width:${score}%"></div>
        </div>
        <div class="aspect-row__sent ${sentCls}">${esc(a.sentiment)}</div>
        <div class="aspect-row__pct">${score}%</div>
      </div>`;
  }).join('');
}

// ── RAG list ────────────────────────────────────────
// FIX: backend now returns plain strings (not objects), so no .text needed
function renderRAG(similar) {
  const list = $('ragList');

  if (!similar.length) {
    list.innerHTML = '<p style="color:var(--t3,#475569);font-size:.84rem">No similar examples found in corpus.</p>';
    return;
  }

  list.innerHTML = similar.map((item, i) => {
    // Handle both plain string and object with .text / .review key (defensive)
    const txt = typeof item === 'string' ? item
              : (item.text || item.review || '');
    return `
      <div class="rag__item" style="animation-delay:${i * 0.07}s">
        <div class="rag__num">${i + 1}</div>
        <div class="rag__text">${esc(truncate(txt, 200))}</div>
      </div>`;
  }).join('');
}

// ── Model Metrics table ──────────────────────────────
// FIX: /metrics now returns a list; render with proper styling + best-model badge
async function loadModelInfo() {
  const area = $('modelArea');

  try {
    const res  = await fetch('/metrics');
    const data = await res.json();

    // data is now an array: [{model, accuracy, precision, recall, f1, is_best}, ...]
    if (!Array.isArray(data) || !data.length) {
      area.innerHTML = noMetricsMsg();
      return;
    }

    area.innerHTML = `
      <table class="model-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Accuracy</th>
            <th>Precision</th>
            <th>Recall</th>
            <th>F1 Score</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(m => `
            <tr class="${m.is_best ? 'is-best' : ''}">
              <td>
                ${esc(m.model)}
                ${m.is_best ? '<span class="best-tag">★ Best</span>' : ''}
              </td>
              <td><span class="mono">${m.accuracy}</span></td>
              <td><span class="mono">${m.precision}</span></td>
              <td><span class="mono">${m.recall}</span></td>
              <td><span class="mono">${m.f1}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>`;

  } catch {
    area.innerHTML = noMetricsMsg();
  }
}

function noMetricsMsg() {
  return `<p style="color:var(--t3,#475569);text-align:center;padding:32px">
    Model metrics not available. Run <code style="color:#7c6af7">python train_model.py</code> first.
  </p>`;
}

// ── Helpers ───────────────────────────────────────────
// FIX: also toggle spinner visibility
function setLoading(on) {
  analyzeBtn.disabled = on;
  const lbl = analyzeBtn.querySelector('.btn__label');
  const spn = analyzeBtn.querySelector('.btn__spinner');
  if (lbl) lbl.classList.toggle('hidden', on);
  if (spn) spn.classList.toggle('hidden', !on);
}

function showError(msg) {
  errorBox.textContent = '⚠  ' + msg;
  errorBox.classList.remove('hidden');
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// Smooth number counter animation
function animateNum(id, from, to, dur) {
  const el = $(id);
  const t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  (function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(from + (to - from) * ease(p));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

function toggleMenu() { /* mobile nav — extend if needed */ }

// ── Boot ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadModelInfo();

  analyzeBtn.addEventListener('click', runAnalysis);

  $('clearBtn').addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    results.classList.add('hidden');
    errorBox.classList.add('hidden');
    input.focus();
  });

  $('btnPos').addEventListener('click', () => {
    input.value = SAMPLES.pos;
    input.dispatchEvent(new Event('input'));
  });
  $('btnNeg').addEventListener('click', () => {
    input.value = SAMPLES.neg;
    input.dispatchEvent(new Event('input'));
  });
  $('btnMix').addEventListener('click', () => {
    input.value = SAMPLES.mix;
    input.dispatchEvent(new Event('input'));
  });
});