'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button, Card, Input } from '@/components/ui'
import { VitalSignsInput } from '@/components/clinic/VitalSignsInput'
import { patientSchema, type PatientInput } from '@/lib/schemas/clinic/shared'

interface PatientFormProps {
  initial?: Partial<PatientInput>
  onSaved?: () => void
}

export function PatientForm({ initial, onSaved }: PatientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PatientInput>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? '',
      age: initial?.age ?? 0,
      gender: initial?.gender ?? 'other',
      complaint: initial?.complaint ?? '',
      diagnosis: initial?.diagnosis ?? '',
      status: initial?.status ?? 'active',
      vitals: initial?.vitals ?? {},
    },
  })

  const mode = useMemo(() => (watch('id') ? 'PUT' : 'POST'), [watch])

  const submit = async (values: PatientInput) => {
    try {
      const res = await fetch('/api/clinic/patients', {
        method: mode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j?.error || 'İşlem başarısız')
        return
      }
      toast.success('Hasta kaydedildi')
      reset({
        id: undefined,
        name: '',
        age: 0,
        gender: 'other',
        complaint: '',
        diagnosis: '',
        status: 'active',
        vitals: {},
      })
      onSaved?.()
    } catch {
      toast.error('Bağlantı hatası')
    }
  }

  return (
    <Card variant="bordered" className="rounded-xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <UserPlus size={18} className="text-[var(--color-primary)]" />
        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Hasta Formu</h3>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Ad Soyad" className="h-11" error={errors.name?.message} {...register('name')} />
          <Input label="Yaş" type="number" className="h-11" error={errors.age?.message} {...register('age', { valueAsNumber: true })} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[var(--color-text-secondary)]">Cinsiyet</label>
            <select className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[var(--color-text-primary)]" {...register('gender')}>
              <option value="male">Erkek</option>
              <option value="female">Kadın</option>
              <option value="other">Diğer</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[var(--color-text-secondary)]">Durum</label>
            <select className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[var(--color-text-primary)]" {...register('status')}>
              <option value="active">Aktif</option>
              <option value="discharged">Taburcu</option>
            </select>
          </div>
        </div>

        <Input label="Başvuru Şikayeti" className="h-11" error={errors.complaint?.message} {...register('complaint')} />
        <Input label="Ön Tanı" className="h-11" error={errors.diagnosis?.message} {...register('diagnosis')} />

        <div>
          <h4 className="mb-3 text-sm text-[var(--color-text-secondary)]">Vital Bulgular</h4>
          <VitalSignsInput
            value={watch('vitals') || {}}
            onChange={(v) => setValue('vitals', v, { shouldDirty: true, shouldValidate: true })}
          />
        </div>

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
