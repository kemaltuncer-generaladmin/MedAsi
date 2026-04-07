'use client'

import { Input } from '@/components/ui'
import type { VitalSignsInput as VitalSigns } from '@/lib/schemas/clinic/shared'

interface VitalSignsInputProps {
  value: VitalSigns
  onChange: (value: VitalSigns) => void
}

function toNum(v: string) {
  if (!v.trim()) return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

export function VitalSignsInput({ value, onChange }: VitalSignsInputProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input
        label="Ateş (°C)"
        type="number"
        step="0.1"
        value={value.temperature ?? ''}
        onChange={(e) => onChange({ ...value, temperature: toNum(e.target.value) })}
        className="h-11"
      />
      <Input
        label="Nabız"
        type="number"
        value={value.pulse ?? ''}
        onChange={(e) => onChange({ ...value, pulse: toNum(e.target.value) })}
        className="h-11"
      />
      <Input
        label="TA Sistolik"
        type="number"
        value={value.systolic ?? ''}
        onChange={(e) => onChange({ ...value, systolic: toNum(e.target.value) })}
        className="h-11"
      />
      <Input
        label="TA Diyastolik"
        type="number"
        value={value.diastolic ?? ''}
        onChange={(e) => onChange({ ...value, diastolic: toNum(e.target.value) })}
        className="h-11"
      />
      <Input
        label="SpO2 (%)"
        type="number"
        value={value.spo2 ?? ''}
        onChange={(e) => onChange({ ...value, spo2: toNum(e.target.value) })}
        className="h-11"
      />
      <Input
        label="Solunum"
        type="number"
        value={value.respiratoryRate ?? ''}
        onChange={(e) => onChange({ ...value, respiratoryRate: toNum(e.target.value) })}
        className="h-11"
      />
    </div>
  )
}
