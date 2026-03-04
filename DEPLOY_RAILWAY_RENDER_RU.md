# Деплой signal-server (Railway / Render)

Дата: `2026-03-04`

## Что уже подготовлено
- `Dockerfile` для `signal-server`
- `railway.toml`
- `render.yaml`
- Сервер поддерживает `PORT` (автоматически для Railway/Render)

## Переменные окружения (обязательно)
- `SIGNAL_API_TOKEN` - секрет для защиты API.

## Railway CLI (опционально, для one-click deploy)
```powershell
winget install -e --id OpenJS.NodeJS.LTS
"C:\Program Files\nodejs\npm.cmd" i -g @railway/cli
```

## Railway
1. Создай новый проект из этого репозитория.
2. Убедись, что найден `railway.toml`.
3. В Variables добавь:
   - `SIGNAL_API_TOKEN=<твой_секрет>`
4. Deploy.
5. Проверка:
   - `GET /health` => `ok`
   - `GET /metrics` с заголовком `x-nexus-token: <твой_секрет>`

Автоматизация через скрипт:
```powershell
cd nexuschat
./scripts/deploy-railway.ps1 -RailwayToken "<RAILWAY_TOKEN>" -SignalApiToken "<SIGNAL_API_TOKEN>"
```

## Render
1. Create New Web Service из репозитория.
2. Render подхватит `render.yaml`.
3. В Environment добавь:
   - `SIGNAL_API_TOKEN=<твой_секрет>`
4. Deploy.
5. Проверка:
   - `GET /health` => `ok`
   - `GET /metrics` с `x-nexus-token`.

## Локальная проверка Docker
```powershell
cd nexuschat
docker build -t nexuschat-signal .
docker run --rm -p 8080:8080 -e SIGNAL_API_TOKEN=test123 nexuschat-signal
```

## Проверка после деплоя
```powershell
cd nexuschat
./scripts/check-deploy.ps1 -BaseUrl "https://your-app.up.railway.app" -SignalApiToken "<SIGNAL_API_TOKEN>"
```
