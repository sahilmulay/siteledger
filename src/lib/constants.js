export const EXPENSE_CATEGORIES = {
  Labour: ['Mason', 'Centring', 'Plumbing', 'Electrical', 'Painting', 'Tile Fitting', 'Other Labour'],
  Materials: ['Cement', 'Sand', 'Steel', 'Bricks', 'Paint', 'Tiles', 'Wood', 'Glass', 'Other Material'],
  Machinery: ['Excavator', 'Crane', 'Concrete Mixer', 'Scaffolding', 'Generator', 'Other Machinery'],
  Transport: ['Material Transport', 'Equipment Transport', 'Labour Transport', 'Other Transport'],
  'Professional Services': ['Architect', 'Structural Engineer', 'Interior Designer', 'Surveyor', 'Other Professional'],
  Miscellaneous: ['Safety Equipment', 'Site Office', 'Documentation', 'Other']
}

export const PAYMENT_MODES = [
  'Cash',
  'UPI',
  'Google Pay',
  'PhonePe',
  'Paytm',
  'Bank Transfer',
  'Cheque',
  'Credit',
  'Other'
]

export const PROJECT_STATUSES = ['Active', 'Completed', 'On Hold']

export const STATUS_COLORS = {
  Active: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  Completed: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  'On Hold': { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' }
}

export const CATEGORY_COLORS = {
  Labour: '#6366f1',
  Materials: '#f59e0b',
  Machinery: '#ef4444',
  Transport: '#10b981',
  'Professional Services': '#8b5cf6',
  Miscellaneous: '#6b7280'
}

export const ITEMS_PER_PAGE = 20
