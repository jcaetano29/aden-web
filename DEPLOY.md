# Deploy de Aden Web

Aden tiene **dos piezas** con hosting distinto:

| Pieza | Qué es | Dónde va | Por qué |
|---|---|---|---|
| **Cliente** (`@aden/client`) | SPA estática (Vite + Three.js) | **Vercel** | Es HTML/JS/assets estáticos. |
| **Server** (`@aden/server`) | Colyseus (WebSocket con estado en memoria, salas 15 Hz) | **Railway / Render / Fly** (Node persistente) | Vercel es serverless/stateless → **no** corre un WebSocket con estado. |

> El cliente se conecta al server por WebSocket usando la env **`VITE_SERVER_URL`** (baked en build).
> Por eso el **orden es: primero el server** (para tener su URL `wss://…`), **después el cliente**.

---

## 1) Server → Railway o Render (Node persistente)

Hay un `server/Dockerfile` + `.dockerignore` listos (el server ya lee `process.env.PORT`).

**Railway** (recomendado, simple):
1. New Project → Deploy from GitHub repo (o `railway up` con la CLI) apuntando a este repo.
2. Railway detecta el `Dockerfile` en `server/` — o setealo como *Root Directory* `server` / *Dockerfile path* `server/Dockerfile`.
3. Variables de entorno:
   - `SUPABASE_URL` = `https://lvxcgzfrxrrlkbvasidl.supabase.co`
   - `SUPABASE_SERVICE_KEY` = *(tu service_role key de Supabase — Settings → API)*
   - `PORT` lo inyecta Railway solo.
4. Deploy. Railway te da una URL pública `https://<algo>.up.railway.app`.
   El endpoint WebSocket es **`wss://<algo>.up.railway.app`** (mismo host, wss).

**Render** (alternativa): New → Web Service → este repo → Runtime **Docker**, Dockerfile `server/Dockerfile`, mismas envs. Da `https://<algo>.onrender.com` → `wss://<algo>.onrender.com`.

> Sin `SUPABASE_*`, el server corre igual pero con persistencia **in-memory** (no guarda entre reinicios).

## 2) Cliente → Vercel (estático)

Hay un `vercel.json` en la raíz (build del workspace del cliente, output `client/dist`).

1. Vercel → Add New Project → importá este repo de GitHub (team `jcaetano29's projects`).
2. Vercel toma `vercel.json` (buildCommand `npm run build --workspace @aden/client`, output `client/dist`).
3. Environment Variable:
   - `VITE_SERVER_URL` = **`wss://<tu-server-de-railway>`** (del paso 1).
4. Deploy. Vercel te da `https://<algo>.vercel.app`.

> Si redeployás el server a otra URL, actualizá `VITE_SERVER_URL` en Vercel y **rebuild** el cliente (la env se hornea en el bundle).

## 3) Verificación

- Abrí la URL de Vercel → elegí clase → deberías conectar y ver el mundo.
- Si el server no está arriba, el cliente muestra un overlay "Aden está dormida" con botón Reintentar (no se cuelga).

## Notas

- **CORS/origen**: Colyseus + WS no necesita config de CORS especial para el WS; si agregás endpoints HTTP, permití el origen de Vercel.
- **Costo**: Vercel Hobby (gratis) + Railway/Render (free tier con límites; el server duerme en algunos free tiers → primer request lo despierta).
- **Supabase**: ya está el proyecto `aden-web` (ref `lvxcgzfrxrrlkbvasidl`) con las tablas/migraciones aplicadas (characters, guilds, columnas equipment/progress). Solo falta la service key en el env del server.
