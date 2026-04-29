/* ═══════════════════════════════════════════════════
   VibeMetrics 2.0 — FINAL PRODUCTION JS
   ═══════════════════════════════════════════════════ */

// ── Sample texts ────────────────────────────────────
const SAMPLES = {
  pos: 'This product is absolutely fantastic! The build quality is outstanding, delivery was incredibly fast.',
  neg: 'Worst purchase ever. Broke in one day. Customer service useless.',
  mix: 'Looks good but quality is average and setup is confusing.'
};

// ── DOM ─────────────────────────────────────────────
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
});

// ── Run Analysis ────────────────────────────────────
async function runAnalysis() {
  const text = input.value.trim();

  if (text.length < 5) {
    showError('Enter at least 5 characters');
    return;
  }

  setLoading(true);
  errorBox.classList.add('hidden');
  results.classList.add('hidden');

  try {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Failed');
      return;
    }

    renderAll(data, text);

  } catch {
    showError('Server error');
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
  $('aCount').textContent = data.aspects?.length || 0;

  results.classList.remove('hidden');
}

// ── Verdict ─────────────────────────────────────────
function renderVerdict(data, isPos) {
  $('verdictEmoji').textContent = isPos ? '😊' : '😞';

  const pct = Math.round(data.confidence || 0);
  $('ringNum').textContent = pct;

  const fill = $('ringFill');
  const circ = 301.59;
  fill.style.strokeDashoffset = circ - (pct / 100) * circ;
}

// ── Highlights ──────────────────────────────────────
function renderHighlights(text, hlData) {
  const map = {};

  hlData.forEach(h => {
    map[h.word.toLowerCase()] = h.type;
  });

  const container = $('hlText');

  container.innerHTML = text.split(/(\s+)/).map(w => {
    const key = w.toLowerCase().replace(/[^a-z]/g, '');

    if (map[key] === 'pos')
      return `<span class="hl-pos">${w}</span>`;
    if (map[key] === 'neg')
      return `<span class="hl-neg">${w}</span>`;

    return w;
  }).join('');
}

// ── Aspects ─────────────────────────────────────────
function renderAspects(aspects) {
  const list = $('aspectsList');

  if (!aspects.length) {
    list.innerHTML = '<p>No aspects found</p>';
    return;
  }

  list.innerHTML = aspects.map(a => {
    const score = a.score || 50;

    return `
      <div class="aspect-row">
        <div>${a.aspect}</div>
        <div style="background:#333;width:100%">
          <div style="width:${score}%;background:#00d4ff;height:6px"></div>
        </div>
        <div>${score}%</div>
      </div>
    `;
  }).join('');
}

// ── RAG ─────────────────────────────────────────────
function renderRAG(similar) {
  const list = $('ragList');

  if (!similar.length) {
    list.innerHTML = '<p>No similar examples</p>';
    return;
  }

  list.innerHTML = similar.map((t,i) => `
    <div>${i+1}. ${t.slice(0,120)}</div>
  `).join('');
}

// ── Metrics ─────────────────────────────────────────
async function loadModelInfo() {
  const area = $('modelArea');

  try {
    const res = await fetch('/metrics');
    const data = await res.json();

    area.innerHTML = `
      <table>
        <tr>
          <th>Model</th>
          <th>Acc</th>
          <th>Prec</th>
          <th>Recall</th>
          <th>F1</th>
        </tr>
        ${data.map(m => `
          <tr>
            <td>${m.model}</td>
            <td>${m.accuracy}</td>
            <td>${m.precision}</td>
            <td>${m.recall}</td>
            <td>${m.f1}</td>
          </tr>
        `).join('')}
      </table>
    `;

  } catch {
    area.innerHTML = '<p>Metrics not available</p>';
  }
}

// ── Utils ───────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled = on;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

// ── Boot ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadModelInfo);