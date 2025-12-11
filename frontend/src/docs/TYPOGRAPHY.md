# Типографска система — Rubik

## Font Family

**Основен шрифт**: Rubik, sans-serif

Rubik е геометричен sans-serif шрифт с заоблени ръбове. Осигурява модерен, достъпен и много четим вид, подходящ както за UI, така и за маркетинг.

## Font Weights (Нива на тежест)

Използвайте тези тежести последователно за определяне на йерархия и акцент:

- **300 – Light** → надписи, вторичен текст
- **400 – Regular** → основен текст
- **500 – Medium** → UI етикети, бутони, малки заглавия
- **600 – SemiBold** → подзаглавия
- **700 – Bold** → основни заглавия

## Type Scale (Веб)

### Headings

| Стил | Размер | Тежест | Line Height | Употреба |
|------|--------|--------|-------------|----------|
| H1 | 32px | Bold (700) | 1.2 | Заглавия на страници |
| H2 | 24px | SemiBold (600) | 1.25 | Заглавия на секции |
| H3 | 20px | Medium (500) | 1.3 | Подзаглавия на секции |

### Body Text

| Стил | Размер | Тежест | Line Height | Употреба |
|------|--------|--------|-------------|----------|
| Body L | 16px | Regular (400) | 1.5 | Основен текст |
| Body M | 14px | Regular (400) | 1.45 | Вторичен текст, бутони |
| Body S | 12px | Regular (400) | 1.5 | Надписи, капции |

## CSS Променливи

```css
--font-family-primary: 'Rubik', sans-serif;

/* Weights */
--weight-light: 300;
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;

/* Headings */
--h1-size: 32px;
--h1-weight: 700;
--h1-line-height: 1.2;

--h2-size: 24px;
--h2-weight: 600;
--h2-line-height: 1.25;

--h3-size: 20px;
--h3-weight: 500;
--h3-line-height: 1.3;

/* Body */
--body-l-size: 16px;
--body-l-weight: 400;
--body-l-line-height: 1.5;

--body-m-size: 14px;
--body-m-weight: 400;
--body-m-line-height: 1.45;

--body-s-size: 12px;
--body-s-weight: 400;
--body-s-line-height: 1.5;
```

## Tailwind Класове Мапиране

### Headings

- **H1**: `text-3xl font-bold text-neutral-950` (32px, weight 700, line-height 1.2)
- **H2**: `text-2xl font-semibold text-neutral-950` (24px, weight 600, line-height 1.25)
- **H3**: `text-xl font-medium text-neutral-950` (20px, weight 500, line-height 1.3)

### Body Text

- **Body L**: `text-base font-normal` (16px, weight 400, line-height 1.5)
- **Body M**: `text-sm font-normal` (14px, weight 400, line-height 1.45)
- **Body S**: `text-xs font-normal` (12px, weight 400, line-height 1.5)

### Font Weights

- **Light**: `font-light` (300)
- **Regular**: `font-normal` (400)
- **Medium**: `font-medium` (500)
- **SemiBold**: `font-semibold` (600)
- **Bold**: `font-bold` (700)

## Примери за употреба

### H1 — Заглавие на страница
```jsx
<h1 className="text-3xl font-bold text-neutral-950">
  Заглавие на страницата
</h1>
```

### H2 — Заглавие на секция
```jsx
<h2 className="text-2xl font-semibold text-neutral-950">
  Заглавие на секция
</h2>
```

### H3 — Подзаглавие
```jsx
<h3 className="text-xl font-medium text-neutral-950">
  Подзаглавие
</h3>
```

### Body L — Основен текст
```jsx
<p className="text-base font-normal text-neutral-950">
  Основен текст на страницата
</p>
```

### Body M — Вторичен текст
```jsx
<p className="text-sm font-normal text-[#4a5565]">
  Вторичен текст или описание
</p>
```

### Body S — Надписи и капции
```jsx
<span className="text-xs font-normal text-[#4a5565]">
  Надпис или капция
</span>
```

## Важни бележки

1. **Rubik е основният шрифт** за целия сайт и е зададен в `index.css` като `font-family: Rubik, sans-serif`
2. **Не използвайте explicit `font-rubik` класове** — шрифтът е по подразбиране
3. **Всички заглавия (h1, h2, h3) трябва да следват типографската система**
4. **Body текстове трябва да използват подходящия размер според контекста**
5. **Line-height се задава автоматично чрез Tailwind класовете**

## Референция

За повече информация относно структурата на страниците, вижте `PAGE_TEMPLATE.md`.




















