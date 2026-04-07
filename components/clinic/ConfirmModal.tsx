'use client'

import { Button, Card } from '@/components/ui'

interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmText = 'Sil',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card variant="bordered" className="w-full max-w-md rounded-xl p-6">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" className="h-11" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant="destructive" className="h-11" onClick={onConfirm} disabled={loading}>
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  )
}
