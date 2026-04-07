'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { User, Mail, Phone, MapPin, GraduationCap, Building2, Calendar, Stethoscope, Camera, Save, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_profile_v1'

interface ProfileData {
  displayName: string
  phone: string
  city: string
  role: string
  institution: string
  graduationYear: string
  specialty: string
  lastUpdated: string
}

const defaultProfile: ProfileData = {
  displayName: '',
  phone: '',
  city: '',
  role: '',
  institution: '',
  graduationYear: '',
  specialty: '',
  lastUpdated: '',
}

function getInitials(name: string): string {
  if (!name.trim()) return '?'
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setProfile(JSON.parse(raw))
    } catch {}
  }, [])

  function handleChange(field: keyof ProfileData, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function handleSave() {
    const updated: ProfileData = { ...profile, lastUpdated: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setProfile(updated)
      setSaved(true)
      toast.success('Profil kaydedildi')
    } catch {
      toast.error('Kayıt sırasında bir hata oluştu')
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-md text-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
  const selectClass = `${inputClass} appearance-none cursor-pointer`

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Profilim</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Kişisel ve eğitim bilgilerinizi güncelleyin</p>
      </div>

      {/* Profil Fotoğrafı */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Profil Fotoğrafı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-black shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              {getInitials(profile.displayName) || <User size={28} className="text-black" />}
            </div>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast('Yakında aktif olacak', { icon: '⏳' })}
                className="border border-[var(--color-border)]"
              >
                <Camera size={14} />
                Fotoğraf Yükle
              </Button>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">JPG, PNG veya GIF. Maks 2 MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kişisel Bilgiler */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={18} className="text-[var(--color-primary)]" />
            Kişisel Bilgiler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Ad Soyad
              </label>
              <input
                type="text"
                value={profile.displayName}
                onChange={e => handleChange('displayName', e.target.value)}
                placeholder="Adınız ve soyadınız"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5 flex items-center gap-2">
                <Mail size={14} className="text-[var(--color-text-secondary)]" />
                E-Posta
                <Badge variant="secondary" className="text-xs ml-1">Salt Okunur</Badge>
              </label>
              <input
                type="email"
                disabled
                placeholder="supabase'den alınacak"
                className="w-full px-3 py-2 rounded-md text-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                <span className="flex items-center gap-1.5"><Phone size={14} className="text-[var(--color-text-secondary)]" /> Telefon <span className="text-[var(--color-text-secondary)] font-normal">(opsiyonel)</span></span>
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[var(--color-text-secondary)]" /> Şehir</span>
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={e => handleChange('city', e.target.value)}
                placeholder="İstanbul, Ankara, İzmir..."
                className={inputClass}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eğitim Durumu */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap size={18} className="text-[var(--color-primary)]" />
            Eğitim Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Unvan / Rol</label>
              <select
                value={profile.role}
                onChange={e => handleChange('role', e.target.value)}
                className={selectClass}
              >
                <option value="">Seçiniz...</option>
                <option value="ogrenci">Tıp Öğrencisi</option>
                <option value="intern">İntörn</option>
                <option value="asistan">Asistan</option>
                <option value="uzman">Uzman</option>
                <option value="pratisyen">Pratisyen Hekim</option>
                <option value="diger">Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                <span className="flex items-center gap-1.5"><Building2 size={14} className="text-[var(--color-text-secondary)]" /> Üniversite / Hastane Adı</span>
              </label>
              <input
                type="text"
                value={profile.institution}
                onChange={e => handleChange('institution', e.target.value)}
                placeholder="Hacettepe Üniversitesi, Ankara Şehir Hastanesi..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-[var(--color-text-secondary)]" /> Mezuniyet / Beklenen Mezuniyet Yılı</span>
              </label>
              <input
                type="text"
                value={profile.graduationYear}
                onChange={e => handleChange('graduationYear', e.target.value)}
                placeholder="2025"
                maxLength={4}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                <span className="flex items-center gap-1.5"><Stethoscope size={14} className="text-[var(--color-text-secondary)]" /> Branş / Uzmanlık Alanı</span>
              </label>
              <input
                type="text"
                value={profile.specialty}
                onChange={e => handleChange('specialty', e.target.value)}
                placeholder="Kardiyoloji, Dahiliye, Genel Cerrahi..."
                className={inputClass}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kaydet */}
      <div className="flex items-center justify-between pb-6">
        <div className="text-sm text-[var(--color-text-secondary)]">
          {profile.lastUpdated && (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[var(--color-success)]" />
              Son güncelleme: {profile.lastUpdated}
            </span>
          )}
        </div>
        <Button variant="primary" size="md" onClick={handleSave}>
          <Save size={15} />
          {saved ? 'Kaydedildi' : 'Değişiklikleri Kaydet'}
        </Button>
      </div>
    </div>
  )
}
