# Template за нова страница

Този документ описва стандартната структура за всички страници в приложението.

## Структура на страницата

Всички страници трябва да следват следната структура:

### 1. Layout компонент

Страниците се обвиват в подходящ Layout компонент, който осигурява:
- Header и Footer
- Фон (`bg-[#f3f3f5]`)
- Ширина на работната област (`max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8`)

**Достъпни Layout компоненти:**
- `AdminLayout` — за админ страници
- `ClimberLayout` — за страници на катерачи
- `ParentLayout` — за страници на родители
- `CoachLayout` — за страници на треньори

### 2. Основна структура на страницата

```jsx
import { /* необходими импорти */ } from '...';

const MyPage = () => {
  // State и логика

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">
          Заглавие на страницата
        </h1>
      </div>

      {/* Съдържание */}
      <div>
        {/* Вашето съдържание тук */}
      </div>
    </div>
  );
};

export default MyPage;
```

## Правила

### H1 Заглавие

- **Винаги използвайте h1** за главното заглавие на страницата
- **Стил**: `className="text-3xl font-bold text-neutral-950"`
- **Размер**: 32px (text-3xl в Tailwind)
- **Тежест**: Bold (700)
- **Line-height**: 1.2
- **Цвят**: `text-neutral-950` (#35383d)

### Подзаглавия

- **НЕ използвайте подзаглавия под h1** (като описателни текстове)
- Ако е необходимо, използвайте h2 или h3 за секции в съдържанието

### Ширина и Padding

- **НЕ добавяйте собствени wrapper-и** за ширина или padding
- Layout компонентите вече осигуряват това
- Използвайте `space-y-6` за вертикално разстояние между секции

### Фон

- **НЕ задавайте собствен фон** на страницата
- Layout компонентите вече осигуряват `bg-[#f3f3f5]`

### Шрифт

- **НЕ използвайте explicit `font-rubik` класове**
- Rubik е основният шрифт и е зададен глобално
- Вижте `TYPOGRAPHY.md` за пълна типографска система

## Примерен Template

```jsx
import { useState, useEffect } from 'react';
import Card from '../../components/UI/Card';
import Loading from '../../components/UI/Loading';
import { useToast } from '../../components/UI/Toast';

const MyNewPage = () => {
  const [loading, setLoading] = useState(true);
  const { ToastComponent } = useToast();

  useEffect(() => {
    // Зареждане на данни
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Вашата логика тук
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Зареждане..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-950">
          Заглавие на страницата
        </h1>
      </div>

      {/* Toast Component */}
      <ToastComponent />

      {/* Main Content */}
      <Card>
        <div className="p-6">
          {/* Вашето съдържание тук */}
        </div>
      </Card>
    </div>
  );
};

export default MyNewPage;
```

## Референция към Type Scale

За пълна информация относно типографската система, вижте `TYPOGRAPHY.md`.

### Бърза справка:

- **H1**: `text-3xl font-bold text-neutral-950` (32px)
- **H2**: `text-2xl font-semibold text-neutral-950` (24px)
- **H3**: `text-xl font-medium text-neutral-950` (20px)
- **Body L**: `text-base font-normal` (16px)
- **Body M**: `text-sm font-normal` (14px)
- **Body S**: `text-xs font-normal` (12px)

## Важни бележки

1. **Всички страници трябва да следват този template**
2. **Ако промените структурата на една страница, актуализирайте всички останали**
3. **Layout компонентите осигуряват консистентност между страниците**
4. **Не променяйте съдържанието на страниците без причина — само структурата**

## Проверка преди commit

Преди да commit-нете нова страница, проверете:

- [ ] Има h1 заглавие със стандартния стил
- [ ] Няма подзаглавия под h1
- [ ] Няма дублиращи се wrapper-и за ширина/фон
- [ ] Използва правилния Layout компонент
- [ ] Следва типографската система от TYPOGRAPHY.md




