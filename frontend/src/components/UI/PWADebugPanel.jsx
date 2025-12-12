import { useState } from 'react';

const PWADebugPanel = ({ debugInfo, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if debugInfo exists and has at least one property
  if (!debugInfo || (typeof debugInfo === 'object' && Object.keys(debugInfo).length === 0)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] max-w-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-600 text-white px-3 py-2 rounded-t-lg text-xs font-medium shadow-lg"
      >
        {isExpanded ? '▼' : '▲'} PWA Debug
      </button>
      {isExpanded && (
        <div className="bg-white border border-gray-300 rounded-b-lg shadow-xl p-3 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-gray-700">Debug Info</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-xs text-gray-600 font-mono">
            {debugInfo.protocol && (
              <div><strong>Protocol:</strong> {debugInfo.protocol}</div>
            )}
            {debugInfo.hostname && (
              <div><strong>Hostname:</strong> {debugInfo.hostname}</div>
            )}
            {debugInfo.hasBeforeInstallPrompt !== undefined && (
              <div><strong>Has beforeinstallprompt:</strong> {debugInfo.hasBeforeInstallPrompt ? '✅ true' : '❌ false'}</div>
            )}
            {debugInfo.deferredPrompt !== undefined && (
              <div><strong>Deferred prompt:</strong> {debugInfo.deferredPrompt ? '✅ true' : '❌ false'}</div>
            )}
            {debugInfo.deferredPromptRef !== undefined && (
              <div><strong>Deferred prompt (ref):</strong> {debugInfo.deferredPromptRef ? '✅ true' : '❌ false'}</div>
            )}
            {debugInfo.promptEverReceived !== undefined && (
              <div><strong>Prompt received:</strong> {debugInfo.promptEverReceived ? '✅ true' : '❌ false'}</div>
            )}
            {debugInfo.hasEarlyPrompt !== undefined && (
              <div><strong>Early prompt:</strong> {debugInfo.hasEarlyPrompt ? '✅ true' : '❌ false'}</div>
            )}
            {debugInfo.isDesktop !== undefined && (
              <div><strong>Detected as Desktop:</strong> {debugInfo.isDesktop ? '⚠️ true' : '✅ false'}</div>
            )}
            {debugInfo.browserInfo && (
              <div>
                <strong>Browser:</strong> {
                  debugInfo.browserInfo.isIOS ? 'iOS' : 
                  debugInfo.browserInfo.isAndroid ? 'Android' : 
                  'Other'
                }
              </div>
            )}
            {debugInfo.userAgent && (
              <div className="break-all text-[10px] mt-2">
                <strong>User Agent:</strong> {debugInfo.userAgent.substring(0, 80)}...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PWADebugPanel;


