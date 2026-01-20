FROM node:25-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=core --prod --legacy deploy /prod/app

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

RUN addgroup -S server && adduser -S server -G server

COPY --from=builder /prod/app .

RUN chown -R server:server /app
USER server

EXPOSE 5000
CMD ["node", "src/index.js"]
