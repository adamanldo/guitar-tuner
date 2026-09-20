# Guitar Tuner

A clean, no-frills guitar tuner. Six buttons, one per string — press one and
a realistic plucked-string note (synthesized with the Web Audio API, no
audio samples) repeats every few seconds so you can tune by ear.

Live at: https://adamanldo.github.io/guitar-tuner/

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs a production build to `dist/`.

## Deployment

Pushes to `main` are automatically built and deployed to GitHub Pages by
the workflow in `.github/workflows/deploy.yml`. No manual deploy step is
needed.
