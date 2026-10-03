/* Interfaz de autenticación: diálogo de ingreso/registro y estado de sesión.
   Al iniciar sesión se desbloquean la Arena y el Ranking (clase body.auth + atributo inert). */
let regMode = false;

function setUser(u) {
  user = u ? { id: u.id, username: u.user_metadata?.username || u.email.split('@')[0] } : null;
  document.body.classList.toggle('auth', !!user);
  document.querySelectorAll('.gate-in').forEach(e => e.inert = !user);
  $('#who').innerHTML = user ? `<span>${esc(user.username)}</span><button class="btn" id="out">Salir</button>` : '<button class="btn pri open-auth">Ingresar</button>';
  loadSaved(); if (user) loadBoard();
}
function paintAuth() {
  $('#a-title').textContent = regMode ? 'Crear cuenta' : 'Ingresar';
  $('#a-user').hidden = !regMode;
  $('#a-go').textContent = regMode ? 'Registrarme' : 'Entrar';
  $('#a-sw').textContent = regMode ? '¿Ya tienes cuenta? Ingresa' : '¿Primera vez? Crea tu cuenta';
  $('#a-msg').textContent = sb ? '' : 'Falta configurar js/config.js con las claves de Supabase.';
}
function openAuth() { paintAuth(); $('#auth').showModal(); }

document.addEventListener('click', e => {
  if (e.target.closest('.open-auth')) openAuth();
  else if (e.target.id === 'out') dbSignOut();
});
$('#a-sw').onclick = () => { regMode = !regMode; paintAuth(); };
$('#a-x').onclick = () => $('#auth').close();
$('#a-form').onsubmit = async e => {
  e.preventDefault();
  const msg = $('#a-msg'), name = $('#a-name').value.trim();
  if (!sb) return paintAuth();
  if (regMode && !/^[\w-]{3,20}$/.test(name)) { msg.textContent = 'Usuario: 3 a 20 letras, números, _ o -.'; return; }
  msg.textContent = 'Un momento…';
  const f = regMode ? dbSignUp : dbSignIn;
  const { data, error } = await (regMode ? f($('#a-email').value.trim(), $('#a-pass').value, name) : f($('#a-email').value.trim(), $('#a-pass').value));
  if (error) {
    msg.textContent = /Database error/i.test(error.message) ? 'Ese nombre de usuario ya está en uso.'
      : /Invalid login/i.test(error.message) ? 'Correo o contraseña incorrectos.' : error.message;
    return;
  }
  if (!data.session) { msg.textContent = 'Cuenta creada. Confirma tu correo y luego ingresa.'; return; }
  $('#auth').close();
};

// Arranque: restaura la sesión y reacciona a login/logout.
// setTimeout evita llamar a Supabase dentro del propio callback de auth.
if (sb) sb.auth.onAuthStateChange((_ev, s) => setTimeout(() => setUser(s?.user), 0));
else setUser(null);
