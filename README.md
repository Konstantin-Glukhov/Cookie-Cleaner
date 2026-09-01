# Cookie Cleaner

Chrome extension to remove cookies for the current tab's domain.

Published on the Chrome Web Store as **"Remove Current Tab Cookies"**.

## Project structure

- `src/` — TypeScript source
- `static/` — static extension assets (copied to build output as-is)
- `tsconfig.json` — TypeScript compiler config
- `package.json` — npm scripts and dependencies

## Build

```bash
npm install
npm run dist
```

Available scripts (from `package.json`):

| Script  | Description |
|---------|-------------|
| `build` | Compiles TypeScript (`tsc`) |
| `static`| Copies `static/*` into `dst/` |
| `dist`  | Runs `build` then `static` |
| `clean` | Removes the `dst/` folder |

Output is written to `dst/`. Load `dst/` as an unpacked extension in Chrome via `chrome://extensions` (Developer mode → Load unpacked).

## License

GPL-3.0

## Author

Konstantin Glukhov
