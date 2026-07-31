# Karma Racer

Online multiplayer car arena. Archived original, now being revived.

## Revival roadmap

### Phase 1 — Play locally (current)
Get the classic stack running again with minimal changes:
- Pinned npm dependencies
- In-memory DB by default (Mongo optional)
- Guest play without Facebook
- Socket.io clients use the current page origin (works on `http://localhost:8080`)

### Phase 2 — Modernize (later)
Same gameplay, current stack:
- Socket.io v4, Express LTS, Pug (or another view layer)
- Replace Grunt with a modern bundler
- Optional auth, proper secrets via env
- Deploy on Fly / Railway / etc.

## Quick start (Phase 1)

Requires **Node 18–22** (see `.nvmrc` → 20). Node 25+ breaks the old Express static stack.

If you installed the local Node 20 binary under `~/.local/node-v20.*`, `npm start` picks it up automatically via `scripts/start.sh`.

```bash
nvm use        # or install Node 20
npm install
npm start
```

Open [http://localhost:8080](http://localhost:8080), optionally check **Play in 3D (WebGL)**, pick a map, enter a name, play.

Direct 3D URL example: [http://localhost:8080/game.dust?draw=WEBGL](http://localhost:8080/game.dust?draw=WEBGL)

### Useful env vars

| Variable | Default (local) | Meaning |
|---|---|---|
| `PORT` / `KARMA_PORT` | `8080` | HTTP port |
| `KARMA_HOST` | `http://localhost:8080` | Public URL |
| `KARMA_MEMORY_DB` | on in local | `0` to force Mongo |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/karmaracer` | Mongo when not in memory |
| `KARMA_GUEST_MODE` | on | Play without Facebook |
| `NO_BOTS` | unset | Disable bots if set |

```bash
npm run build   # rebuild public/dist via Grunt
npm run dev     # build then start
npm run test:browser   # headless Chrome smoke test (JS errors report)
```

## About

कर्म रेसर — multiplayer top-down car combat (Karma points, levels, guns).
HTML / JavaScript / Node.js.
