'use client'

import { motion } from 'framer-motion'

interface ProgressStepperProps {
  currentStep: number
  labels: string[]
}

export function ProgressStepper({ currentStep, labels }: ProgressStepperProps) {
  const total = labels.length
  const progressPercent = ((currentStep - 1) / (total - 1)) * 100

  return (
    <div className="mb-8" aria-label="Onboarding adımları">
      <span className="sr-only">{`Adım ${currentStep} / ${total}`}</span>
      <div className="relative mb-3">
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-[var(--color-border)]" />
        <motion.div
          className="absolute left-0 top-3 h-0.5 bg-[var(--color-primary)]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
        <div className="relative flex justify-between">
          {labels.map((label, index) => {
            const step = index + 1
            const isCompleted = step < currentStep
            const isCurrent = step === currentStep
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  aria-label={label}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={[
                    'h-6 w-6 rounded-full border transition-all duration-300',
                    isCurrent
                      ? 'scale-110 border-[var(--color-primary)] bg-[var(--color-primary)]'
                      : isCompleted
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]',
                  ].join(' ')}
                />
                <span className="text-xs text-[var(--color-text-secondary)] hidden sm:block">{label}</span>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-center text-[var(--color-text-secondary)] sm:hidden">
        {currentStep}. Adım: {labels[currentStep - 1]}
      </p>
    </div>
  )
}
