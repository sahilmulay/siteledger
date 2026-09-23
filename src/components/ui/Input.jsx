export function Input({ label, error, hint, className = '', required, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        {...props}
        className={[
          'w-full px-4 py-3 rounded-xl border text-base',
          'bg-white placeholder-gray-400 text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-150 min-h-[48px]',
          error ? 'border-red-400 bg-red-50' : 'border-gray-200',
          className
        ].join(' ')}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', required, rows = 3, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        {...props}
        className={[
          'w-full px-4 py-3 rounded-xl border text-base',
          'bg-white placeholder-gray-400 text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-150 resize-none',
          error ? 'border-red-400 bg-red-50' : 'border-gray-200',
          className
        ].join(' ')}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, hint, className = '', required, children, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        {...props}
        className={[
          'w-full px-4 py-3 rounded-xl border text-base',
          'bg-white text-gray-900 appearance-none',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-150 min-h-[48px]',
          error ? 'border-red-400 bg-red-50' : 'border-gray-200',
          className
        ].join(' ')}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  )
}
