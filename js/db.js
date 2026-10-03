/* Capa de datos: es el único archivo que habla con Supabase. */
let sb = null;
try { if (SB_URL && SB_KEY) sb = window.supabase.createClient(SB_URL, SB_KEY); } catch (e) {}
let user = null; // { id, username } mientras haya sesión; la rellena auth.js

// localStorage protegido (solo se usa para recordar el tema)
const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k)) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} } };
const need = () => { if (!sb || !user) throw new Error('auth'); };

// --- Autenticación (correo + contraseña; el usuario público viaja en user_metadata) ---
const dbSignUp = (email, password, username) => sb.auth.signUp({ email, password, options: { data: { username } } });
const dbSignIn = (email, password) => sb.auth.signInWithPassword({ email, password });
const dbSignOut = () => sb.auth.signOut();

// --- Simulaciones del estudiante ---
async function saveSim(r) { need(); const { error } = await sb.from('simulations').insert(r); if (error) throw error; }
async function listSims() {
  if (!sb || !user) return [];
  const { data, error } = await sb.from('simulations').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) throw error; return data;
}

// --- Retos: submit_score (función SQL) guarda solo el mejor puntaje por reto ---
async function submitScore(ex, score, states) {
  need(); const { error } = await sb.rpc('submit_score', { p_ex: ex, p_score: score, p_states: states }); if (error) throw error;
}
async function myScores() {
  need(); const { data, error } = await sb.from('scores').select('exercise,score'); if (error) throw error;
  return Object.fromEntries(data.map(r => [r.exercise, r.score]));
}
async function leaderboard() {
  need(); const { data, error } = await sb.from('leaderboard').select('*').limit(50); if (error) throw error; return data;
}
