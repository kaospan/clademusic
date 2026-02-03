# Development

## Start the Development Server
```bash
bun run dev
```
The app will be available at `http://localhost:8080/clademusic/` (port + base path are configured in `vite.config.ts`).

## E2E Dev Server (Cypress Smoke)
```bash
bun run dev:e2e
```
This server runs at `http://127.0.0.1:8090/clademusic/` and is used by `bun run test:e2e:smoke:auto`.

## Type Checking
```bash
bun run typecheck
```

## Lint
```bash
bun run lint
```
