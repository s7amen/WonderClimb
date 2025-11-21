# Testing Guide - Unified User Model

## Как да пуснеш тестовете

### Предварителни изисквания
- Node.js >= 20.0.0
- MongoDB (използва се MongoDB Memory Server за тестовете - автоматично се инсталира)

### Инсталация на зависимости
```bash
cd backend
npm install
```

### Стартиране на тестовете

#### Всички тестове
```bash
npm test
```

#### Конкретен тест файл
```bash
npm test -- --testPathPattern="unifiedUserModel"
```

#### Тестове с watch mode (автоматично рестартиране при промени)
```bash
npm run test:watch
```

#### Тестове с coverage report
```bash
npm run test:coverage
```

#### Verbose output (показва всички тестове)
```bash
npm test -- --verbose
```

#### Конкретен тест по име
```bash
npm test -- -t "should create child User with inactive status"
```

### Структура на тестовете

Тестовете са разделени в следните файлове:

1. **auth.e2e.test.js** - Тестове за authentication (регистрация, login)
2. **parentClimbers.e2e.test.js** - Тестове за управление на деца от родители
3. **parentBooking.e2e.test.js** - Тестове за резервации от родители
4. **adminSessions.e2e.test.js** - Тестове за управление на сесии от админ
5. **coachAttendance.e2e.test.js** - Тестове за отбелязване на присъствие от треньор
6. **unifiedUserModel.e2e.test.js** - Нови тестове за unified User модела

### Какво тества unifiedUserModel.e2e.test.js

1. ✅ Създаване на дете с inactive статус
2. ✅ Проверка за дублиране (firstName + lastName + dateOfBirth)
3. ✅ Свързване към съществуващ детски профил
4. ✅ Предотвратяване на дублирано свързване към същия родител
5. ✅ Предотвратяване на свързване ако детето вече е свързано към друг родител
6. ✅ Активиране на детски акаунт с валидация на данни
7. ✅ Актуализиране на профил по време на активиране
8. ✅ Неактивните акаунти не могат да се логват
9. ✅ Сравняване на пароли с null passwordHash
10. ✅ Админ създава деца без родители
11. ✅ Админ свързва деца към родители
12. ✅ Заявки за катерачи (показва всички, не само активните)
13. ✅ Филтриране по accountStatus за статус на акаунта
14. ✅ Връзки родител-дете
15. ✅ Резервации с User вместо Climber
16. ✅ Присъствие с User вместо Climber
17. ✅ Множество родители на дете чрез ParentInfo
18. ✅ Три-именна структура (firstName, middleName, lastName)
19. ✅ Полета за снимка и членство в клуб
20. ✅ Ръчно премахване на ParentClimberLink

### Troubleshooting

#### Проблем: "Cannot use import statement outside a module"
**Решение**: Уверете се, че използвате правилната команда:
```bash
npm test
```
Командата автоматично използва `--experimental-vm-modules` флага.

#### Проблем: Тестовете са бавни
**Решение**: MongoDB Memory Server създава временна база данни. Първият тест може да отнеме малко повече време.

#### Проблем: Тестовете не се изчистват правилно
**Решение**: Проверете `tests/setup.js` - той трябва да изчиства колекциите след всеки тест.

### Полезни команди

#### Стартиране на конкретен тест по име
```bash
npm test -- -t "should create child User with inactive status"
```

#### Стартиране на тестове в определен файл с verbose
```bash
npm test -- --testPathPattern="unifiedUserModel" --verbose
```

#### Пропускане на тестове (skip)
Добавете `.skip` преди `describe` или `it`:
```javascript
describe.skip('Skipped test suite', () => {
  // ...
});
```

#### Стартиране само на един тест
Добавете `.only` преди `describe` или `it`:
```javascript
describe.only('Only this test', () => {
  // ...
});
```

