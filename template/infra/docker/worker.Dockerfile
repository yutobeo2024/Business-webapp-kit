# syntax=docker/dockerfile:1.7
# Image production cho @app/worker. Build từ GỐC repo: docker build -f infra/docker/worker.Dockerfile .
# Các bước đã được kiểm chứng: turbo prune -> cài frozen lockfile -> build -> pnpm deploy chỉ dependency production.

FROM node:24-alpine AS base
RUN npm install -g pnpm@10.34.6 turbo@2.11.6 && npm cache clean --force
WORKDIR /repo

FROM base AS prune
COPY . .
RUN rm -rf out && turbo prune @app/worker --docker

FROM base AS build
COPY --from=prune /repo/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN turbo run build --filter=@app/worker... \
 && pnpm --filter @app/worker deploy --legacy --prod /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
# Worker không có cổng HTTP. Docker tự khởi động lại khi tiến trình thoát (restart: unless-stopped).
CMD ["node", "--enable-source-maps", "dist/main.js"]
