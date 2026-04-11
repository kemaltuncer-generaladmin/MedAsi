"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getAllDefaultPackagePolicies, normalizePackageTier } from "@/lib/packages/policy-defaults";

type UsageResponse = {
  packageName: string;
  monthlyUsed: number;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  walletPurchase?: {
    serverEnabled: boolean;
    clientEnabled: boolean;
    status: "enabled" | "maintenance";
    detail: string;
  };
};

type HomeResponse = {
  user?: {
    packageName?: string;
  };
};

const PLAN_COLORS: Record<string, string> = {
  ucretsiz: "var(--color-text-secondary)",
  giris: "var(--color-primary)",
  pro: "var(--color-warning)",
  kurumsal: "var(--color-success)",
};

function formatNumber(value: number): string {
  return Math.max(0, Number.isFinite(value) ? value : 0).toLocaleString("tr-TR");
}

export default function WalletPage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usageRes, homeRes] = await Promise.all([
          fetch("/api/ai/usage", { cache: "no-store" }),
          fetch("/api/dashboard/home", { cache: "no-store" }),
        ]);

        if (usageRes.ok) {
          setUsage(await usageRes.json());
        }

        if (homeRes.ok) {
          setHome(await homeRes.json());
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const currentTier = useMemo(
    () => normalizePackageTier(home?.user?.packageName ?? usage?.packageName ?? "ucretsiz"),
    [home?.user?.packageName, usage?.packageName],
  );

  const policies = getAllDefaultPackagePolicies();
  const activePolicy = policies.find((item) => item.tier === currentTier) ?? policies[0];
  const monthlyUsed = usage?.monthlyUsed ?? 0;
  const balance = usage?.balance ?? 0;
  const totalSpent = usage?.totalSpent ?? 0;
  const totalEarned = usage?.totalEarned ?? 0;
  const purchaseStatus = usage?.walletPurchase?.status ?? "maintenance";
  const purchaseDetail = usage?.walletPurchase?.detail ?? "Satın alma bakım/kapalı modda";

  return (
    <AccountSubpageShell
      icon={Wallet}
      title="Cüzdan"
      description="Planınız, token kullanımı ve faturalama durumunu tek ekranda izleyin."
      badge={activePolicy.displayName}
      stats={[
        { label: "Mevcut plan", value: activePolicy.displayName },
        { label: "Bu ay harcanan", value: `${formatNumber(monthlyUsed)} token` },
        { label: "Bakiye", value: `${formatNumber(balance)} token` },
        { label: "Toplam harcama", value: `${formatNumber(totalSpent)} token` },
      ]}
      actions={
        <Link href="/upgrade">
          <Button size="sm">
            <Sparkles size={14} />
            Planı Yükselt
          </Button>
        </Link>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card variant="bordered" className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={16} className="text-[var(--color-primary)]" />
              Plan karşılaştırması
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {policies.map((plan) => {
                const isActive = plan.tier === currentTier;
                return (
                  <div
                    key={plan.tier}
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: isActive
                        ? "color-mix(in srgb, var(--color-primary) 45%, var(--color-border))"
                        : "var(--color-border)",
                      backgroundColor: isActive
                        ? "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))"
                        : "var(--color-surface-elevated)",
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {plan.displayName}
                      </p>
                      {isActive ? <Badge variant="default">Aktif</Badge> : null}
                    </div>
                    <p className="text-2xl font-semibold" style={{ color: PLAN_COLORS[plan.tier] }}>
                      ₺{formatNumber(plan.monthlyPrice)}
                      <span className="text-sm font-normal text-[var(--color-text-secondary)]"> / ay</span>
                    </p>
                    <div className="mt-3 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-[var(--color-success)]" />
                        {formatNumber(plan.initialTokenGrant)} başlangıç token
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-[var(--color-success)]" />
                        {plan.questionBankMonthlyLimit === null
                          ? "Sınırsız soru bankası"
                          : `${formatNumber(plan.questionBankMonthlyLimit)} soru / ay`}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-[var(--color-success)]" />
                        {plan.hasExamAccess ? "Sınav modülleri açık" : "Temel sınav erişimi"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card variant="bordered" className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={16} className="text-[var(--color-primary)]" />
                Token özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">Toplam kazanım</span>
                <span className="font-medium text-[var(--color-text-primary)]">{formatNumber(totalEarned)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">Toplam harcama</span>
                <span className="font-medium text-[var(--color-text-primary)]">{formatNumber(totalSpent)}</span>
              </div>
              <div className="h-px bg-[var(--color-border)]" />
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">Mevcut bakiye</span>
                <span className="font-semibold text-[var(--color-primary)]">{formatNumber(balance)} token</span>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered" className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={16} className="text-[var(--color-primary)]" />
                Faturalama ve ödeme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <p>
                {purchaseStatus === "enabled"
                  ? "Satın alma aktif. Kart yönetimi ve fatura geçmişi yakında bu alanda görünecek."
                  : "Satın alma şu anda bakım/kapalı modda. Bu bir sistem hatası değil, kontrollü duraktır."}
              </p>
              <p className="text-xs">{purchaseDetail}</p>
              <Link
                href="/account/support"
                className="inline-flex items-center gap-1.5 text-[var(--color-primary)] hover:underline"
              >
                Faturalama desteği aç
                <ArrowRight size={13} />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {!loading ? null : (
        <Card variant="bordered" className="rounded-3xl">
          <CardContent className="text-sm">Veriler güncelleniyor…</CardContent>
        </Card>
      )}
    </AccountSubpageShell>
  );
}
