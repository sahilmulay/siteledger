import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function Header({ title, subtitle, backTo, rightAction, backLabel, badge }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backTo) navigate(backTo)
    else navigate(-1)
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3 min-h-[60px]">
        {(backTo !== undefined || backLabel !== undefined) && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 truncate leading-tight">{title}</h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        </div>
        {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
      </div>
    </header>
  )
}
