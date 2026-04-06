import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Genel Bakış</h1>
        <p className="text-[var(--color-text-secondary)] mt-2">Hoş geldin! İşte senin özet panelin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="bordered">
          <div className="text-[var(--color-text-secondary)] text-sm mb-2 font-medium">Günlük AI Limitiniz</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-3xl font-bold text-white">
              8 <span className="text-lg text-[var(--color-text-secondary)]">/ 10</span>
            </div>
            <Badge variant="secondary">Öğrenci</Badge>
          </div>
        </Card>

        <Card variant="bordered">
          <div className="text-[var(--color-text-secondary)] text-sm mb-2 font-medium">Aktif Vakalar</div>
          <div className="text-3xl font-bold text-[var(--color-primary)] mt-4">12</div>
        </Card>

        <Card variant="bordered">
          <div className="text-[var(--color-text-secondary)] text-sm mb-2 font-medium">Kayıtlı Hastalar</div>
          <div className="text-3xl font-bold text-[var(--color-success)] mt-4">45</div>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Hızlı Erişim</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            variant="bordered"
            className="hover:border-[var(--color-primary)] cursor-pointer transition-colors duration-base"
          >
            <CardTitle className="text-[var(--color-primary)]">🩺 AI Tanı Asistanı</CardTitle>
            <CardContent className="mt-2 text-sm">
              Belirtileri girin, olası teşhisleri anında görün.
            </CardContent>
          </Card>

          <Card
            variant="bordered"
            className="hover:border-[var(--color-primary)] cursor-pointer transition-colors duration-base"
          >
            <CardTitle className="text-[var(--color-primary)]">🎮 Vaka Simülasyonu</CardTitle>
            <CardContent className="mt-2 text-sm">
              Sanal hastalarla etkileşimli pratik yapın.
            </CardContent>
          </Card>

          <Card
            variant="bordered"
            className="hover:border-[var(--color-primary)] cursor-pointer transition-colors duration-base"
          >
            <CardTitle className="text-[var(--color-primary)]">🤖 AI Asistan</CardTitle>
            <CardContent className="mt-2 text-sm">
              Her zaman yardıma hazır medikal AI asistanı.
            </CardContent>
          </Card>

          <Card
            variant="bordered"
            className="hover:border-[var(--color-primary)] cursor-pointer transition-colors duration-base"
          >
            <CardTitle className="text-[var(--color-primary)]">📰 Günlük Brifing</CardTitle>
            <CardContent className="mt-2 text-sm">
              Tıbbi haberler ve güncellemeler her gün.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
