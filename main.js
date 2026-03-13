const COLORS = [
  '#7F77DD','#1D9E75','#D85A30','#378ADD',
  '#D4537E','#BA7517','#639922','#5F5E5A',
  '#9B4DCA','#0F6E56','#993C1D','#185FA5'
];

const DEFAULT_AREAS = [
  {name:'Salute',score:70},{name:'Carriera',score:55},
  {name:'Finanze',score:40},{name:'Relazioni',score:80},
  {name:'Crescita personale',score:60},{name:'Divertimento',score:50},
  {name:'Ambiente',score:65},{name:'Spiritualità',score:45},
];

let areas = [];

function color(i) { return COLORS[i % COLORS.length]; }

/* ── Toast ── */

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── Persistenza ── */

function saveData() {
  localStorage.setItem('ruota_aree', JSON.stringify(areas));
  const now = new Date().toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
  const oggi = new Date().toLocaleDateString('it-IT', {day:'2-digit', month:'short'});
  const ts = `${oggi} alle ${now}`;
  localStorage.setItem('ruota_saved', ts);
  document.getElementById('last-save').textContent = `Salvato il ${ts}`;
  showToast('Salvato nel browser');
}

function loadData() {
  const saved = localStorage.getItem('ruota_aree');
  const ts = localStorage.getItem('ruota_saved');
  if (saved) {
    try {
      areas = JSON.parse(saved);
      if (ts) document.getElementById('last-save').textContent = `Salvato il ${ts}`;
    } catch(e) {
      areas = DEFAULT_AREAS.map(a => ({...a}));
    }
  } else {
    areas = DEFAULT_AREAS.map(a => ({...a}));
  }
}

function resetData() {
  if (!confirm('Vuoi azzerare tutte le aree e tornare ai valori predefiniti?')) return;
  localStorage.removeItem('ruota_aree');
  localStorage.removeItem('ruota_saved');
  areas = DEFAULT_AREAS.map(a => ({...a}));
  document.getElementById('last-save').textContent = 'Nessun salvataggio';
  renderAll();
  showToast('Dati azzerati');
}

/* ── Import / Export ── */

function exportJSON() {
  const data = JSON.stringify({version:1, areas, exportedAt: new Date().toISOString()}, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ruota-della-vita.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      const imported = parsed.areas || parsed;
      if (!Array.isArray(imported)) throw new Error();
      areas = imported.map(a => ({
        name: String(a.name),
        score: Math.min(100, Math.max(1, Number(a.score)))
      }));
      renderAll();
      showToast('Dati importati');
    } catch(_) {
      showToast('File non valido');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ── Render ruota SVG ── */

function renderWheel() {
  const svg = document.getElementById('wheel');
  const n = areas.length;
  if (!n) { svg.innerHTML = ''; return; }

  const step = (2 * Math.PI) / n;
  const R = 110;
  let h = '';

  [0.25, 0.5, 0.75, 1].forEach(t => {
    h += `<circle cx="0" cy="0" r="${R*t}" fill="none" stroke="#E2DED6" stroke-width="0.5"/>`;
  });

  areas.forEach((a, i) => {
    const sa = i * step - Math.PI/2;
    const ea = (i+1) * step - Math.PI/2;
    const r = (a.score/100) * R;
    const x1 = r*Math.cos(sa), y1 = r*Math.sin(sa);
    const x2 = r*Math.cos(ea), y2 = r*Math.sin(ea);
    const large = step > Math.PI ? 1 : 0;
    const c = color(i);

    h += `<path d="M0,0 L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="1.5"/>`;
    h += `<line x1="0" y1="0" x2="${R*Math.cos(sa)}" y2="${R*Math.sin(sa)}" stroke="#E2DED6" stroke-width="0.5"/>`;

    const mid = (i+0.5)*step - Math.PI/2;
    const nr = R * 0.55;
    h += `<text x="${nr*Math.cos(mid)}" y="${nr*Math.sin(mid)}" text-anchor="middle" dominant-baseline="central" fill="${c}" font-size="12" font-weight="500" font-family="DM Sans, sans-serif">${i+1}</text>`;
  });

  h += `<circle cx="0" cy="0" r="4" fill="#7A7870"/>`;
  svg.innerHTML = h;
}

/* ── Render legenda ── */

function renderLegend() {
  const el = document.getElementById('legend');
  el.innerHTML = areas.map((a, i) => `
    <div class="legend-item">
      <span class="legend-num" style="background:${color(i)}">${i+1}</span>
      <span class="legend-name">${a.name}</span>
      <span class="legend-score">${Math.round(a.score)}</span>
    </div>`).join('');

  const avg = areas.length
    ? Math.round(areas.reduce((s, a) => s + a.score, 0) / areas.length)
    : '—';
  document.getElementById('avg-score').textContent = avg + (areas.length ? '/100' : '');
}

/* ── Render controlli ── */

function renderControls() {
  const el = document.getElementById('controls');
  let h = '';

  areas.forEach((a, i) => {
    const c = color(i);
    h += `<div class="area-card">
      <div class="card-header">
        <span class="dot" style="background:${c}"></span>
        <input class="area-name" data-i="${i}" value="${a.name.replace(/"/g, '&quot;')}"/>
        <span class="score-val" id="sc-${i}">${Math.round(a.score)}</span>
        <button class="del-btn" data-i="${i}" title="Rimuovi">×</button>
      </div>
      <input type="range" min="1" max="100" step="1" value="${Math.round(a.score)}" data-i="${i}"
        style="--thumb-color:${c}"
        oninput="onSlider(this)"/>
    </div>`;
  });

  h += `<button class="add-card" onclick="addArea()">+ aggiungi area</button>`;
  el.innerHTML = h;

  el.querySelectorAll('.area-name').forEach(inp => {
    inp.addEventListener('input', e => {
      areas[+e.target.dataset.i].name = e.target.value;
      renderLegend();
    });
  });

  el.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      areas.splice(+e.target.dataset.i, 1);
      renderAll();
    });
  });
}

function onSlider(el) {
  const i = +el.dataset.i;
  areas[i].score = +el.value;
  document.getElementById('sc-'+i).textContent = Math.round(areas[i].score);
  renderWheel();
  renderLegend();
}

function addArea() {
  areas.push({name:'Nuova area', score:50});
  renderAll();
  const inputs = document.querySelectorAll('.area-name');
  const last = inputs[inputs.length-1];
  last.focus();
  last.select();
}

/* ── Render completo ── */

function renderAll() {
  renderControls();
  renderWheel();
  renderLegend();
}

/* ── Init ── */

loadData();
renderAll();

window.addEventListener('beforeunload', () => {
  const saved = localStorage.getItem('ruota_aree');
  if (saved !== JSON.stringify(areas)) {
    return 'Hai modifiche non salvate.';
  }
});
