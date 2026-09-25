# Imagen del game server de Aden (Colyseus). Se despliega en un host de Node
# PERSISTENTE (Railway/Render/Fly) — NO en Vercel (serverless, sin WebSocket con estado).
# El build context es la RAÍZ del repo (npm workspaces: el server depende de @aden/shared).

# --- build: compila server + @aden/shared a un único bundle JS (server/build.mjs) ---
FROM node:20-slim AS build
WORKDIR /app
# El lockfile describe los tres workspaces: sus manifiestos tienen que estar para `npm ci`.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
# Solo las dependencias del server (sin three/vite del cliente).
RUN npm ci --workspace @aden/server
COPY shared ./shared
COPY server ./server
RUN npm run build --workspace @aden/server

# --- runtime: dependencias de producción + el bundle; sin TypeScript ni tsx en memoria ---
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --workspace @aden/server --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist ./server/dist

# El host inyecta PORT; el server ya lo lee (server/src/index.ts).
EXPOSE 2567
CMD ["node", "--enable-source-maps", "server/dist/index.js"]
