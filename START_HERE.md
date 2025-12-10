# 🚀 Стартиране на WonderClimb Локално

## Бърз Старт

### Стъпка 1: Проверка на Предварителните Изисквания

**Провери дали имаш инсталирано:**

1. **Node.js 20.x или по-висока версия**
   ```powershell
   node --version
   ```
   Ако не е инсталиран: [Изтегли от тук](https://nodejs.org/)

2. **npm** (идва с Node.js)
   ```powershell
   npm --version
   ```

3. **MongoDB** (избери един от вариантите):
   - **Вариант A:** Docker Desktop - [Изтегли от тук](https://www.docker.com/products/docker-desktop/)
   - **Вариант B:** MongoDB Community Edition - [Изтегли от тук](https://www.mongodb.com/try/download/community)

### Стъпка 2: Стартиране на MongoDB

**Ако използваш Docker:**
```powershell
docker-compose up -d mongodb
```

**Ако използваш локална MongoDB инсталация:**
```powershell
Start-Service MongoDB
```

**Проверка:**
```powershell
# С Docker
docker ps | Select-String mongodb

# С локална инсталация
Get-Service MongoDB
```

### Стъпка 3: Инсталиране на Зависимости

**Backend:**
```powershell
cd backend
npm install
```

**Frontend:**
```powershell
cd frontend
npm install
```

### Стъпка 4: Конфигуриране на Backend

Файлът `backend/.env` вече е създаден автоматично. Ако липсва, създай го със следното съдържание:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/wonderclimb
JWT_SECRET=<генерирай-секретен-ключ>
JWT_EXPIRES_IN=7d
BOOKING_HORIZON_HOURS=720
CANCELLATION_WINDOW_HOURS=4
LOG_LEVEL=info
```

**За да генерираш JWT_SECRET:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Стъпка 5: Стартиране на Проекта

**Терминал 1 - MongoDB** (ако не е стартиран):
```powershell
docker-compose up -d mongodb
```

**Терминал 2 - Backend:**
```powershell
cd backend
npm run dev
```

**Терминал 3 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Стъпка 6: Отваряне в Браузър

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api/v1
- **Health Check:** http://localhost:3000/health

---

## Автоматизиран Setup (Алтернатива)

Ако искаш да използваш автоматизирания скрипт:

```powershell
# Първо разреши изпълнение на скриптове (еднократно)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# След това стартирай скрипта
.\setup-local-dev.ps1
```

---

## Често Срещани Проблеми

### Node.js не е намерен

**Проблем:** `node: command not found` или `npm: command not found`

**Решение:**
1. Инсталирай Node.js от [nodejs.org](https://nodejs.org/)
2. Рестартирай терминала
3. Провери дали работи: `node --version`

### MongoDB не стартира

**Проблем:** Грешка при свързване с MongoDB

**Решение:**
- Провери дали MongoDB е стартиран
- Ако използваш Docker: `docker-compose up -d mongodb`
- Ако използваш локална инсталация: `Start-Service MongoDB`

### Port 3000 е зает

**Проблем:** Backend не може да стартира на порт 3000

**Решение:** Промени порта в `backend/.env`:
```env
PORT=3001
```

---

## Полезни Команди

```powershell
# Проверка на MongoDB (Docker)
docker ps | Select-String mongodb

# Проверка на MongoDB (Локална)
Get-Service MongoDB

# Стартиране на MongoDB (Docker)
docker-compose up -d mongodb

# Стартиране на MongoDB (Локална)
Start-Service MongoDB

# Backend development
cd backend
npm run dev

# Frontend development
cd frontend
npm run dev
```

---

## За Повече Информация

Виж `LOCAL_SETUP.md` за подробно ръководство.

---

**Успешно кодиране! 🎉**

