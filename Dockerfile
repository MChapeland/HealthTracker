# syntax=docker/dockerfile:1

# ---- Stage 1: build the React frontend ----
FROM node:20-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Do NOT pass VITE_GOOGLE_CLIENT_SECRET here: the web build performs Google
# OAuth via the backend, so the client secret stays server-side only.
RUN npm run build

# ---- Stage 2: build the Rust web server ----
# The server binary links the shared library, which depends on Tauri, so the
# Tauri Linux system libraries are required to compile.
FROM rust:1-bookworm AS server
RUN apt-get update && apt-get install -y --no-install-recommends \
    libwebkit2gtk-4.1-dev \
    libgtk-3-dev \
    libsoup-3.0-dev \
    libjavascriptcoregtk-4.1-dev \
    pkg-config \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
# `generate_context!` embeds the frontend at compile time and the server serves
# it statically, so the built dist/ must be present before cargo build.
COPY --from=frontend /app/dist ./dist
RUN cargo build --release --bin health-tracker-server --manifest-path src-tauri/Cargo.toml

# ---- Stage 3: runtime image ----
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libwebkit2gtk-4.1-0 \
    libgtk-3-0 \
    libsoup-3.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=server /app/src-tauri/target/release/health-tracker-server /usr/local/bin/health-tracker-server
COPY --from=frontend /app/dist ./dist

ENV STATIC_DIR=/app/dist \
    DATABASE_PATH=/data/tracker.db \
    PORT=8080 \
    SECURE_COOKIES=true

EXPOSE 8080
VOLUME ["/data"]
CMD ["health-tracker-server"]
