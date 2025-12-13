# 🔐 Стъпка по стъпка ръководство за Google OAuth вход

Това ръководство ще ви помогне да довършите настройката на "Влез с Google" функционалността.

## ✅ Какво вече е готово

- ✅ Backend имплементация (`backend/src/services/gmailOAuthService.js`)
- ✅ Backend routes (`/api/v1/auth/google` и `/api/v1/auth/google/callback`)
- ✅ Frontend бутон "Влез с Google" в Login страницата
- ✅ Frontend Callback страница за обработка на резултата

## 📋 Стъпка 1: Създаване на Google OAuth Credentials

### 1.1. Отидете в Google Cloud Console

1. Отворете [Google Cloud Console](https://console.cloud.google.com/)
2. Влезте с вашия Google акаунт
3. Създайте нов проект или изберете съществуващ

### 1.2. Активирайте Google+ API

1. В менюто отляво, отидете на **APIs & Services** → **Library**
2. Търсете "Google+ API" или "Google Identity"
3. Кликнете на **Enable** (Активирай)

### 1.3. Създайте OAuth 2.0 Credentials

1. Отидете на **APIs & Services** → **Credentials**
2. Кликнете на **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Ако ви пита за OAuth consent screen, попълнете:
   - **User Type**: External (за повечето случаи)
   - **App name**: WonderClimb (или вашето име)
   - **User support email**: Вашия имейл
   - **Developer contact information**: Вашия имейл
   - Кликнете **Save and Continue**
   - В **Scopes** кликнете **Save and Continue**
   - В **Test users** (ако сте в тестов режим) добавете тестови имейли
   - Кликнете **Save and Continue**

4. Създайте OAuth Client:
   - **Application type**: Web application
   - **Name**: WonderClimb Web Client (или каквото искате)
   - **Authorized JavaScript origins**:
     - За локална разработка: `http://localhost:5173`
     - За production: `https://yourdomain.com` (вашия домейн)
   - **Authorized redirect URIs**:
     - За локална разработка: `http://localhost:3000/api/v1/auth/google/callback`
     - За production: `https://your-backend-domain.com/api/v1/auth/google/callback`
     - **Важно**: Това трябва да съвпада точно с `GOOGLE_REDIRECT_URI` в backend
   - Кликнете **Create**

5. **Запишете**:
   - **Client ID** (ще изглежда като: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
   - **Client Secret** (ще изглежда като: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

## 📋 Стъпка 2: Конфигуриране на Environment Variables

### 2.1. Backend Environment Variables

Отворете `backend/.env` файла и добавете:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
```

**За production**, променете `GOOGLE_REDIRECT_URI`:
```env
GOOGLE_REDIRECT_URI=https://your-backend-domain.com/api/v1/auth/google/callback
```

### 2.2. Frontend Environment Variables (ако е необходимо)

Ако използвате различни URL-и за development и production, можете да добавите в `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1
FRONTEND_URL=http://localhost:5173
```

**За production**:
```env
VITE_API_URL=https://your-backend-domain.com/api/v1
FRONTEND_URL=https://your-frontend-domain.com
```

**Важно**: Backend трябва да знае къде да пренасочи след успешен login. Проверете `backend/src/controllers/authController.js` - там се използва `process.env.FRONTEND_URL` или fallback към `http://localhost:5173`.

## 📋 Стъпка 3: Рестартиране на сървърите

### 3.1. Рестартирайте Backend

```bash
cd backend
# Спрете текущия сървър (Ctrl+C) и стартирайте отново
npm run dev
```

### 3.2. Рестартирайте Frontend (ако променихте .env)

```bash
cd frontend
# Спрете текущия сървър (Ctrl+C) и стартирайте отново
npm run dev
```

## 📋 Стъпка 4: Тестване

### 4.1. Тестване на локална среда

1. Отворете `http://localhost:5173/login`
2. Кликнете на бутона **"Влез с Google"**
3. Трябва да бъдете пренасочени към Google login страница
4. Влезте с вашия Google акаунт
5. След успешен login, трябва да бъдете върнати обратно в приложението

### 4.2. Проверка за грешки

Ако има проблеми, проверете:

1. **Backend конзолата** за грешки
2. **Browser конзолата** (F12) за JavaScript грешки
3. **Network tab** в browser dev tools за failed requests

### 4.3. Често срещани проблеми

#### Проблем: "redirect_uri_mismatch"
**Решение**: Проверете дали `GOOGLE_REDIRECT_URI` в `.env` съвпада точно с "Authorized redirect URIs" в Google Cloud Console.

#### Проблем: "invalid_client"
**Решение**: Проверете дали `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` са правилно зададени в `.env`.

#### Проблем: Не се пренасочва обратно
**Решение**: Проверете дали `FRONTEND_URL` е правилно зададен в backend `.env` или в `authController.js`.

## 📋 Стъпка 5: Production Deployment

### 5.1. Google Cloud Console - Production настройки

1. В Google Cloud Console, добавете production URLs:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://your-backend-domain.com/api/v1/auth/google/callback`

### 5.2. Environment Variables в Production

Задайте environment variables в вашия hosting provider (Fly.io, Vercel, etc.):

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-backend-domain.com/api/v1/auth/google/callback
FRONTEND_URL=https://your-frontend-domain.com
```

### 5.3. OAuth Consent Screen - Публикуване

Ако сте в "Testing" режим, само тестовите потребители могат да влязат. За production:

1. Отидете на **APIs & Services** → **OAuth consent screen**
2. Кликнете **PUBLISH APP**
3. Потвърдете публикуването

**Важно**: Публикуването може да отнеме няколко дни за одобрение от Google, особено ако искате достъп до чувствителни данни.

## 🔍 Допълнителна информация

### Как работи flow-ът:

1. Потребителят кликва "Влез с Google" в Login страницата
2. Frontend пренасочва към `/api/v1/auth/google`
3. Backend генерира state token и пренасочва към Google OAuth
4. Потребителят влиза в Google и дава разрешение
5. Google пренасочва обратно към `/api/v1/auth/google/callback` с authorization code
6. Backend обменя code за access token и получава user info от Google
7. Backend създава или намира user в базата данни
8. Backend генерира JWT token и пренасочва към frontend `/auth/callback?token=...`
9. Frontend Callback страницата запазва token и user info
10. Потребителят е логнат успешно

### Безопасност

- State token се използва за CSRF защита
- OAuth state се съхранява в httpOnly cookie
- JWT tokens се използват за автентикация
- Google emails се считат за верифицирани автоматично

## ✅ Готово!

След като следвате тези стъпки, Google OAuth входът трябва да работи. Ако имате проблеми, проверете логовете и конзолата за грешки.


