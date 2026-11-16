import { AlertCircle } from 'lucide-react'
import { Button } from './Button'

export function ErrorState({ 
  title = 'Something went wrong', 
  message = 'We encountered an error while loading this data.',
  onRetry 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl shadow-sm border border-red-50">
      <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-gray-900 font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{message}</p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          Try Again
        </Button>
      )}
    </div>
  )
}
