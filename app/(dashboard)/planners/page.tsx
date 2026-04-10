import Link from "next/link";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import {
  CalendarDays,
  BookOpen,
  Sparkles,
  Stethoscope,
  School,
  FlaskConical,
  ChevronRight,
} from "lucide-react";

const items = [
  {
    href: "/planners/ders",
    icon: BookOpen,
    title: "Ders Planlayıcı",
    desc: "Günlük ders çalışma planı",
    color: "var(--color-primary)",
  },
  {
    href: "/planners/akilli",
    icon: Sparkles,
    title: "Akıllı Planlayıcı",
    desc: "AI destekli kişiselleştirilmiş plan",
    color: "var(--color-primary)",
  },
  {
    href: "/planners/tus",
    icon: School,
    title: "TUS Planlayıcı",
    desc: "TUS hazırlık takvimi",
    color: "var(--color-success)",
  },
  {
    href: "/planners/intern",
    icon: Stethoscope,
    title: "İntern Planlayıcı",
    desc: "İnternlik dönemi rotasyonları",
    color: "var(--color-warning)",
  },
  {
    href: "/planners/staj",
    icon: FlaskConical,
    title: "Staj Planlayıcı",
    desc: "Klinik staj programı",
    color: "var(--color-success)",
  },
  {
    href: "/planners/preklinik",
    icon: BookOpen,
    title: "Preklinik Planlayıcı",
    desc: "Temel bilimler çalışma planı",
    color: "var(--color-primary)",
  },
];

export default function PlannersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <CalendarDays size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Planlayıcılar
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Eğitim ve klinik dönem planlayıcıları
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card
              variant="bordered"
              className="p-5 hover:border-[var(--color-primary)]/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon size={18} style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base group-hover:text-[var(--color-primary)] transition-colors">
                      {item.title}
                    </CardTitle>
                    <ChevronRight
                      size={14}
                      className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]"
                    />
                  </div>
                  <CardContent className="text-sm mt-0.5">
                    {item.desc}
                  </CardContent>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
