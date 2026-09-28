export function PdfIcon({ className = 'h-4 w-4', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="5.8"
        fontWeight="900"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fill="currentColor"
        stroke="none"
        letterSpacing="-0.3px"
      >
        PDF
      </text>
    </svg>
  )
}
