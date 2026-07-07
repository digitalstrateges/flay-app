FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:20-alpine
RUN apk add --no-cache tini curl

WORKDIR /app
RUN adduser -D flay && mkdir -p /app/data /app/uploads

COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN chown -R flay:flay /app

USER flay
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -s http://localhost:4000/api/health | grep -q '"status":"ok"' || exit 1

LABEL org.opencontainers.image.title="Flay Super App"
LABEL org.opencontainers.image.version="1.02"
LABEL org.opencontainers.image.vendor="DIGITALSTRATEGES"
LABEL org.opencontainers.image.description="Plateforme tout-en-un : showcase, e-commerce, CRM, reservations"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
