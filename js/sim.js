/* Simulador AFD/AFND: modelo, animación SVG, traza y guardado de simulaciones. */
/* ============ Modelo de autómatas ============ */
const NS = 'http://www.w3.org/2000/svg', $ = s => document.querySelector(s), sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NODES = { q0: [100, 130], q1: [270, 130], q2: [440, 130] };
const PRE = {
  afd: { nd: false, start: 'q0', F: ['q2'],
    note: 'Un solo estado activo en cada instante; δ está definida para todo par (estado, símbolo).',
    d: { 'q0,0': ['q1'], 'q0,1': ['q0'], 'q1,0': ['q1'], 'q1,1': ['q2'], 'q2,0': ['q1'], 'q2,1': ['q0'] },
    E: [{ f: 'q0', t: 'q0', l: '1', d: 'M86 105C60 45 140 45 114 105', x: 100, y: 56 }, { f: 'q0', t: 'q1', l: '0', d: 'M128 130H242', x: 185, y: 120 },
        { f: 'q1', t: 'q1', l: '0', d: 'M256 105C230 45 310 45 284 105', x: 270, y: 56 }, { f: 'q1', t: 'q2', l: '1', d: 'M298 130H412', x: 355, y: 120 },
        { f: 'q2', t: 'q1', l: '0', d: 'M420 154Q355 205 290 154', x: 355, y: 196 }, { f: 'q2', t: 'q0', l: '1', d: 'M436 156Q270 280 104 156', x: 270, y: 228 }] },
  afnd: { nd: true, start: 'q0', F: ['q2'],
    note: 'Varios estados activos a la vez. Con 0 en q0 la máquina se bifurca; las ramas sin transición mueren (rojo).',
    d: { 'q0,0': ['q0', 'q1'], 'q0,1': ['q0'], 'q1,1': ['q2'] },
    E: [{ f: 'q0', t: 'q0', l: '0,1', d: 'M86 105C60 45 140 45 114 105', x: 100, y: 56 }, { f: 'q0', t: 'q1', l: '0', d: 'M128 130H242', x: 185, y: 120 },
        { f: 'q1', t: 'q2', l: '1', d: 'M298 130H412', x: 355, y: 120 }] }
};
let A = PRE.afd, input = '', idx = 0, cur = ['q0'], busy = false, running = false, done = false, trace = [], mode = 'afd';
const fmt = s => s.length ? (A.nd ? '{' + s.join(', ') + '}' : s[0]) : '∅';
const ms = () => 1600 - $('#spd').value * 250;

function draw() {
  const g = A.E.map((e, i) => `<path id="e${i}" class="edge" d="${e.d}"/><text class="lbl" x="${e.x}" y="${e.y}">${e.l}</text>`).join('');
  const n = Object.entries(NODES).map(([k, [x, y]]) => `<g class="node" id="n-${k}" transform="translate(${x} ${y})"><circle r="28"/>${A.F.includes(k) ? '<circle class="in" r="22"/>' : ''}<text>${k}</text></g>`).join('');
  $('#svg').innerHTML = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="#8d92a8"/></marker></defs><path class="edge" d="M28 130H70"/>${g}${n}<g id="tok"></g>`;
  $('#delta').innerHTML = '<tr><th>δ</th><th>0</th><th>1</th></tr>' + Object.keys(NODES).map(q => `<tr><th>${q === 'q0' ? '→' : ''}${A.F.includes(q) ? '*' : ''}${q}</th>${[0, 1].map(a => `<td>${fmt(A.d[q + ',' + a] || [])}</td>`).join('')}</tr>`).join('');
  $('#note').textContent = A.note;
}
function paint() {
  Object.keys(NODES).forEach(q => $('#n-' + q).classList.toggle('act', cur.includes(q)));
  $('#tape').innerHTML = [...input].map((c, i) => `<span class="chip ${i < idx ? 'done' : i === idx ? 'cur' : ''}">${c}</span>`).join('') || '<span class="mut mono">ε (cadena vacía)</span>';
  $('#cur').textContent = 'δ̂ = ' + fmt(cur);
}
/* Token que viaja por la arista con aceleración suave (easeInOutCubic) */
function fly(i) {
  return new Promise(res => {
    const p = $('#e' + i), c = document.createElementNS(NS, 'circle'), L = p.getTotalLength(), t0 = performance.now(), d = ms() * .8;
    c.setAttribute('r', 7); c.setAttribute('class', 'tok'); $('#tok').appendChild(c); p.classList.add('on');
    (function f(t) {
      const k = Math.min(1, (t - t0) / d), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, pt = p.getPointAtLength(L * e);
      c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
      if (k < 1) requestAnimationFrame(f); else { c.remove(); p.classList.remove('on'); res(); }
    })(t0);
  });
}
function pulse(s) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', NODES[s][0]); c.setAttribute('cy', NODES[s][1]); c.setAttribute('r', 10); c.setAttribute('class', 'tok dead'); $('#tok').appendChild(c); setTimeout(() => c.remove(), 800); }

async function step() {
  if (busy) return;
  if (idx >= input.length) return finish();
  busy = true;
  const a = input[idx], next = new Set(), jobs = [], dead = [];
  cur.forEach(s => {
    const t = A.d[s + ',' + a] || [];
    if (!t.length) dead.push(s);
    t.forEach(x => { next.add(x); jobs.push(fly(A.E.findIndex(e => e.f === s && e.t === x && e.l.split(',').includes(a)))); });
  });
  dead.forEach(pulse);
  await Promise.all(jobs); if (!jobs.length) await sleep(ms() * .6);
  const tr = { n: idx + 1, sym: a, from: cur, to: [...next], dead }; trace.push(tr);
  $('#log').insertAdjacentHTML('beforeend', `<li><span class="mut">#${tr.n}</span> ${fmt(tr.from)} <b>—${a}→</b> ${fmt(tr.to)}${dead.length ? ` <em class="bad">✕ ${dead.join(', ')}</em>` : ''}</li>`);
  $('#log').scrollTop = 9999;
  cur = tr.to; idx++; paint(); busy = false;
  if (idx >= input.length) finish();
}
function finish() {
  if (done) return; done = true;
  const acc = cur.some(s => A.F.includes(s)), r = $('#res');
  r.className = 'res ' + (acc ? 'ok' : 'bad');
  r.innerHTML = (acc ? '✓ Cadena aceptada' : '✗ Cadena rechazada') + `<small>${A.nd ? `δ̂(q₀, w) ∩ F ${acc ? '≠' : '='} ∅` : `δ̂(q₀, w) = ${fmt(cur)} ${acc ? '∈' : '∉'} F`}</small>`;
  $('#save').disabled = false;
}
function reset() {
  if (busy) return;
  const v = $('#in').value.trim(), ok = /^[01]*$/.test(v);
  $('#err').hidden = ok; input = ok ? v : ''; idx = 0; cur = [A.start]; trace = []; done = false;
  $('#log').innerHTML = ''; $('#res').className = 'res'; $('#save').disabled = true; paint();
}
async function hardReset() { running = false; $('#run').textContent = 'Ejecutar'; while (busy) await sleep(30); reset(); }
async function run() {
  if (running) { running = false; return; }
  if (done) reset();
  running = true; $('#run').textContent = 'Pausar';
  while (running && !done) { await step(); await sleep(220); }
  running = false; $('#run').textContent = 'Ejecutar';
}
function setMode(m) {
  mode = m; A = PRE[m];
  $('#m-afd').classList.toggle('on', m === 'afd'); $('#m-afnd').classList.toggle('on', m === 'afnd');
  draw(); hardReset();
}
async function loadSaved() {
  try {
    const r = await listSims();
    $('#saved').innerHTML = r.length ? r.map(x => `<li>${esc(x.automaton_type)} <code>${esc(x.input || 'ε')}</code> <b class="${x.accepted ? 'ok' : 'bad'}">${x.accepted ? 'aceptada' : 'rechazada'}</b></li>`).join('') : '<li class="mut">Aún no hay simulaciones. Ejecuta una cadena y guárdala.</li>';
  } catch (e) { $('#saved').innerHTML = '<li class="bad">No se pudo cargar. Revisa la conexión con Supabase.</li>'; }
}

/* ============ Eventos ============ */
$('#step').onclick = () => { if (!running) step(); };
$('#run').onclick = run; $('#rst').onclick = hardReset;
$('#in').oninput = hardReset;
$('#m-afd').onclick = () => setMode('afd'); $('#m-afnd').onclick = () => setMode('afnd');
$('#save').onclick = async () => {
  try { await saveSim({ automaton_type: mode.toUpperCase(), preset: 'termina_en_01', input, accepted: cur.some(s => A.F.includes(s)), trace }); $('#save').disabled = true; loadSaved(); }
  catch (e) { $('#saved').insertAdjacentHTML('afterbegin', `<li class="bad">${e.message === 'auth' ? 'Inicia sesión para guardar.' : 'No se pudo guardar la simulación.'}</li>`); }
};
$('#theme').onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; ls.set('theme', t); };
if (ls.get('theme')) document.documentElement.dataset.theme = ls.get('theme');
$('#store').textContent = sb ? 'Almacenamiento: Supabase' : 'Almacenamiento: local (sin claves de Supabase)';
setMode('afd'); loadSaved();
