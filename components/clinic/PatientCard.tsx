'use client'

import { Edit, Trash2, FileText } from 'lucide-react'
import { Button, Card } from '@/components/ui'

export interface PatientCardItem {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  complaint: string
  diagnosis?: string
  status: 'active' | 'discharged'
  createdAt: string
}

interface PatientCardProps {
  patient: PatientCardItem
  onEdit: (patient: PatientCardItem) => void
  onDelete: (id: string) => void
  onPrint?: (patient: PatientCardItem) => void
}

export function PatientCard({ patient, onEdit, onDelete, onPrint }: PatientCardProps) {
  return (
    <Card variant="bordered" className="rounded-xl p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-[var(--color-text-primary)]">{patient.name}</h4>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {patient.age} yaş • {patient.gender === 'male' ? 'Erkek' : patient.gender === 'female' ? 'Kadın' : 'Diğer'}
          </p>
        </div>
        <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
          {patient.status === 'active' ? 'Aktif' : 'Taburcu'}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-[var(--color-text-primary)]"><span className="text-[var(--color-text-secondary)]">Şikayet:</span> {patient.complaint}</p>
        {patient.diagnosis ? (
          <p className="text-sm text-[var(--color-text-primary)]"><span className="text-[var(--color-text-secondary)]">Tanı:</span> {patient.diagnosis}</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="ghost" className="h-11" onClick={() => onEdit(patient)}>
          <Edit size={16} />
          Düzenle
        </Button>
        <Button variant="ghost" className="h-11" onClick={() => onDelete(patient.id)}>
          <Trash2 size={16} />
          Sil
        </Button>
        <Button variant="ghost" className="h-11" onClick={() => onPrint?.(patient)}>
          <FileText size={16} />
          Yazdır
        </Button>
      </div>
    </Card>
  )
}
