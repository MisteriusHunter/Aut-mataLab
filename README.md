# AutómataLab

Simulador de AFD/AFND + Arena de retos con ranking del curso. Sitio estático (sin build) con Supabase como backend.

## Estructura
- `index.html`: marcado semántico (teoría, simulador, arena, ranking, diálogo de login).
- `css/styles.css`: tokens de tema (oscuro/claro), glassmorphism y animaciones.
- `js/config.js`: URL y anon key de Supabase.
- `js/db.js`: único archivo que habla con la base de datos (auth, simulaciones, puntajes, ranking).
- `js/auth.js`: diálogo de ingreso/registro y estado de sesión; desbloquea Arena y Ranking.
- `js/sim.js`: autómatas, animación SVG de tokens, traza y guardado de simulaciones.
- `js/arena.js`: retos, constructor de tablas δ, evaluación contra 127 cadenas, subconjuntos y ranking.
- `schema.sql`: tablas, trigger de perfiles, función `submit_score`, vista `leaderboard` y políticas RLS.

## Puesta en marcha
1. Crea un proyecto en Supabase y ejecuta `schema.sql` en el SQL Editor.
2. Authentication → Providers → Email: desactiva "Confirm email" (más simple para el salón).
3. La URL y la anon key ya están en `js/config.js`; cámbialas solo si usas otro proyecto.
4. Abre `index.html` (mejor con un servidor local) o sube la carpeta a GitHub y conéctala a Vercel, Netlify o GitHub Pages.
