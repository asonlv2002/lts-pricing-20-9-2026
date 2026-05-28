FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# ── Deps ──────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy manifest files để pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/kieu-du-lieu/package.json ./packages/kieu-du-lieu/
COPY packages/hang-so/package.json ./packages/hang-so/
COPY packages/bang-tinh-gia/package.json ./packages/bang-tinh-gia/

RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source — packages dùng TS source trực tiếp nên phải có src/
COPY apps/web ./apps/web
COPY packages ./packages
COPY turbo.json ./

# NEXT_PUBLIC_* phải có lúc build vì Next.js inline vào JS bundle
ARG NEXT_PUBLIC_SERVICE_LTS_URL
ENV NEXT_PUBLIC_SERVICE_LTS_URL=$NEXT_PUBLIC_SERVICE_LTS_URL

RUN pnpm --filter web build

# ── Runner ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# standalone output chứa server.js + node_modules tối giản
COPY --from=builder --chown=nextjs:nextjs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nextjs /app/apps/web/public           ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
