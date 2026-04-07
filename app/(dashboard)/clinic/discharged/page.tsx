'use client'
import { useState, useEffect } from 'react'
import { DischargeForm } from '@/components/clinic'
import { LogOut } from 'lucide-react'

type Patient = { id: string; name: string; complaint: string }

export default function DischargedPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    fetch('/api/clinic/patients').then(r => r.json()).then(d => setPatients(d.patients ?? []))
  }, [])

  const selected = patients.find(p => p.id === selectedId)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-success)]/10 flex items-center justify-center">
          <LogOut size={20} className="text-[var(--color-success)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Taburcu İşlemleri</h1>
          <p className="text-[var(--color-text-secondary)]">Hasta taburcu belgesi oluşturun</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Hasta Seçin</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]">
          <option value="">Hasta seçin</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name} - {p.complaint}</option>)}
        </select>
      </div>
      {selected && <DischargeForm patientId={selected.id} />}
    </div>
  )
}
