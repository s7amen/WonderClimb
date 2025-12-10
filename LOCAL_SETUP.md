# WonderClimb - Локална Инсталация и Стартиране

Това ръководство ще ви помогне да стартирате проекта WonderClimb локално на вашия компютър за тестване.

## Предварителни Изисквания

### Задължителни:
- **Node.js 20.x или по-висока версия** - [Изтегли от тук](https://nodejs.org/)
- **npm** (идва с Node.js)

### Опционални (препоръчително):
- **Docker Desktop** - за MongoDB (най-лесен начин) - [Изтегли от тук](https://www.docker.com/products/docker-desktop/)
- **MongoDB Community Edition** - алтернатива на Docker - [Изтегли от тук](https://www.mongodb.com/try/download/community)

## Бърз Старт (Автоматизиран)

### Стъпка 1: Стартирай Setup Скрипта

Отвори PowerShell в папката на проекта и изпълни:

```powershell
.\setup-local-dev.ps1
```

Скриптът автоматично ще:
- ✓ Провери дали Node.js е инсталиран
- ✓ Провери/стартира MongoDB (Docker или локална инсталация)
- ✓ Създаде `.env` файл за backend с необходимите настройки
- ✓ Инсталира всички зависимости за backend и frontend

### Стъпка 2: Стартирай MongoDB

**Ако използваш Docker:**
```powershell
docker-compose up -d mongodb
```

**Ако използваш локална MongoDB инсталация:**
```powershell
Start-Service MongoDB
```

**Проверка дали MongoDB работи:**
```powershell
# С Docker
docker ps | Select-String mongodb

# С локална инсталация
Get-Service MongoDB
```

### Стъпка 3: Стартирай Backend

Отвори нов терминал и изпълни:

```powershell
cd backend
npm run dev
```

Трябва да видиш:
```
Server running on port 3000 in development mode
MongoDB connected: mongodb://localhost:27017/wonderclimb
```

### Стъпка 4: Стартирай Frontend

Отвори още един нов терминал и изпълни:

```powershell
cd frontend
npm run dev
```

Трябва да видиш:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Стъпка 5: Отвори в Браузър

- **Frontend приложение:** http://localhost:5173
- **Backend API:** http://localhost:3000/api/v1
- **Health Check:** http://localhost:3000/health
- **API Documentation:** http://localhost:3000/api/v1/docs

---

## Ръчен Setup (Ако скриптът не работи)

### 1. Инсталиране на MongoDB

#### Опция A: С Docker (Препоръчително)

1. Инсталирай [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Стартирай Docker Desktop
3. Изпълни:
```powershell
docker-compose up -d mongodb
```

#### Опция B: Локална Инсталация

1. Изтегли MongoDB Community Edition от [mongodb.com](https://www.mongodb.com/try/download/community)
2. Инсталирай с default настройки
3. Стартирай MongoDB service:
```powershell
Start-Service MongoDB
```

### 2. Конфигуриране на Backend

#### Създаване на .env файл

Създай файл `backend/.env` със следното съдържание:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database - Local MongoDB
MONGODB_URI=mongodb://localhost:27017/wonderclimb

# Authentication
JWT_SECRET=<генерирай-секретен-ключ-тук>
JWT_EXPIRES_IN=7d

# Booking Configuration
BOOKING_HORIZON_HOURS=720
CANCELLATION_WINDOW_HOURS=4

# Logging
LOG_LEVEL=info
```

**За да генерираш JWT_SECRET:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### Инсталиране на Backend Зависимости

```powershell
cd backend
npm install
```

### 3. Конфигуриране на Frontend

Frontend няма нужда от `.env` файл за локална разработка - автоматично използва `http://localhost:3000/api/v1`.

#### Инсталиране на Frontend Зависимости

```powershell
cd frontend
npm install
```

---

## Стартиране на Проекта

### Терминал 1: MongoDB (ако не е стартиран)
```powershell
# С Docker
docker-compose up -d mongodb

# Или с локална инсталация
Start-Service MongoDB
```

### Терминал 2: Backend
```powershell
cd backend
npm run dev
```

### Терминал 3: Frontend
```powershell
cd frontend
npm run dev
```

---

## Проверка на Инсталацията

### 1. Проверка на MongoDB

```powershell
# С Docker
docker ps | Select-String mongodb

# Тест на връзката
Test-NetConnection -ComputerName localhost -Port 27017
```

### 2. Проверка на Backend

Отвори браузър и отиди на:
- http://localhost:3000/health

Трябва да видиш JSON отговор:
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development"
}
```

### 3. Проверка на Frontend

Отвори браузър и отиди на:
- http://localhost:5173

Трябва да видиш началната страница на приложението.

---

## Често Срещани Проблеми

### MongoDB не стартира

**Проблем:** `MongoDB connection error`

**Решения:**
1. Провери дали MongoDB service е стартиран:
   ```powershell
   Get-Service MongoDB
   ```
2. Ако не е стартиран:
   ```powershell
   Start-Service MongoDB
   ```
3. Ако използваш Docker:
   ```powershell
   docker-compose up -d mongodb
   docker logs wonderclimb-mongodb
   ```

### Port 3000 е зает

**Проблем:** `Port 3000 is already in use`

**Решение:** Промени порта в `backend/.env`:
```env
PORT=3001
```

След това промени и frontend конфигурацията (ако е необходимо).

### Port 5173 е зает

**Проблем:** Vite не може да стартира на порт 5173

**Решение:** Vite автоматично ще използва следващия свободен порт. Провери в конзолата кой порт е използван.

### Зависимости не се инсталират

**Проблем:** `npm install` дава грешки

**Решения:**
1. Изчисти кеша:
   ```powershell
   npm cache clean --force
   ```
2. Изтрий `node_modules` и `package-lock.json`:
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```
3. Провери дали имаш правилната версия на Node.js:
   ```powershell
   node --version  # Трябва да е 20.x или по-висока
   ```

### CORS грешки

**Проблем:** Frontend не може да се свърже с backend

**Решение:** Провери дали backend работи на правилния порт и дали CORS е конфигуриран правилно. В development режим, CORS трябва да позволява всички origins автоматично.

---

## Полезни Команди

### MongoDB

```powershell
# Стартиране (Docker)
docker-compose up -d mongodb

# Спиране (Docker)
docker-compose down

# Стартиране (Локална инсталация)
Start-Service MongoDB

# Спиране (Локална инсталация)
Stop-Service MongoDB

# Проверка на статус
Get-Service MongoDB

# Логове (Docker)
docker logs wonderclimb-mongodb
```

### Backend

```powershell
# Development режим (с auto-reload)
npm run dev

# Production режим
npm start

# Тестове
npm test

# Тестове с coverage
npm run test:coverage
```

### Frontend

```powershell
# Development режим
npm run dev

# Build за production
npm run build

# Preview на production build
npm run preview

# Тестове
npm test
```

---

## Структура на Проекта

```
WonderClimb-git/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/       # Конфигурация (DB, env)
│   │   ├── models/       # Mongoose модели
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Бизнес логика
│   │   └── middleware/   # Auth, logging, validation
│   ├── .env             # Environment variables (не е в git)
│   └── package.json
│
├── frontend/            # React/Vite приложение
│   ├── src/
│   │   ├── components/  # React компоненти
│   │   ├── pages/       # Страници
│   │   ├── services/    # API услуги
│   │   └── config/      # Конфигурация
│   └── package.json
│
├── docker-compose.yml   # MongoDB контейнер
└── setup-local-dev.ps1  # Автоматизиран setup скрипт
```

---

## Следващи Стъпки

След като проектът е стартиран:

1. **Тествай API endpoints** - използвай Postman или браузъра
2. **Разгледай документацията** - http://localhost:3000/api/v1/docs
3. **Създай тестови потребители** - използвай регистрация endpoint
4. **Разгледай frontend компонентите** - започни от началната страница

---

## Нуждаеш се от Помощ?

- Провери `backend/README.md` за backend документация
- Провери `frontend/README.md` за frontend документация
- Провери `SETUP.md` за обща информация за setup
- Провери `QUICK_START.md` за бърз старт

---

**Успешно кодиране! 🚀**

