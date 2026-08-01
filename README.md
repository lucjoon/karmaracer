# Karma Racer

Online multiplayer car arena — Phase 2 modern stack (Socket.io v4, Express, Pug, esbuild).

## Quick start

Requires **Node 20+**.

```bash
npm install
npm start
```

Open [http://localhost:8080](http://localhost:8080).

- Optional 3D: check **Play in 3D (WebGL)** or open `/game.dust?draw=WEBGL`
- Controls: ↑↓←→ move/turn, Space shoot

```bash
npm run build         # rebuild public/dist
npm run dev           # build + start
npm run test:browser  # headless Chrome smoke (needs Chrome + running server)
```

## Environment

See `.env.example`. Important vars:

| Variable | Meaning |
|---|---|
| `PORT` | HTTP port (default `8080`) |
| `KARMA_HOST` | Public URL (auth callbacks / links) |
| `SESSION_SECRET` | Express session secret |
| `KARMA_GUEST_MODE` | `1` play without login (default local) |
| `KARMA_MEMORY_DB` | `1` in-memory store (default local) |
| `MONGODB_URI` | Enable Mongo persistence |
| `FB_APP_ID` / `FB_APP_SECRET` | Optional Facebook login |

## Deploy

### Fly.io

```bash
fly launch   # or fly apps create
fly secrets set SESSION_SECRET=... KARMA_HOST=https://your-app.fly.dev
fly deploy
```

`fly.toml` and `Dockerfile` are included. Health check: `GET /health`.

### Railway

Connect the repo, set env from `.env.example`, start command `npm start`.

## Architecture (Phase 2)

- **Server:** Express 4 + Socket.io 4 + Pug
- **Client build:** `scripts/build-client.mjs` (esbuild + less) — replaces Grunt
- **Auth:** guest by default; Facebook only if secrets are set
- **DB:** memory by default; Mongo optional
- **Gameplay:** same physics / maps / weapons core under `libs/`

## About

कर्म रेसर — top-down multiplayer car combat (Karma points, levels, guns).
