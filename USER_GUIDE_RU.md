# nizamvoice: Мини-гайд пользователя (Windows)

## Что нужно
- GUI приложение: `dist/desktop/nizamvoice-desktop.exe` (или setup/msi)
- CLI клиент: `nexuschat-client.exe` (для консольных команд)
- ключ друга в формате `NX-XXXXXX`

## Запуск GUI (как обычная программа)
- Двойной клик по `dist/desktop/nizamvoice-desktop.exe`
- Либо через `scripts/start-desktop.bat`

## Первый запуск
1. Открой терминал в папке с `nexuschat-client.exe`.
2. Инициализируй профиль:
   - `.\nexuschat-client.exe init`
3. Посмотри свой ключ:
   - `.\nexuschat-client.exe show-key`

## Добавить друга
1. Выполни:
   - `.\nexuschat-client.exe add-friend "Alex" "NX-8A2B99"`
2. Проверить список:
   - `.\nexuschat-client.exe list-friends`

## Базовый сценарий звонка через signaling
1. Зарегистрировать себя на signal-server:
   - `.\nexuschat-client.exe register-self --server http://127.0.0.1:8080 --endpoint 198.51.100.4:45678`
2. Проверить ключ друга:
   - `.\nexuschat-client.exe resolve --server http://127.0.0.1:8080 NX-8A2B99`
3. Создать offer:
   - `.\nexuschat-client.exe create-webrtc-offer-session --server http://127.0.0.1:8080 NX-8A2B99`
4. На стороне друга принять сессию:
   - `.\nexuschat-client.exe accept-webrtc-session --server http://127.0.0.1:8080 <session_id> NX-8A2B99`

## Диагностика
- Список аудио устройств:
  - `.\nexuschat-client.exe audio-devices`
- Проверка микрофона:
  - `.\nexuschat-client.exe mic-probe --seconds 3`
- Проверка динамика:
  - `.\nexuschat-client.exe speaker-probe --seconds 2`

## Если ошибка сети
- Клиент автоматически делает ретраи и пишет статус переподключения.
- Повтори команду через 2-3 секунды, если сервер вернул `429 Too Many Requests`.

