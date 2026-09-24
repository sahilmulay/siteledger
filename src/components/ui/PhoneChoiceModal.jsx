import { Phone, X } from 'lucide-react'

export function PhoneChoiceModal({ data, onClose }) {
  if (!data) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl animate-scale-up">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <Phone className="h-4 w-4 text-blue-600" />
            Choose Phone Number
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          <span className="font-semibold text-gray-800">{data.name}</span> has {data.numbers.length} phone numbers. Tap the one you want to use:
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
          {data.numbers.map((num, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                data.onSelect(num.clean)
                onClose()
              }}
              className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/60 active:bg-blue-100 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 font-mono tracking-wide">
                    {num.clean}
                  </p>
                  {num.raw !== num.clean && (
                    <p className="text-[11px] text-gray-400 truncate max-w-[170px]">
                      {num.raw}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                Select
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
