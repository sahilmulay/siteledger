import { Modal } from './Modal'
import { Button } from './Button'

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" fullWidth onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
