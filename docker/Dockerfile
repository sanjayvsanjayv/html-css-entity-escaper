# syntax=docker/dockerfile:1

# ---------------------------------------------------------------
# HTML / CSS Entity Escaper — production image
# Static site served by nginx:alpine (small, no build step needed
# since the app is plain HTML/CSS/JS).
# ---------------------------------------------------------------
FROM nginx:1.27-alpine

LABEL maintainer="Sanjay V <24105134>" \
      description="HTML/CSS Entity Escaper - static frontend served by nginx"

# Custom nginx config: adds a /health endpoint and sane static-file caching.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Application files only — never copy .git, node_modules, secrets, etc.
# (enforced by .dockerignore at the repo root)
COPY app/ /usr/share/nginx/html/

# nginx runs as non-root inside the official alpine image via the
# unprivileged "nginx" user already created upstream for worker processes;
# the master process still needs to bind port 80, which is standard here.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
