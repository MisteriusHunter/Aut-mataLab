/* Arena: el estudiante construye un autómata para un lenguaje dado y se evalúa
   contra TODAS las cadenas binarias de longitud ≤ 6 (127 pruebas, como un test unitario). */
const EX = [
  { id: 'termina01', t: 'Termina en 01', lvl: 1, opt: 3, p: 'Acepta las cadenas que terminan en 01.', f: s => s.endsWith('01') },
  { id: 'par0', t: 'Ceros pares', lvl: 1, opt: 2, p: 'Acepta las cadenas con una cantidad par de ceros (la vacía cuenta).', f: s => (s.match(/0/g) || []).length % 2 === 0 },
  { id: 'sin11', t: 'Sin 11', lvl: 2, opt: 3, p: 'Acepta las cadenas sin dos unos seguidos. Pista: necesitas un estado trampa.', f: s => !s.includes('11') },
  { id: 'cont101', t: 'Contiene 101', lvl: 2, opt: 4, p: 'Acepta las cadenas que contienen la subcadena 101.', f: s => s.includes('101') },
  { id: 'mod3', t: 'Múltiplo de 3', lvl: 3, opt: 3, p: 'Lee la cadena como número binario y acepta si es múltiplo de 3 (la vacía vale 0).', f: s => s === '' || parseInt(s, 2) % 3 === 0 }
];
// Batería de pruebas: '', '0', '1', '00', ... hasta longitud 6
const BATT = (() => { let lvl = [''], all = ['']; for (let i = 0; i < 6; i++) { lvl = lvl.flatMap(s => [s + '0', s + '1']); all.push(...lvl); } return all; })();
let ex = EX[0], best = {}, nSt = 3, amode = 'afd';
const names = n => Array.from({ length: n }, (_, i) => 'q' + i);
const rango = p => p >= 450 ? 'Maestro de estados' : p >= 250 ? 'Diseñador de AFD' : p >= 100 ? 'Aprendiz' : 'Novato';

function renderEx() {
  $('#exs').innerHTML = EX.map(e => `<button class="ex ${e === ex ? 'on' : ''}" data-id="${e.id}">${e.t}<small>Nivel ${e.lvl} · ${best[e.id] != null ? 'mejor ' + best[e.id] : 'sin intentar'}</small></button>`).join('');
  $('#prompt').textContent = ex.p;
}
/* Tabla editable de δ: AFD = un <select> por celda; AFND = texto con varios destinos ("q0,q1") */
function buildTable() {
  const Q = names(nSt);
  $('#bt').innerHTML = '<tr><th>δ</th><th>0</th><th>1</th><th>Final</th></tr>' + Q.map(q =>
    `<tr><th>${q === 'q0' ? '→ ' : ''}${q}</th>` + [0, 1].map(a => `<td>${amode === 'afd'
      ? `<select class="fld cell" data-k="${q},${a}">${Q.map(t => `<option>${t}</option>`).join('')}</select>`
      : `<input class="fld cell" data-k="${q},${a}" placeholder="∅" aria-label="δ(${q},${a})">`}</td>`).join('') +
    `<td><input type="checkbox" data-f="${q}" aria-label="${q} es final"></td></tr>`).join('');
}
function setArena(m) {
  amode = m;
  $('#r-afd').classList.toggle('on', m === 'afd'); $('#r-afnd').classList.toggle('on', m === 'afnd');
  $('#conv').hidden = m !== 'afnd';
  $('#hint').textContent = m === 'afd' ? 'AFD: elige exactamente un destino por celda. q0 es el estado inicial.' : 'AFND: escribe varios destinos separados por coma; vacío significa ∅.';
  buildTable();
}
function readModel() {
  const Q = names(nSt), d = {};
  document.querySelectorAll('#bt [data-k]').forEach(e => d[e.dataset.k] = e.tagName === 'SELECT' ? [e.value] : e.value.split(/[\s,{}]+/).filter(x => Q.includes(x)));
  return { Q, d, F: [...document.querySelectorAll('#bt [data-f]:checked')].map(e => e.dataset.f) };
}
// Simulación por conjuntos de estados: sirve igual para AFD (conjunto de tamaño 1) y AFND
const accepts = (m, w) => { let S = ['q0']; for (const c of w) S = [...new Set(S.flatMap(s => m.d[s + ',' + c] || []))]; return S.some(s => m.F.includes(s)); };

async function submit() {
  const m = readModel(), bad = []; let ok = 0;
  for (const w of BATT) { const got = accepts(m, w); got === ex.f(w) ? ok++ : bad.push({ w, want: !got }); }
  const acc = Math.floor(ok * 100 / BATT.length), perfect = ok === BATT.length, bonus = perfect && nSt <= ex.opt ? 20 : 0, pts = acc + bonus;
  $('#abar').style.width = acc + '%';
  $('#aout').innerHTML = `<b>${ok}/${BATT.length}</b> cadenas correctas, <b>${pts}</b> puntos${bonus ? ' (incluye +20 por usar el mínimo de estados)' : ''}` +
    (perfect ? `<p class="ok">Lenguaje exacto.${bonus ? '' : ` Usas ${nSt} estados y el mínimo es ${ex.opt}: redúcelos para ganar el bono.`}</p>`
      : `<ul class="l fails">${bad.slice(0, 4).map(b => `<li>«${b.w || 'ε'}» debía ${b.want ? 'aceptarse' : 'rechazarse'}</li>`).join('')}</ul>`);
  try { await submitScore(ex.id, pts, nSt); await loadBoard(); }
  catch (e) { $('#aout').insertAdjacentHTML('beforeend', '<p class="bad">No se pudo registrar el puntaje.</p>'); }
}
/* Construcción de subconjuntos: AFND → AFD equivalente (solo los subconjuntos alcanzables) */
function convert() {
  const m = readModel(), key = S => S.length ? '{' + [...S].sort().join(',') + '}' : '∅', seen = new Set(), todo = [['q0']], rows = [];
  while (todo.length) {
    const S = todo.shift(), k = key(S); if (seen.has(k)) continue; seen.add(k);
    const t = [0, 1].map(a => [...new Set(S.flatMap(s => m.d[s + ',' + a] || []))]); todo.push(...t);
    rows.push(`<tr><th>${rows.length ? '' : '→ '}${S.some(s => m.F.includes(s)) ? '*' : ''}${k}</th>${t.map(x => `<td>${key(x)}</td>`).join('')}</tr>`);
  }
  $('#aout').innerHTML = `<b>Construcción de subconjuntos:</b> el AFD equivalente tiene ${rows.length} estado(s) (máximo teórico 2<sup>${nSt}</sup> = ${2 ** nSt}).<table><tr><th>δ'</th><th>0</th><th>1</th></tr>${rows.join('')}</table>`;
}
async function loadBoard() {
  if (!user) return;
  try {
    best = await myScores(); renderEx();
    const r = await leaderboard();
    $('#rk').innerHTML = r.map((x, i) => `<tr class="${x.username === user.username ? 'me' : ''} ${i === 0 ? 'top' : ''}"><td>${i + 1}</td><td>${esc(x.username)}</td><td>${x.points}</td><td>${x.solved}/${EX.length}</td><td class="mut">${rango(x.points)}</td></tr>`).join('')
      || '<tr><td colspan="5" class="mut">Nadie ha puntuado todavía. Sé el primero.</td></tr>';
  } catch (e) { $('#rk').innerHTML = '<tr><td colspan="5" class="bad">No se pudo cargar el ranking.</td></tr>'; }
}

$('#exs').onclick = e => { const b = e.target.closest('.ex'); if (!b) return; ex = EX.find(x => x.id === b.dataset.id); renderEx(); $('#aout').innerHTML = ''; $('#abar').style.width = 0; };
$('#nst').innerHTML = [2, 3, 4, 5].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('');
$('#nst').onchange = e => { nSt = +e.target.value; buildTable(); };
$('#r-afd').onclick = () => setArena('afd'); $('#r-afnd').onclick = () => setArena('afnd');
$('#go').onclick = submit; $('#conv').onclick = convert;
renderEx(); setArena('afd');
