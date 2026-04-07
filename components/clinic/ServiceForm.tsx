'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bed, Loader2 } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { serviceSchema, type ServiceInput } from '@/lib/schemas/clinic/shared'
import { toast } from 'react-hot-toast'

interface ServiceFormProps {
  patientId: string
  onSaved?: () => void
}

export function ServiceForm({ patientId, onSaved }: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: {
      patientId,
      type: '',
      status: 'requested',
      note: '',
    },
  })

  const onSubmit = async (values: ServiceInput) => {
    try {
      const res = await fetch('/api/clinic/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j?.error || 'Kayıt başarısız')
        return
      }
      toast.success('Servis kaydı oluşturuldu')
      reset({ patientId, type: '', status: 'requested', note: '' })
      onSaved?.()
    } catch {
      toast.error('Bağlantı hatası')
    }
  }

  return (
    <Card variant="bordered" className="rounded-xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <Bed size={18} className="text-[var(--color-primary)]" />
        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Servis İşlemi</h3>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Hizmet Türü"
          placeholder="Konsültasyon / Yatış / Görüntüleme..."
          className="h-11"
          error={errors.type?.message}
          {...register('type')}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-[var(--color-text-secondary)]">Durum</label>
          <select
            className="h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[var(--color-text-primary)]"
            {...register('status')}
          >
            <option value="requested">İstendi</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="completed">Tamamlandı</option>
          </select>
          {errors.status?.message ? <p className="text-xs text-[var(--color-destructive)]">{errors.status.message}</p> : null}
        </div>

        <Input
          label="Not"
          placeholder="Opsiyonel not"
          className="h-11"
          error={errors.note?.message}
          {...register('note')}
        />

        <div className="flex justify-end">
          <Button type="submit" className="h-11 rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Kaydet
          </Button>
        </div>
      </form>
    </Card>
  )
}
