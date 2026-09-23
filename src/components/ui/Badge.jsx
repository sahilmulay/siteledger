import { STATUS_COLORS } from '../../lib/constants'

export function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' }
  return (
    <span className={['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', colors.bg, colors.text].join(' ')}>
      <span className={['w-1.5 h-1.5 rounded-full', colors.dot].join(' ')} />
      {status}
    </span>
  )
}

export function Badge({ children, color = 'blue', className = '' }) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
    purple: 'bg-purple-100 text-purple-800',
    gray: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colorMap[color] || colorMap.gray, className].join(' ')}>
      {children}
    </span>
  )
}
