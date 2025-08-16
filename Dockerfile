# 1) Build frontend
FROM node:20 AS build-frontend
WORKDIR /app
COPY my-app/package*.json ./my-app/
RUN cd my-app && npm install
COPY my-app ./my-app
RUN cd my-app && npm run build    # outputs dist/

# 2) Install backend deps
FROM node:20 AS install-backend
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# 3) Final image
FROM node:20
WORKDIR /app
# backend app
COPY --from=install-backend /app/server /app/server
# copy built frontend into /server/client
COPY --from=build-frontend /app/my-app/dist /app/server/client

ENV NODE_ENV=production
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "index.js"]
