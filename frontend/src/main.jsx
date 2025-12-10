import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Suppress harmless Chrome extension message channel errors
// This error occurs when browser extensions inject message listeners
// that return true (indicating async response) but don't send a response
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    // Suppress the specific Chrome extension message channel error
    if (errorMessage.includes('message channel closed') || 
        errorMessage.includes('asynchronous response by returning true')) {
      // Silently ignore - this is a browser extension issue, not our code
      return;
    }
    originalError.apply(console, args);
  };

  // Also handle unhandled promise rejections for message channel errors
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || event.reason?.toString() || '';
    if (errorMessage.includes('message channel closed') || 
        errorMessage.includes('asynchronous response by returning true')) {
      event.preventDefault(); // Prevent error from showing in console
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

