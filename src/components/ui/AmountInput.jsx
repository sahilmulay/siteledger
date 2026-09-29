import { useRef } from 'react'
import { formatIndianAmount } from '../../lib/formatters'

export function AmountInput({
  label,
  value = '',
  onChange,
  onBlur,
  error,
  hint,
  className = '',
  required,
  placeholder = '0.00',
  disabled = false,
  ...props
}) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const input = e.target
    const raw = input.value
    const selectionStart = input.selectionStart

    // Count non-comma characters before the cursor
    const charsBeforeCursor = raw.slice(0, selectionStart).replace(/,/g, '').length

    // Format to Indian comma format
    const formatted = formatIndianAmount(raw)

    if (onChange) {
      onChange(formatted, e)
    }

    // Restore accurate cursor position after formatting
    requestAnimationFrame(() => {
      if (!inputRef.current) return
      let newPos = 0
      let charsCounted = 0
      for (let i = 0; i < formatted.length; i++) {
        if (charsCounted >= charsBeforeCursor) break
        if (formatted[i] !== ',') {
          charsCounted++
        }
        newPos = i + 1
      }
      inputRef.current.setSelectionRange(newPos, newPos)
    })
  }

  const handleKeyDown = (e) => {
    // If backspacing directly over a comma, delete the digit before the comma
    if (e.key === 'Backspace') {
      const input = e.target
      const pos = input.selectionStart
      if (pos === input.selectionEnd && pos > 0 && input.value[pos - 1] === ',') {
        e.preventDefault()
        const val = input.value
        // remove the character right before the comma
        const newVal = val.slice(0, pos - 2) + val.slice(pos - 1)
        const formatted = formatIndianAmount(newVal)
        if (onChange) {
          onChange(formatted, e)
        }
        requestAnimationFrame(() => {
          if (inputRef.current) {
            const nextPos = Math.max(0, pos - 2)
            inputRef.current.setSelectionRange(nextPos, nextPos)
          }
        })
      }
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        disabled={disabled}
        autoComplete="off"
        className={[
          'w-full px-4 py-3 rounded-xl border text-base',
          'bg-white placeholder-gray-400 text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-150 min-h-[48px]',
          error ? 'border-red-400 bg-red-50' : 'border-gray-200',
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : '',
          className
        ].join(' ')}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  )
}
