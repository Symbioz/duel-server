# Gesture recognition backend

## Purpose

Serveur HTTP autonome de reconnaissance de gestes deterministe (sans IA), base sur:

- parsing SVG remplis,
- rasterisation binaire,
- scoring hybride polyline + coverage,
- debug detaille.

## Endpoints

- `POST /api/gesture-recognition/warmup`
- `GET /api/gesture-recognition/health`
- `POST /api/gesture-recognition/recognize`

## Run

```bash
npm run dev:gesture-recognition
```

ou en production:

```bash
npm run build
npm run start:gesture-recognition
```

## Environment variables

- `GESTURE_RECOGNITION_PORT` (defaut `8787`)
- `GESTURE_RECOGNITION_HOST` (defaut `0.0.0.0`)
- `GESTURE_RECOGNITION_GLYPH_DIR` (defaut `server/gesture-recognition/spell-glyphs`)
- `GESTURE_RECOGNITION_RASTER_SIZE` (defaut `96`)
- `GESTURE_RECOGNITION_SAMPLE_COUNT` (defaut `96`)
- `GESTURE_RECOGNITION_MIN_SCORE` (defaut `0.45`)

## Test integration

```bash
npm run test -- --run server/gesture-recognition/GestureRecognitionHttpServer.spec.ts
```

