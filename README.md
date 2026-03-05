# nizamvoice (Rust P2P) - Bootstrap

Текущая версия: `1.0.0`

Этот каркас реализует первые этапы из ТЗ:
- Rust workspace
- `signal-server` (Axum) с in-memory хранилищем `key -> endpoint/sdp_offer`, TTL 60 секунд
- rate limit и endpoint метрик
- signaling-сессии для handshake (`offer/answer/ice/session-status`)
- интеграция `webrtc-rs` в клиент для реального SDP (`offer/answer`)
- `nexuschat-client` (CLI) для ключей, контактов и вызова signaling API
- `nexuschat-proto` с общими DTO

## Структура

- `apps/signal-server` - signaling сервис
- `apps/client` - CLI-клиент (дальше можно встроить в Tauri/egui UI)
- `crates/nexuschat-proto` - общие структуры API
- `.github/workflows/ci.yml` - CI pipeline
- `scripts/build-portable.ps1` - portable сборка для Windows
- `.env.signal.example` - шаблон env для signal-server

## API signal-server

- `GET /health`
- `GET /metrics`
- `POST /v1/register`
- `GET /v1/resolve/{key}`
- `POST /v1/sessions/offer`
- `POST /v1/sessions/{id}/answer`
- `POST /v1/sessions/{id}/ice`
- `GET /v1/sessions/{id}`

Опциональная защита API:
- если задан `SIGNAL_API_TOKEN`, все endpoints кроме `/health` требуют заголовок `x-nexus-token`.
- `/metrics` тоже защищен токеном.

Анти-спам:
- глобальный rate limit по окну времени;
- cooldown на повторный `register` одного и того же ключа (2 секунды).

Sprint 7 security review:
- детали и чеклист: `SECURITY_NOTES.md`.

## Локальный запуск

Требования:
- Rust toolchain (`cargo`)

Сервер:

```powershell
cd nexuschat
cargo run -p signal-server
```

Клиент:

```powershell
cd nexuschat
cargo run -p nexuschat-client -- init
cargo run -p nexuschat-client -- show-key
cargo run -p nexuschat-client -- add-friend "Alex" "NX-8A2B99"
cargo run -p nexuschat-client -- search-friends alex
cargo run -p nexuschat-client -- list-friends
cargo run -p nexuschat-client -- remove-friend NX-8A2B99

cargo run -p nexuschat-client -- register-self --server http://127.0.0.1:8080 --endpoint 198.51.100.4:45678
cargo run -p nexuschat-client -- resolve --server http://127.0.0.1:8080 NX-8A2B99

cargo run -p nexuschat-client -- create-offer --server http://127.0.0.1:8080 NX-8A2B99 "v=0..."
cargo run -p nexuschat-client -- submit-answer --server http://127.0.0.1:8080 sess-123 NX-8A2B99 "v=0..."
cargo run -p nexuschat-client -- add-ice --server http://127.0.0.1:8080 sess-123 NX-AB12CD "candidate:..."
cargo run -p nexuschat-client -- watch-session --server http://127.0.0.1:8080 sess-123 --retries 10 --delay-ms 1000

# webrtc-rs (реальный SDP)
cargo run -p nexuschat-client -- webrtc-offer
cargo run -p nexuschat-client -- webrtc-answer "v=0..."

# webrtc-rs + signaling сервер
cargo run -p nexuschat-client -- create-webrtc-offer-session --server http://127.0.0.1:8080 NX-8A2B99
cargo run -p nexuschat-client -- accept-webrtc-session --server http://127.0.0.1:8080 sess-123 NX-8A2B99

# cpal (аудио устройства и probe микрофона)
cargo run -p nexuschat-client -- audio-devices
cargo run -p nexuschat-client -- mic-probe --seconds 3
cargo run -p nexuschat-client -- speaker-probe --seconds 2

# Opus codec
cargo run -p nexuschat-client -- opus-selftest --seconds 2

# P2P audio packet selftest (webrtc data channel + opus)
cargo run -p nexuschat-client -- p2p-audio-selftest --seconds 3 --gain 1.1 --drop-rate 0.02

# Gain + echo suppression selftest
cargo run -p nexuschat-client -- audio-fx-selftest --seconds 2 --gain 1.2 --echo-attenuation 0.6
```

## CI

```yaml
fmt -> clippy -> test -> build
```

Файл: `.github/workflows/ci.yml`.

## Release CI (tag based)

При push тега вида `v*` запускается workflow:
- `.github/workflows/release.yml`
- собирает portable zip
- публикует его в GitHub Release

## Portable build

```powershell
cd nexuschat
./scripts/build-portable.ps1
```

Результат:
- `dist/signal-server.exe`
- `dist/nexuschat-client.exe`
- `nizamvoice-portable-x86_64-pc-windows-msvc.zip`

## Desktop App (Tauri GUI)

Сборка GUI-приложения:

```powershell
cd nexuschat/apps/desktop
npm install
npm run tauri:build
```

Артефакты:
- `dist/desktop/nizamvoice-desktop.exe`
- `dist/desktop/nizamvoice_1.0.0_x64-setup.exe`
- `dist/desktop/nizamvoice_1.0.0_x64_en-US.msi`

Быстрый запуск:
- `scripts/start-desktop.bat`

## UI prototype (Sprint 6)

Статический прототип интерфейса (glassmorphism, контакт-лист, экран звонка, адаптив):
- `ui/index.html`
- `ui/styles.css`
- `ui/app.js`

Быстрый запуск:

```powershell
cd nexuschat\ui
# открой index.html в браузере
```

## Что дальше по ТЗ

1. Связать live `cpal` захват/воспроизведение с текущей P2P передачей Opus-пакетов (сейчас передача работает в selftest режиме с jitter buffer, loss/latency метриками и базовым gain/echo control).
2. Добавить live обмен ICE-кандидатами между пирами (сейчас есть signaling API и команды, но нет непрерывного live-loop).
3. Сделать UI (Tauri или egui) с экраном звонка и стеклянной темой.
4. Усилить production-hardening: HTTPS/TLS + ротация токенов + более точный rate-limit (per-IP/per-key).

## Smoke test

```powershell
cd nexuschat
./scripts/smoke-test.ps1
```

## Документация релиза
- Мини-гайд пользователя: `USER_GUIDE_RU.md`
- Changelog: `CHANGELOG.md`
- Security notes: `SECURITY_NOTES.md`
- Деплой Railway/Render: `DEPLOY_RAILWAY_RENDER_RU.md`
- Подпись .exe: `SIGNING_RU.md`

Утилиты деплоя:
- `scripts/deploy-railway.ps1`
- `scripts/check-deploy.ps1`

