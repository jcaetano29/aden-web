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

El server corre compilado: `server/build.mjs` empaqueta server + `@aden/shared` con esbuild en
`server/dist/index.js` (~30 ms) y `npm run start --workspace=@aden/server` compila y arranca
`node dist/index.js`. Medido en local: ~98 MB de RAM contra ~170–185 MB con `tsx`.

**Configuración real en Railway (servicio `@aden/server`, verificada 2026-09-25):** builder
**Railpack** (NO el Dockerfile), start command `npm run start --workspace=@aden/server`, watch
pattern `/server/**`, región `ams`. Con Railpack el start command es necesario; si algún día se
cambia el builder al Dockerfile, hay que **borrar** ese start command (el `CMD` de la imagen corre
`node` directo y la etapa final no trae esbuild).

**Railway** (recomendado, simple):
1. New Project → Deploy from GitHub repo (o `railway up` con la CLI) apuntando a este repo.
2. **Root Directory = RAÍZ del repo (dejalo vacío)** + **Dockerfile Path = `server/Dockerfile`**.
   ⚠️ NO pongas Root Directory = `server`: el server depende de `@aden/shared` (workspace),
   y el Dockerfile copia `shared/` + el `package.json` de la raíz, así que el *build context*
   tiene que ser la RAÍZ del repo (si el context es `server/`, el `COPY shared/...` falla).
   En Railway se setea con la variable `RAILWAY_DOCKERFILE_PATH=server/Dockerfile` o en Settings → Build.
3. Variables de entorno:
   - `SUPABASE_URL` = `https://lvxcgzfrxrrlkbvasidl.supabase.co`
   - `SUPABASE_SERVICE_KEY` = *(tu service_role key de Supabase — Settings → API)*
   - `PORT` lo inyecta Railway solo.
4. Deploy. Railway te da una URL pública `https://<algo>.up.railway.app`.
   El endpoint WebSocket es **`wss://<algo>.up.railway.app`** (mismo host, wss).

**Render** (alternativa): New → Web Service → este repo → Runtime **Docker**, Dockerfile `server/Dockerfile`, mismas envs. Da `https://<algo>.onrender.com` → `wss://<algo>.onrender.com`.

> Sin `SUPABASE_*`, el server corre igual pero con persistencia **in-memory** (no guarda entre reinicios).

## 2) Cliente → Vercel (estático)

Hay un `vercel.json` en la raíz (build del workspace del cliente, output `dist` (raíz)).

1. Vercel → Add New Project → importá este repo de GitHub (team `jcaetano29's projects`).
2. Vercel toma `vercel.json` (buildCommand `npm run build --workspace @aden/client`, output `dist` (raíz)).
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

## Cambios de schema: deploy coordinado

Cuando un commit cambia campos `@type` de `server/src/state/*`, el server (Railway) y el cliente (Vercel) deben deployarse con el mismo commit: un cliente nuevo contra un server viejo (o al revés) rompe la sincronización. La etapa A (Fragua, cimientos) cambia `PlayerState` (sub-estados `attributes`, `retention`, `sideChains`) y `MobState` (`hazardArc`, `hazardAngle`).

El watch pattern del servicio `@aden/server` en Railway es `/server/**` + `/shared/**` (desde 2026-09-25): un commit que toca `shared/` también redeploya el server, porque su bundle lo incluye. Un cambio solo en `package-lock.json` de la raíz no lo dispara.

## Simulador de balance

`npm run balance --workspace @aden/server` corre el combate real del server con bots por clase contra los jefes actuales y escribe `artifacts/balance/baseline.json`; con `-- --mana` mide cuánto dura la rotación del mago (`artifacts/balance/mana.json`). Es determinista (semilla fija) y no reemplaza partidas reales.
