# Imagen del game server de Aden (Colyseus). Se despliega en un host de Node
# PERSISTENTE (Railway/Render/Fly) — NO en Vercel (serverless, sin WebSocket con estado).
# El monorepo usa npm workspaces: el server depende de @aden/shared (symlink de workspace),
# por eso se copia todo el repo y se instala desde la raíz.
FROM node:20-slim
WORKDIR /app

# Copiar manifiestos primero para cachear la instalación de dependencias.
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install

# Copiar el código (ver .dockerignore: sin node_modules, dist ni assets del cliente).
COPY . .

# El host inyecta PORT; el server ya lo lee (server/src/index.ts).
ENV NODE_ENV=production
EXPOSE 2567
CMD ["npm", "run", "start", "--workspace", "@aden/server"]
