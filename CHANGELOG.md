# Changelog

Все заметные изменения проекта фиксируются в этом файле.

## [1.0.0] - 2026-03-04

### Added
- Сигнальный сервер (`Axum`) с API:
  - `/v1/register`
  - `/v1/resolve/{key}`
  - `/v1/sessions/offer`
  - `/v1/sessions/{id}/answer`
  - `/v1/sessions/{id}/ice`
  - `/v1/sessions/{id}`
- Клиент CLI для:
  - управления профилем и контактами;
  - signaling операций и мониторинга сессии;
  - аудио probe и selftests (cpal + opus + webrtc data channel).
- UI-прототип (glassmorphism, темная тема, адаптив, состояния loading/empty/error).
- Security improvements:
  - опциональный token auth (`SIGNAL_API_TOKEN`, `x-nexus-token`);
  - rate limit + анти-спам на `register`;
  - безопасные ретраи с backoff;
  - санитизация чувствительных данных в логах клиента.
- Скрипты:
  - `scripts/build-portable.ps1` (portable `.exe` + zip);
  - `scripts/smoke-test.ps1` (базовая smoke-проверка сценария).

### Changed
- Версии workspace и всех crate обновлены до `1.0.0`.
- Документация дополнена: `SECURITY_NOTES.md`, `USER_GUIDE_RU.md`.
