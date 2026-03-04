# Подпись Windows бинарников

## Требуется
- PFX сертификат подписи кода.
- Пароль сертификата.
- `signtool.exe` (Windows SDK).

## Команда
```powershell
cd nexuschat
./scripts/sign-release.ps1 -CertPath "C:\path\codesign.pfx" -CertPassword "YOUR_PASSWORD"
```

Подписываются файлы:
- `dist/signal-server.exe`
- `dist/nexuschat-client.exe`
