import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300',
  secondary: 'bg-white text-blue-700 border border-blue-700 hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50',
  success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-green-300',
}

const sizes = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-3 text-base min-h-[44px]',
  lg: 'px-6 py-4 text-lg min-h-[52px]',
  icon: 'p-3 min-h-[44px] min-w-[44px]',
}

export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  className = '', fullWidth = false, ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2',
        'rounded-xl font-semibold transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'select-none cursor-pointer',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className
      ].filter(Boolean).join(' ')}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
