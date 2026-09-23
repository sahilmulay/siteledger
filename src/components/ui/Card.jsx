export function Card({ children, className = '', onClick, padding = 'p-4' }) {
  const base = 'bg-white rounded-2xl shadow-sm border border-gray-100'
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={[base, padding, 'w-full text-left active:scale-[0.98] transition-transform', className].join(' ')}
      >
        {children}
      </button>
    )
  }
  return (
    <div className={[base, padding, className].join(' ')}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={['flex items-center justify-between mb-3', className].join(' ')}>{children}</div>
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={['font-semibold text-gray-800', className].join(' ')}>{children}</h3>
}
