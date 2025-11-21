# Frontend Fixes - Unified User Model

## Проблеми които бяха поправени

1. ✅ Frontend очакваше `name` поле вместо `firstName`, `middleName`, `lastName`
2. ✅ Frontend очакваше `status` поле вместо `accountStatus` и `isActive`
3. ✅ Backend endpoint-ите не връщаха правилните полета
4. ✅ Грешки при зареждане на данни поради неправилни полета

## Актуализирани файлове

### Frontend:
- `frontend/src/pages/Parent/Schedule.jsx` - актуализиран за три имена и isActive филтър
- `frontend/src/pages/Parent/Profile.jsx` - актуализиран за три имена и accountStatus/isActive
- `frontend/src/pages/Parent/Bookings.jsx` - актуализиран филтър за isActive
- `frontend/src/pages/Auth/Register.jsx` - актуализиран за три имена при регистрация
- `frontend/src/components/Layout/ParentLayout.jsx` - актуализиран за показване на имена
- `frontend/src/components/Layout/CoachLayout.jsx` - актуализиран за показване на имена
- `frontend/src/components/Layout/AdminLayout.jsx` - актуализиран за показване на имена
- `frontend/src/pages/Admin/Climbers.jsx` - актуализиран за три имена
- `frontend/src/utils/userUtils.js` - нов helper файл за работа с имена

### Backend:
- `backend/src/routes/parentProfile.js` - актуализиран за три имена

## Как да стартираш системата

### 1. Стартирай Backend сървъра

```bash
cd backend
npm install  # Ако не са инсталирани зависимостите
npm start    # или npm run dev за development mode
```

Backend сървърът трябва да работи на `http://localhost:3000`

### 2. Стартирай Frontend сървъра

```bash
cd frontend
npm install  # Ако не са инсталирани зависимостите
npm run dev  # или npm start
```

Frontend сървърът трябва да работи на `http://localhost:5173` (или друг порт според конфигурацията)

### 3. Проверка на конфигурацията

Уверете се че `frontend/.env` или `frontend/.env.local` съдържа:
```
VITE_API_URL=http://localhost:3000/api/v1
```

## Важни бележки

1. **Backend трябва да работи преди frontend** - иначе ще има `ERR_CONNECTION_REFUSED` грешки
2. **Стари потребители** - ако имаш стари потребители с `name` поле, те ще се показват правилно благодарение на helper функциите в `userUtils.js`
3. **404 грешки за `/api/v1/me/climber`** - това е нормално ако потребителят няма `climber` role. Грешката вече се обработва правилно и не се показва на потребителя.

## Тестване

След като стартираш и двата сървъра:

1. Отвори браузър на `http://localhost:5173` (или порта на frontend)
2. Регистрирай нов потребител - трябва да работи с три имена
3. Влез като родител и провери дали можеш да:
   - Виждаш профила си
   - Добавяш деца
   - Резервираш сесии
   - Виждаш резервациите си

## Ако все още има проблеми

1. Провери дали backend сървърът работи - отвори `http://localhost:3000/api/v1` в браузъра
2. Провери конзолата на браузъра за грешки
3. Провери backend логовете за грешки
4. Уверете се че MongoDB работи и е свързана правилно

