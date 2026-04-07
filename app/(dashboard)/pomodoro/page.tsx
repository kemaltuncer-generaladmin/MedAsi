'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Play, Pause, RotateCcw, Coffee, Brain, Timer } from 'lucide-react'

type Mode = 'work' | 'short' | 'long'
type Session = { task: string; duration: number; completedAt: Date; mode: Mode }

const MODES: Record<Mode, { label: string; duration: number; color: string; icon: React.ElementType }> = {
  work: { label: 'Çalışma', duration: 25 * 60, color: 'var(--color-primary)', icon: Brain },
  short: { label: 'Kısa Mola', duration: 5 * 60, color: 'var(--color-success)', icon: Coffee },
  long: { label: 'Uzun Mola', duration: 15 * 60, color: 'var(--color-warning)', icon: Timer },
}

const RADIUS = 110
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function PomodoroPage() {
  const [mode, setMode] = useState<Mode>('work')
  const [timeLeft, setTimeLeft] = useState(MODES.work.duration)
  const [running, setRunning] = useState(false)
  const [task, setTask] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [todayPomodoros, setTodayPomodoros] = useState(0)
  const [totalFocus, setTotalFocus] = useState(0)
  const [breaks, setBreaks] = useState(0)
  const [streak, setStreak] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalTime = MODES[mode].duration
  const progress = timeLeft / totalTime
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const modeColor = MODES[mode].color

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seconds = (timeLeft % 60).toString().padStart(2, '0')

  const playSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch (_) {}
  }, [])

  const handleComplete = useCallback(() => {
    setRunning(false)
    playSound()
    if (mode === 'work') {
      const session: Session = {
        task: task || 'Görev belirtilmedi',
        duration: MODES.work.duration / 60,
        completedAt: new Date(),
        mode: 'work',
      }
      setSessions(prev => [session, ...prev.slice(0, 9)])
      setTodayPomodoros(p => p + 1)
      setTotalFocus(f => f + MODES.work.duration / 60)
      setStreak(s => s + 1)
    } else {
      setBreaks(b => b + 1)
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('MEDASI Pomodoro', {
        body: mode === 'work' ? 'Çalışma seansı tamamlandı! Mola zamanı.' : 'Mola bitti! Çalışmaya devam et.',
        icon: '/favicon.ico',
      })
    }
  }, [mode, task, playSound])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            handleComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current!)
    }
    return () => clearInterval(intervalRef.current!)
  }, [running, handleComplete])

  function changeMode(m: Mode) {
    setMode(m)
    setTimeLeft(MODES[m].duration)
    setRunning(false)
    clearInterval(intervalRef.current!)
  }

  function reset() {
    setRunning(false)
    setTimeLeft(MODES[mode].duration)
    clearInterval(intervalRef.current!)
  }

  function toggleRun() {
    if (timeLeft === 0) {
      setTimeLeft(MODES[mode].duration)
      setRunning(true)
    } else {
      setRunning(r => !r)
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  const ModeIcon = MODES[mode].icon

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Pomodoro Zamanlayıcı</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Odaklanmış çalışma seanslarıyla verimliliğini artır</p>
      </div>

      <div className="flex justify-center gap-2">
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => changeMode(m)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              mode === m
                ? `text-[var(--color-text-primary)] border-b-2`
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
            style={mode === m ? { borderBottomColor: modeColor } : {}}
          >
            {MODES[m].label} {m === 'work' ? '25dk' : m === 'short' ? '5dk' : '15dk'}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <svg width="280" height="280" viewBox="0 0 280 280">
            <circle
              cx="140" cy="140" r={RADIUS}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="8"
            />
            <circle
              cx="140" cy="140" r={RADIUS}
              fill="none"
              stroke={modeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 140 140)"
              style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ModeIcon size={20} style={{ color: modeColor }} className="mb-2" />
            <p className="text-6xl font-bold font-mono text-[var(--color-text-primary)] tabular-nums">
              {minutes}:{seconds}
            </p>
            <p className="text-sm font-medium mt-1" style={{ color: modeColor }}>
              {MODES[mode].label.toUpperCase()} MODU
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={reset} disabled={running && timeLeft === MODES[mode].duration}>
            <RotateCcw size={16} />
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={toggleRun}
            className="px-10"
            style={{ backgroundColor: modeColor }}
          >
            {running ? <Pause size={20} /> : <Play size={20} />}
            {running ? 'Duraklat' : timeLeft === 0 ? 'Yeniden Başlat' : 'Başlat'}
          </Button>
          <Button variant="ghost" size="md" onClick={() => changeMode(mode === 'work' ? 'short' : 'work')}>
            <Coffee size={16} />
          </Button>
        </div>

        <div className="w-full max-w-sm">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Ne çalışıyorsunuz?</label>
          <input
            type="text"
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Örn: Kardiyoloji çalışması, Vaka hazırlığı..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Bugünkü Pomodoro', value: todayPomodoros, color: 'text-[var(--color-primary)]' },
          { label: 'Toplam Odaklanma', value: `${totalFocus} dk`, color: 'text-[var(--color-text-primary)]' },
          { label: 'Tamamlanan Mola', value: breaks, color: 'text-[var(--color-success)]' },
          { label: 'En Uzun Seri', value: streak, color: 'text-[var(--color-warning)]' },
        ].map(stat => (
          <div key={stat.label} className="text-center p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] border-t-2" style={{ borderTopColor: 'var(--color-primary)' }}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <Card variant="bordered">
        <CardTitle className="mb-4">Bugünkü Seanslar</CardTitle>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Timer size={32} className="text-[var(--color-text-secondary)] mx-auto mb-2" />
            <p className="text-[var(--color-text-secondary)] text-sm">Henüz seans tamamlanmadı</p>
            <p className="text-[var(--color-text-secondary)] text-xs mt-1">İlk Pomodoronuzu başlatın!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">{formatTime(s.completedAt)}</span>
                  <span className="text-sm text-[var(--color-text-primary)]">{s.task}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{s.duration} dk</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
