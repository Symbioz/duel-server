# Presentation Layer

This directory contains **primary adapters** following Clean Architecture principles. These controllers translate HTTP requests into use case invocations.

## Structure

- **GestureRecognitionController**: Handles `/api/gesture-recognition/*` endpoints
  - `GET /api/gesture-recognition/health` - Health check
  - `POST /api/gesture-recognition/warmup` - Preload templates
  - `POST /api/gesture-recognition/recognize` - Recognize gesture from points
  - `OPTIONS /api/gesture-recognition/*` - CORS preflight

- **VoiceSpellController**: Handles voice-based spell recognition
  - `POST /voice/spell?k=<access-key>` - Recognize spell from audio

## Dependencies

- Controllers depend on use cases from `../usecases/`
- Controllers do NOT depend on infrastructure concerns (except HTTP types)
- Controllers handle HTTP protocol-specific concerns (headers, status codes, CORS)

## Design Principles

- Each controller is responsible for a single feature/domain
- Controllers delegate business logic to use cases
- Response formatting happens here (e.g., converting 0-1 scores to 0-100)
- Error handling and HTTP status codes are controller concerns

