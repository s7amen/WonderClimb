# WonderClimb Frontend

React admin panel for WonderClimb climbing gym management system.

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- Backend API running on http://localhost:3000

### Installation 3

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:5173

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Testing the API

### Option 1: HTML Test Page (Quick Testing)

Open `public/test-api.html` in your browser:
- Direct file: `file:///path/to/frontend/public/test-api.html`
- Or serve it: `python -m http.server 8080` then visit `http://localhost:8080/test-api.html`

### Option 2: React App

Start the dev server and use the React interface:
```bash
npm run dev
```

## Project Structure

```
frontend/
├── public/          # Static files
│   └── test-api.html  # API testing interface
├── src/
│   ├── components/  # React components
│   ├── pages/       # Page components
│   ├── services/    # API services
│   ├── utils/       # Utilities
│   └── main.jsx     # Entry point
└── package.json
```

## API Testing Links

- **Test Page**: Open `public/test-api.html` in browser
- **Backend API**: http://localhost:3000/api/v1
- **API Docs**: http://localhost:3000/api/v1/docs
- **Health Check**: http://localhost:3000/health

---

## Best Practices

### Обновяване на данни без презареждане на страницата

При обновяване/създаване/изтриване на елементи **НЕ** използвай пълно презареждане на данните. Вместо това:

1. **Обновявай само конкретния елемент в масива:**
   ```javascript
   // ✅ Правилно
   const response = await api.update(id, data);
   const updatedItem = response.data.item;
   setItems(prev => prev.map(item => item._id === id ? updatedItem : item));
   
   // ❌ Неправилно
   await api.update(id, data);
   fetchItems(); // Презарежда всички
   ```

2. **Добави id атрибути за scroll функционалност:**
   ```jsx
   <div id={`item-${item._id}`}>
     {/* content */}
   </div>
   ```

3. **Използвай helper функция за scroll:**
   ```javascript
   const scrollToElement = (elementId) => {
     setTimeout(() => {
       const element = document.getElementById(elementId);
       if (element) {
         element.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
     }, 100);
   };
   
   // След успешно обновяване
   scrollToElement(`item-${id}`);
   ```

4. **При създаване - добави новия елемент в масива:**
   ```javascript
   const response = await api.create(data);
   const newItem = response.data.item;
   setItems(prev => [...prev, newItem].sort(/* сортиране ако е нужно */));
   scrollToElement(`item-${newItem._id}`);
   ```

5. **При изтриване - премахни елемента от масива:**
   ```javascript
   await api.delete(id);
   setItems(prev => prev.filter(item => item._id !== id));
   ```

**ВАЖНО**: Този подход трябва да се прилага за всички страници с подобни операции!

