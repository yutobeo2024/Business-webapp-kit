# syntax=docker/dockerfile:1.7
# Image frontend: build Vite thành file tĩnh, phục vụ bằng Caddy. Build từ GỐC repo.
# Biến VITE_* bị nhúng vào JS lúc build, KHÔNG được chứa secret.

FROM node:24-alpine AS base
RUN npm install -g pnpm@10.34.6 turbo@2.11.6 && npm cache clean --force
WORKDIR /repo

FROM base AS prune
COPY . .
RUN rm -rf out && turbo prune @app/web --docker

FROM base AS build
COPY --from=prune /repo/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN turbo run build --filter=@app/web...

FROM caddy:2.10-alpine AS runtime
COPY --from=build /repo/apps/web/dist /srv
COPY infra/docker/web.Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
