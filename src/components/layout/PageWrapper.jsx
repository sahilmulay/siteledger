export function PageWrapper({ children, className = '', noPad = false }) {
  return (
    <main className={['max-w-lg mx-auto min-h-screen pb-24', noPad ? '' : 'px-4 py-4', className].join(' ')}>
      {children}
    </main>
  )
}

export function FAB({ onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 bg-blue-700 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 font-semibold hover:bg-blue-800 active:scale-95 transition-all"
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm">{label}</span>
    </button>
  )
}
