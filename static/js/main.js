/* ═══════════════════════════════════════════════════
   VibeMetrics 2.0  —  main.js
   ═══════════════════════════════════════════════════ */

// ── Sample texts ────────────────────────────────────
const SAMPLES = {
  pos: 'This product is absolutely fantastic! The build quality is outstanding, delivery was incredibly fast, and it looks beautiful. I am completely satisfied with my purchase — it exceeded all my expectations. Highly recommend to everyone!',
  neg: 'Worst purchase I have ever made. The product broke after just one day of use, customer service was completely unhelpful and rude. Total waste of money. Arrived damaged and the quality is absolutely terrible. Do NOT buy this — I deeply regret it.',
  mix: 'The design looks really nice and it arrived quickly, which I appreciated. However, the build quality feels a bit cheap for the price and setup was confusing. Customer service was helpful when I reached out. Overall an average experience — decent but not great.'
};

// ── DOM refs ────────────────────────────────────────
const $  = id => document.getElementById(id);
const input     = $('textInput');
const charCount = $('charCount');
const analyzeBtn= $('analyzeBtn');
const results   = $('results');
const errorBox  = $('errorBox');

// ── Char counter ────────────────────────────────────
input.addEventListener('input', () => {
  const n = input.value.length;
  charCount.textContent = `${n} / 2000`;
  charCount.style.color = n > 1800 ? 'var(--red)' : '';
});

// ── Ctrl+Enter shortcut ──────────────────────────────
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAnalysis();
});

// ── Samples ─────────────────────────────────────────
function setSample(key) {
  input.value = SAMPLES[key];
  input.dispatchEvent(new Event('input'));
  input.focus();
}

// ── Clear ────────────────────────────────────────────
function clearInput() {
  input.value = '';
  input.dispatchEvent(new Event('input'));
  results.classList.add('hidden');
  errorBox.classList.add('hidden');
  input.focus();
}

// ── Analyze ──────────────────────────────────────────
async function runAnalysis() {
  const text = input.value.trim();
  if (text.length < 5) { showError('Please enter at least 5 characters.'); return; }

  setLoading(true);
  errorBox.classList.add('hidden');
  results.classList.add('hidden');

  try {
    const res  = await fetch('/analyze', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ text })
    });
    const data = await res.json();

    if (!res.ok || data.error) { showError(data.error || 'Analysis failed.'); return; }
    renderAll(data, text);
  } catch {
    showError('Connection error. Make sure the Flask server is running on port 5000.');
  } finally {
    setLoading(false);
  }
}

// ── Master render ─────────────────────────────────────
function renderAll(data, originalText) {
  const isPos = data.label === 'Positive';

  renderVerdict(data, isPos);
  renderHighlights(originalText, data.highlighted || []);
  renderAspects(data.aspects || []);
  renderRAG(data.similar || []);

  // Stats
  $('wCount').textContent = data.word_count ?? originalText.split(/\s+/).length;
  $('aCount').textContent = data.aspects?.length ?? 0;

  results.classList.remove('hidden');
  setTimeout(() => results.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

// ── Verdict + confidence ring ─────────────────────────
function renderVerdict(data, isPos) {
  $('verdictEmoji').textContent = isPos ? '😊' : '😞';
  const lbl = $('verdictLabel');
  lbl.textContent  = data.label;
  lbl.className    = 'verdict__label' + (isPos ? '' : ' verdict__label--neg');

  const fill = $('ringFill');
  fill.className = 'ring__fill' + (isPos ? '' : ' ring__fill--neg');

  const circ = 301.59;
  const pct  = Math.min(Math.max(data.confidence, 0), 100);
  setTimeout(() => { fill.style.strokeDashoffset = circ - (pct / 100) * circ; }, 80);
  animateNum('ringNum', 0, Math.round(pct), 900);
}

// ── Word highlights ───────────────────────────────────
function renderHighlights(text, hlData) {
  const hlMap = {};
  hlData.forEach(h => { hlMap[h.word.toLowerCase().replace(/[^a-z']/g, '')] = h.type; });

  const container = $('hlText');
  const parts = text.split(/(\s+)/);
  container.innerHTML = parts.map(seg => {
    const key = seg.toLowerCase().replace(/[^a-z']/g, '');
    if (hlMap[key] === 'positive') return `<span class="hl-pos">${esc(seg)}</span>`;
    if (hlMap[key] === 'negative') return `<span class="hl-neg">${esc(seg)}</span>`;
    return esc(seg);
  }).join('');
}

// ── Aspect bars ───────────────────────────────────────
function renderAspects(aspects) {
  const list = $('aspectsList');
  if (!aspects.length) {
    list.innerHTML = '<p style="color:var(--t3);font-size:.85rem">No specific aspects detected.</p>';
    return;
  }
  list.innerHTML = aspects.map(a => {
    const barCls  = a.sentiment === 'Positive' ? 'bar--pos' : a.sentiment === 'Negative' ? 'bar--neg' : 'bar--neu';
    const sentCls = a.sentiment === 'Positive' ? 'sent--pos': a.sentiment === 'Negative' ? 'sent--neg': 'sent--neu';
    const w = Math.min(a.confidence, 100);
    return `
      <div class="aspect-row">
        <div class="aspect-row__name">${esc(a.aspect)}</div>
        <div class="aspect-row__bar-bg">
          <div class="aspect-row__bar ${barCls}" style="width:${w}%"></div>
        </div>
        <div class="aspect-row__sent ${sentCls}">${esc(a.sentiment)}</div>
        <div class="aspect-row__pct">${a.confidence}%</div>
      </div>`;
  }).join('');
}

// ── RAG examples ─────────────────────────────────────
function renderRAG(similar) {
  const list = $('ragList');
  if (!similar.length) {
    list.innerHTML = '<p style="color:var(--t3);font-size:.84rem">No similar examples found in corpus.</p>';
    return;
  }
  list.innerHTML = similar.map((txt, i) => `
    <div class="rag__item" style="animation-delay:${i * 0.07}s">
      <div class="rag__num">${i + 1}</div>
      <div class="rag__text">${esc(truncate(txt, 200))}</div>
    </div>`).join('');
}

// ── Model metrics table ───────────────────────────────
async function loadModelInfo() {
  const area = $('modelArea');
  try {
    const res  = await fetch('/model-info');
    if (!res.ok) throw new Error();
    const data = await res.json();
    renderModelTable(data, area);
  } catch {
    area.innerHTML = `
      <div class="error-box">
        Model not trained yet. Run
        <code style="font-family:var(--mono);font-size:.88em;color:var(--purple-l)">
          python train_model.py
        </code>
        first, then restart the Flask server.
      </div>`;
  }
}

function renderModelTable(data, area) {
  const results = data.results || {};
  const best    = data.best_model || '';

  const rows = Object.entries(results)
    .sort(([,a],[,b]) => b.f1 - a.f1)
    .map(([name, m]) => `
      <tr class="${name === best ? 'is-best' : ''}">
        <td>
          ${esc(name)}
          ${name === best ? '<span class="best-tag">★ Best</span>' : ''}
        </td>
        <td><span class="mono">${m.accuracy}%</span></td>
        <td><span class="mono">${m.precision}%</span></td>
        <td><span class="mono">${m.recall}%</span></td>
        <td><span class="mono">${m.f1}%</span></td>
      </tr>`).join('');

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
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Helpers ───────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled = on;
  analyzeBtn.querySelector('.btn__label').classList.toggle('hidden', on);
  analyzeBtn.querySelector('.btn__spinner').classList.toggle('hidden', !on);
}
function showError(msg) {
  errorBox.textContent = '⚠  ' + msg;
  errorBox.classList.remove('hidden');
}
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }
function animateNum(id, from, to, dur) {
  const el = $(id), t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  (function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(from + (to - from) * ease(p));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

// ── Mobile nav (future use) ──────────────────────────
function toggleMenu() { /* extend if needed */ }

// ── Boot ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadModelInfo);
