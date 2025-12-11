# Cron Jobs Документация

## Активни задачи

### 1. Card Queue Processor
- **Schedule**: Всеки ден в 00:00 (`0 0 * * *`)
- **Файл**: `backend/src/jobs/cardQueueProcessor.js`
- **Описание**: Автоматично активиране на физически карти от опашката
- **Ръчно стартиране**: Admin UI `/admin/cron-jobs`
- **Функционалност**:
  - Проверява всички pending queue записи
  - За всеки запис проверява дали старата карта (currentActivePassId) е неактивна
  - Ако старата карта е неактивна или изтекла - активира новата карта автоматично
  - Работи универсално за GymPass и TrainingPass

## Как да добавиш нова задача

1. Създай файл `backend/src/jobs/yourJob.js`
2. Експортирай функция: `export const yourJob = async () => { ... }`
3. Добави в `backend/src/jobs/scheduler.js`:
```javascript
import { yourJob } from './yourJob.js';
import { recordJobExecution } from '../services/cronExecutionService.js';

// В startScheduler():
cron.schedule('0 2 * * *', async () => {
  await recordJobExecution('yourJob', yourJob, 'cron');
});

// В manualTriggers export:
export const manualTriggers = {
  ...,
  yourJob
};
```

4. Добави в `backend/src/controllers/cronController.js` → `listCronJobs()`:
```javascript
const jobs = [
  ...,
  {
    name: 'yourJob',
    displayName: 'Your Job Display Name',
    description: 'Описание на задачата',
    schedule: '0 2 * * *',
    scheduleReadable: 'Всеки ден в 02:00'
  }
];
```

5. Документирай тук в този файл

## Cron синтаксис

```
 ┌────────────── минута (0 - 59)
 │ ┌──────────── час (0 - 23)
 │ │ ┌────────── ден от месеца (1 - 31)
 │ │ │ ┌──────── месец (1 - 12)
 │ │ │ │ ┌────── ден от седмицата (0 - 6, 0=Sunday)
 │ │ │ │ │
 * * * * *
```

### Примери:
- `0 0 * * *` - всеки ден в полунощ (00:00)
- `0 */6 * * *` - на всеки 6 часа
- `30 2 * * 1` - всеки понеделник в 02:30
- `0 0 1 * *` - първия ден от всеки месец в полунощ

## UI Management

Admins могат да управляват cron jobs от `/admin/cron-jobs`:

- ✅ Виж списък с всички jobs
- ✅ Виж кога е изпълнен последно
- ✅ Виж статус на последното изпълнение (success/failed/running)
- ✅ Стартирай ръчно (за тестове или извънредни ситуации)
- ✅ Виж история на изпълненията с детайли:
  - Кога е стартиран
  - Колко време е отнело
  - Дали е успешно или е имало грешка
  - Кой е стартирал (ако е ръчно)

## Execution Tracking

Всички изпълнения се записват в `CronJobExecution` модел:

- **jobName**: Име на задачата
- **status**: `running`, `success`, или `failed`
- **startedAt**: Кога е започнало
- **completedAt**: Кога е завършило
- **duration**: Продължителност в милисекунди
- **error**: Съобщение за грешка (ако има)
- **triggeredBy**: `cron` или `manual`
- **triggeredByUserId**: Кой потребител е стартирал (ако е manual)

## Best Practices

1. **Error Handling**: Винаги wrap job логиката в try-catch
2. **Logging**: Използвай logger за важни събития
3. **Performance**: Оптимизирай заявките - използвай индекси и batch операции
4. **Idempotency**: Jobs трябва да са идемпотентни (безопасни за повторно изпълнение)
5. **Testing**: Тествай ръчно преди да добавиш в scheduler

## Troubleshooting

### Job не се изпълнява автоматично
- Провери дали scheduler е стартиран (трябва да видиш "Cron scheduler started" в логовете)
- Провери cron pattern синтаксиса
- Провери дали има грешки в логовете при стартиране

### Job се изпълнява но има грешки
- Провери историята в `/admin/cron-jobs`
- Виж error полето в CronJobExecution записа
- Провери application logs за повече детайли

### Ръчно стартиране не работи
- Провери дали job е добавен в `manualTriggers` export
- Провери дали имаш admin права
- Провери network tab за API грешки


