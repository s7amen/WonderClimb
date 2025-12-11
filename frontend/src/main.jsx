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

  // Early capture of beforeinstallprompt event before React mounts
  // This ensures we don't miss the event if it fires before React components mount
  console.log('[PWA Install] Setting up early beforeinstallprompt listener in main.jsx', {
    hasWindow: typeof window !== 'undefined',
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  });
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA Install] ✅ Early beforeinstallprompt captured in main.jsx', {
      event: e,
      hasPrompt: typeof e.prompt === 'function',
      timestamp: Date.now()
    });
    // Store the event in window so hook can access it
    window.__earlyBeforeInstallPrompt = e;
    // Prevent default to stop browser's default install prompt
    e.preventDefault();
    // Dispatch custom event so hook can pick it up
    window.dispatchEvent(new CustomEvent('early-beforeinstallprompt', { detail: e }));
    console.log('[PWA Install] Early event stored and custom event dispatched');
  }, { once: true, capture: true });
  
  console.log('[PWA Install] Early listener added successfully');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

