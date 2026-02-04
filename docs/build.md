# Building for Production

## Build the App
```bash
bun run build
```
The production build will be in the `dist/` folder.

## Build for GitHub Pages
`bun run predeploy` generates a production build and writes `dist/.nojekyll` for GitHub Pages hosting.

```bash
bun run predeploy
```

## Preview the Production Build Locally
```bash
bun run preview
```
