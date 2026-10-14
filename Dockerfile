FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=build_ca if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Assemble once, then copy the runtime tree in one layer (also works with VFS).
RUN npm run build && npm prune --omit=dev --no-audit --no-fund && mkdir /runtime && cp -a .next node_modules public data migrations python scripts package.json next.config.ts tsconfig.json deployment /runtime/ && chmod 755 /runtime/deployment/start.sh

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY python/requirements.txt /tmp/pdf-requirements.txt
RUN --mount=type=secret,id=build_ca apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates gosu && rm -rf /var/lib/apt/lists/* && python3 -m venv /opt/pdf && if [ -f /run/secrets/build_ca ]; then export PIP_CERT=/run/secrets/build_ca; fi; /opt/pdf/bin/pip install --no-cache-dir -r /tmp/pdf-requirements.txt && mkdir -p /app/.local && chown node:node /app/.local
ENV PATH="/opt/pdf/bin:$PATH" NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 SQLITE_PATH=/app/.local/gc-predictor.sqlite
COPY --from=build --chown=node:node /runtime/ /app/
EXPOSE 3000
ENTRYPOINT ["/app/deployment/start.sh"]
