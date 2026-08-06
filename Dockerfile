FROM node:22-bookworm-slim AS build

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci \
  --prefer-offline \
  --fetch-retries=5 \
  --fetch-retry-mintimeout=20000 \
  --fetch-retry-maxtimeout=120000

COPY . .

ENV NX_DAEMON=false
ENV NX_ISOLATE_PLUGINS=false

RUN npm exec -- nx run web:build --configuration production

FROM nginx:1.29-alpine AS runtime

RUN apk add --no-cache jq

COPY tools/docker/nginx.conf /etc/nginx/nginx.conf
COPY tools/docker/security-headers.conf /etc/nginx/security-headers.conf
COPY tools/docker/container-entrypoint.sh /usr/local/bin/spendist-entrypoint
COPY --from=build --chown=nginx:nginx /workspace/dist/apps/web/browser /usr/share/nginx/html

RUN chmod 755 /usr/local/bin/spendist-entrypoint \
  && mkdir -p /tmp/nginx/client-body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
  && chown -R nginx:nginx /usr/share/nginx/html /tmp/nginx

USER nginx

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/spendist-entrypoint"]
