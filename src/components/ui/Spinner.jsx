import { Loader2 } from 'lucide-react'

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8', xl: 'h-12 w-12' }
  return (
    <Loader2 className={['animate-spin text-blue-600', sizes[size] || sizes.md, className].join(' ')} />
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-3 text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return (
    <div className={['animate-pulse bg-gray-200 rounded-xl', className].join(' ')} />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="flex gap-3 pt-1">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}
