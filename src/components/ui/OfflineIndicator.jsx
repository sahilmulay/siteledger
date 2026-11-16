import { useState, useEffect } from 'react'
import { WifiOff, X } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setDismissed(false)
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline || dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-2 animate-slide-down">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm w-full">
        <div className="bg-gray-800 p-1.5 rounded-lg flex-shrink-0">
          <WifiOff className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">You are offline</p>
          <p className="text-xs text-gray-300 truncate">App is running in offline mode.</p>
        </div>
        <button 
          onClick={() => setDismissed(true)}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}
