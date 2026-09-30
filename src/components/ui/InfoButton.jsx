import { useState } from 'react'
import { Info } from 'lucide-react'
import { Modal } from './Modal'

export function InfoButton({
  title = 'Information',
  description,
  points = [],
  className = '',
  buttonClassName = '',
  size = 'sm'
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (!description && (!points || points.length === 0)) return null

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4'
  }

  const buttonPaddings = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2'
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setIsOpen(true)
        }}
        className={[
          'rounded-full text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 flex-shrink-0',
          buttonPaddings[size] || buttonPaddings.sm,
          buttonClassName,
          className
        ].join(' ')}
        title={title ? `Help & info: ${title}` : 'Help & information'}
        aria-label={title ? `Help and information about ${title}` : 'Help and information'}
      >
        <Info className={iconSizes[size] || iconSizes.sm} />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        size="md"
      >
        <div className="space-y-4 text-sm text-gray-700">
          {description && (
            <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3.5">
              <p className="text-gray-800 text-sm leading-relaxed font-normal">
                {description}
              </p>
            </div>
          )}

          {points && points.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                What you can do here:
              </p>
              <ul className="space-y-2">
                {points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
