FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tini curl

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN mkdir -p /app/data /app/uploads && \
    adduser -D flay && \
    chown -R flay:flay /app

USER flay

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -s http://localhost:4000/api/health | grep -q '"status":"ok"' || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
