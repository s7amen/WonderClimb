# WonderClimb Frontend

React admin panel for WonderClimb climbing gym management system.

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- Backend API running on http://localhost:3000

### Installation

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

