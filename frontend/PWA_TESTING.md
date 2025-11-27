# PWA Install Button - Тестване и Debug

## Къде да търсите бутона

Бутонът за инсталиране се показва **само на страницата с графика** (`/parent/schedule`):
- На мобилни устройства (телефон/таблет)
- В долния десен ъгъл на екрана
- След 2 секунди за iOS устройства
- Веднага след `beforeinstallprompt` event за Android

## Защо може да не се вижда

### 1. **Липсват икони** (КРИТИЧНО!)
PWA изисква икони за да работи. Трябва да създадете:
- `frontend/public/icons/icon-192x192.png`
- `frontend/public/icons/icon-512x512.png`

**Как да ги създадете:**
- Отворете `frontend/public/logo-icon.svg` в image editor
- Експортирайте като PNG на 192x192 и 512x512 пиксела
- Запазете в `frontend/public/icons/`

### 2. **Не сте на правилната страница**
Бутонът е **само на `/parent/schedule`** страницата.

### 3. **Не сте на HTTPS или localhost**
`beforeinstallprompt` event работи само на:
- `https://` URLs
- `http://localhost` или `http://127.0.0.1`
- Не работи на `http://192.168.x.x` или други IP адреси

### 4. **PWA критерии не са изпълнени**
- Manifest файл трябва да е валиден
- Service worker трябва да е регистриран
- Иконите трябва да съществуват

### 5. **Приложението вече е инсталирано**
Ако вече сте инсталирали PWA, бутонът няма да се покаже.

### 6. **Desktop browser в mobile view**
На някои desktop браузъри, дори в mobile view, `beforeinstallprompt` може да не работи.

## Как да тествате

### Стъпка 1: Създайте иконите
```bash
# Използвайте онлайн tool или image editor
# Вижте frontend/public/icons/README.md за инструкции
```

### Стъпка 2: Стартирайте dev server
```bash
cd frontend
npm run dev
```

### Стъпка 3: Отворете в браузър
- На мобилен: `http://localhost:5173/parent/schedule`
- На desktop: Отворете DevTools → Mobile view → `http://localhost:5173/parent/schedule`

### Стъпка 4: Проверете конзолата
Отворете Browser DevTools → Console и потърсете:
```
[PWA Install] Mobile check: ...
[PWA Install] iOS detected, will show prompt after delay
[PWA Install] Current state: ...
```

### Стъпка 5: Проверете Application tab
В Chrome DevTools:
- Application → Manifest - трябва да видите manifest данните
- Application → Service Workers - трябва да видите регистриран service worker

## Debug информация

Компонентът логва следната информация в конзолата:
- Дали устройството е mobile
- Дали приложението е инсталирано
- Дали има `beforeinstallprompt` event
- Дали е iOS устройство
- Дали prompt-ът е dismiss-нат

## Ръчно тестване (за iOS)

Ако сте на iOS и бутонът не се показва:
1. Отворете страницата в Safari
2. Натиснете Share бутона (долу в средата)
3. Изберете "Add to Home Screen"
4. Натиснете "Add"

## Ръчно тестване (за Android)

Ако сте на Android Chrome:
1. Отворете менюто (3 точки горе вдясно)
2. Търсете "Install app" или "Add to Home screen"
3. Ако опцията не се показва, PWA критериите не са изпълнени

## Често срещани проблеми

### "beforeinstallprompt не се задейства"
- Проверете дали сте на HTTPS или localhost
- Проверете дали иконите съществуват
- Проверете дали manifest.json е валиден

### "Бутонът се показва но не работи"
- Проверете конзолата за грешки
- Уверете се че service worker е регистриран
- Проверете дали имате валиден manifest

### "Не виждам бутона на desktop"
- Бутонът е скрит на desktop (`md:hidden`)
- Използвайте mobile view в DevTools
- Или тествайте на реален мобилен device

## Следващи стъпки

1. ✅ Създайте иконите (192x192 и 512x512 PNG)
2. ✅ Тествайте на localhost
3. ✅ Проверете конзолата за debug информация
4. ✅ Тествайте на реален мобилен device

