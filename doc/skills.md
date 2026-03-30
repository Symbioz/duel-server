# Skills du projet Duel — version server

Ce document enregistre les conventions et compétences à conserver pour la partie serveur du projet.

## 0) Conventions de code (permanentes)

- Code language: all code artifacts must stay in English — variable names, functions, classes, types, props, events, CSS class names, comments, test names, assertion messages, snapshots, and helper fixtures.
- No French in code: French must not appear in source-level comments or automated tests, especially in `.ts` and `.spec.ts` files.
- User-facing texts are not a concern here unless explicitly required by an API contract.

## 1) Architecture and software quality

- Clean Architecture must be respected: `entities` -> `usecases` -> `infrastructure`.
- DIP must be applied through ports and dependency injection.
- Use cases must be testable in isolation with mocks.
- Domain logic must stay outside transport and framework code.
- No infrastructure construction inside use cases when it can be injected through ports.
- Logic should remain framework-agnostic as much as possible.

## 2) Ports and dependency injection

- External services must be accessed through ports.
- Concrete implementations belong to infrastructure.
- Use cases depend on abstractions, not implementations.
- Dependency injection should be used consistently for repositories, recognizers, transports, and state coordination services.

## 3) Gesture recognition domain

- Gesture recognition logic is domain/infrastructure logic, not transport logic.
- Recognition should remain isolated behind a dedicated port.
- The recognition pipeline may include:
  - resampling,
  - normalization,
  - scoring,
  - configurable thresholds.
- Best match should return a confidence score and enough debug data for diagnosis.

## 4) Spell casting domain

- Casting logic must be handled in dedicated use cases.
- Spell recognition and spell lookup must remain decoupled through ports.
- A cast must fail cleanly if:
  - no known spell matches the gesture,
  - score is insufficient,
  - required domain constraints are not met.
- Outcome computation belongs to domain/use case logic, not transport handlers.

## 5) Effects and domain modeling

- Effects should be modeled explicitly in the domain.
- Runtime effect resolution should live in a dedicated service.
- Domain entities and value objects should remain independent from WebSocket, HTTP, or framework concerns.

## 6) Transport/server rules

- WebSocket and HTTP handlers must act as adapters only.
- Transport layer responsibilities:
  - receive input,
  - validate payload shape,
  - map transport messages to use case requests,
  - call use cases,
  - send back responses/events.
- Transport layer must not contain business rules.
- Gesture sessions received from a phone controller should be reconstructed in a dedicated server-side adapter/service, then passed to the recognition/casting use cases.

## 7) Testing expectations

- Unit tests are required for:
  - use cases,
  - gesture recognition services,
  - effect resolution services,
  - transport adapters when relevant.
- Use cases must be testable without framework/runtime dependencies.
- Tests should mock ports rather than concrete infrastructure.

## 8) Suggested server layering

Recommended structure:

- `entities/`
- `usecases/`
- `common-ports/`
- `infrastructure/`
  - `gesture/`
  - `spell/`
  - `transport/`
    - `http/`
    - `websocket/`
- `app-configuration/`

## 9) Server-side implementation checklist

### Use case checklist

- Inject dependencies through ports
- Keep business logic inside use cases/services
- Return explicit success/failure results
- Avoid framework-specific code
- Make logic unit-testable

### Infrastructure checklist

- Implement ports cleanly
- Keep parsing, persistence, network, and transport concerns in infrastructure
- Do not leak transport DTOs into domain entities

### Transport checklist

- Validate incoming payloads
- Convert payloads to domain requests
- Call use cases
- Return domain results mapped to transport responses
- No business logic in controllers/socket handlers