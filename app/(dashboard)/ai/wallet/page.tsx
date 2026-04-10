"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  ShoppingCart,
  Clock,
  TrendingUp,
  TrendingDown,
  Gift,
  CreditCard,
  BarChart2,
  RefreshCw,
  Sparkles,
  ArrowDownRight,
  Info,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

// ─── Tipler ───────────────────────────────────────────────────────────────────
interface WalletData {
  balance: string;
  totalEarned: string;
  totalSpent: string;
  updatedAt: string;
  moduleBreakdown: { module: string; spent: string }[];
  last30days: { day: string; spent: string }[];
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  description: string;
  model: string | null;
  module: string | null;
  createdAt: string;
}

interface TokenPackage {
  id: string;
  name: string;
  tokens: string;
  bonusPct: number;
  priceTry: number;
  priceUsd: number;
  isPopular: boolean;
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
function formatTokens(n: string | number): string {
  const num = typeof n === "string" ? parseInt(n) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString("tr-TR");
}

function txIcon(type: string) {
  switch (type) {
    case "grant":
    case "bonus":
      return <Gift size={14} className="text-emerald-400" />;
    case "purchase":
      return <CreditCard size={14} className="text-blue-400" />;
    case "deduct":
      return <Zap size={14} className="text-amber-400" />;
    case "admin_adjust":
      return <Shield size={14} className="text-purple-400" />;
    default:
      return <Clock size={14} className="text-[var(--color-text-secondary)]" />;
  }
}

function txColor(type: string): string {
  return type === "deduct" ? "text-red-400" : "text-emerald-400";
}

function txSign(type: string): string {
  return type === "deduct" ? "−" : "+";
}

const TX_LABELS: Record<string, string> = {
  grant: "Plan Hediyesi",
  purchase: "Satın Alma",
  deduct: "AI Kullanımı",
  refund: "İade",
  bonus: "Bonus",
  admin_adjust: "Admin Ayarı",
};

const MODULE_LABELS: Record<string, string> = {
  chat: "AI Asistan",
  osce: "OSCE Sınavı",
  flashcard: "Flashcard AI",
  diagnosis: "AI Tanı",
  questions: "Soru Bankası",
  "daily-briefing": "Günlük Brifing",
  ai: "Genel AI",
};

// ─── Satın Alma Paketi Kartı ──────────────────────────────────────────────────
function PackageCard({
  pkg,
  onBuy,
  buying,
  purchaseEnabled,
}: {
  pkg: TokenPackage;
  onBuy: (id: string) => void;
  buying: string | null;
  purchaseEnabled: boolean;
}) {
  const base = parseInt(pkg.tokens);
  const totalTokens = pkg.bonusPct > 0 ? Math.floor(base * (1 + pkg.bonusPct / 100)) : base;

  return (
    <div
      className="relative rounded-2xl p-5 flex flex-col gap-4 transition-all"
      style={{
        background: pkg.isPopular ? "rgba(0,196,235,0.05)" : "var(--color-surface)",
        border: pkg.isPopular
          ? "1px solid rgba(0,196,235,0.4)"
          : "1px solid var(--color-border)",
      }}
    >
      {pkg.isPopular && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full whitespace-nowrap"
          style={{ background: "var(--color-primary)", color: "#0a0a0c" }}
        >
          En Popüler
        </span>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] mb-1">
          {pkg.name}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-2xl font-black text-[var(--color-text-primary)]">
            ₺{pkg.priceTry.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
            {formatTokens(totalTokens)} token
          </span>
          {pkg.bonusPct > 0 && (
            <Badge variant="success" className="text-[10px]">
              +{pkg.bonusPct}% Bonus
            </Badge>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          ≈ ₺{(pkg.priceTry / (totalTokens / 1000)).toFixed(2)} / 1K token
        </p>
      </div>

      <Button
        variant={pkg.isPopular ? "primary" : "secondary"}
        size="sm"
        className="w-full"
        disabled={buying === pkg.id || !purchaseEnabled}
        onClick={() => onBuy(pkg.id)}
      >
        {buying === pkg.id ? (
          <><RefreshCw size={13} className="animate-spin" /> Yükleniyor…</>
        ) : !purchaseEnabled ? (
          <><Shield size={13} /> Geçici Olarak Kapalı</>
        ) : (
          <><ShoppingCart size={13} /> Satın Al</>
        )}
      </Button>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function AIWalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [purchaseEnabled, setPurchaseEnabled] = useState(false);

  const load = useCallback(async (p = 0) => {
    if (p === 0) setLoading(true);
    try {
      const res = await fetch(`/api/wallet?page=${p}&limit=20`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWallet(data.wallet);
      setPackages(data.packages);
      setPurchaseEnabled(Boolean(data.purchaseEnabled));
      if (p === 0) {
        setTransactions(data.transactions);
      } else {
        setTransactions((prev) => [...prev, ...data.transactions]);
      }
      setHasMore(data.transactions.length === 20);
    } catch {
      toast.error("Cüzdan verisi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  async function handleBuy(packageId: string) {
    if (!purchaseEnabled) {
      toast.error("Satın alma geçici olarak kapalı.");
      return;
    }

    setBuying(packageId);
    try {
      const res = await fetch("/api/wallet/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        `${formatTokens(data.tokensAdded)} token yüklendi! Yeni bakiye: ${formatTokens(data.newBalance)}`,
        { duration: 5000, icon: "⚡" }
      );
      load(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Satın alma başarısız.");
    } finally {
      setBuying(null);
    }
  }

  function loadMore() {
    const next = txPage + 1;
    setTxPage(next);
    load(next);
  }

  const balance = wallet ? parseInt(wallet.balance) : 0;
  const totalEarned = wallet ? parseInt(wallet.totalEarned) : 0;
  const totalSpent = wallet ? parseInt(wallet.totalSpent) : 0;
  const remainingPct = totalEarned > 0 ? Math.min(100, Math.round((balance / totalEarned) * 100)) : 100;

  const chartData = wallet?.last30days ?? [];
  const chartMax = chartData.length > 0 ? Math.max(...chartData.map((d) => parseInt(d.spent)), 1) : 1;
  const breakdown = wallet?.moduleBreakdown ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">AI Token Cüzdanı</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Bakiyenizi takip edin, kullanım geçmişinizi inceleyin, ihtiyaç duyduğunuzda token satın alın.
        </p>
      </div>

      {/* Üst stat kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ana bakiye */}
        <Card variant="bordered" className="lg:col-span-2">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={15} className="text-[var(--color-primary)]" />
                  <span className="text-xs text-[var(--color-text-secondary)]">Mevcut Bakiye</span>
                </div>
                {loading ? (
                  <div className="h-10 w-32 rounded bg-[var(--color-surface-elevated)] animate-pulse" />
                ) : (
                  <p className="text-5xl font-black text-[var(--color-text-primary)] leading-none">
                    {formatTokens(balance)}
                  </p>
                )}
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">token kaldı</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  document.getElementById("buy-section")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <ShoppingCart size={13} />
                Token Al
              </Button>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-1.5">
                <span>%{remainingPct} kaldı</span>
                <span>{formatTokens(totalSpent)} / {formatTokens(totalEarned)} harcandı</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-surface-elevated)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${remainingPct}%`,
                    background:
                      remainingPct > 30
                        ? "var(--color-primary)"
                        : remainingPct > 10
                        ? "var(--color-warning)"
                        : "var(--color-destructive)",
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toplam yüklenen */}
        <Card variant="bordered">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-xs text-[var(--color-text-secondary)]">Toplam Yüklenen</span>
            </div>
            {loading ? (
              <div className="h-7 w-20 rounded bg-[var(--color-surface-elevated)] animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatTokens(totalEarned)}</p>
            )}
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">token (toplam)</p>
          </CardContent>
        </Card>

        {/* Toplam harcanan */}
        <Card variant="bordered">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-red-400" />
              <span className="text-xs text-[var(--color-text-secondary)]">Toplam Harcanan</span>
            </div>
            {loading ? (
              <div className="h-7 w-20 rounded bg-[var(--color-surface-elevated)] animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatTokens(totalSpent)}</p>
            )}
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">token (toplam)</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafik + Modül Dağılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="bordered" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart2 size={16} className="text-[var(--color-primary)]" />
              Son 30 Gün Kullanımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-secondary)]">
                <Sparkles size={28} className="mb-2 opacity-40" />
                <p className="text-sm">Henüz kullanım yok</p>
              </div>
            ) : (
              <div className="flex items-end gap-1 h-28">
                {chartData.map((d) => {
                  const h = Math.max(4, Math.round((parseInt(d.spent) / chartMax) * 100));
                  return (
                    <div
                      key={d.day}
                      className="flex-1 rounded-t-sm transition-all duration-300 hover:opacity-70 cursor-default"
                      style={{ height: `${h}%`, background: "var(--color-primary)", opacity: 0.7 }}
                      title={`${d.day}: ${formatTokens(d.spent)} token`}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap size={16} className="text-[var(--color-primary)]" />
              Modül Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-secondary)]">
                <Info size={22} className="mb-2 opacity-40" />
                <p className="text-xs text-center">Henüz veri yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {breakdown
                  .sort((a, b) => parseInt(b.spent) - parseInt(a.spent))
                  .slice(0, 6)
                  .map((item) => {
                    const maxSpent = Math.max(...breakdown.map((x) => parseInt(x.spent)));
                    const pct = maxSpent > 0 ? Math.round((parseInt(item.spent) / maxSpent) * 100) : 0;
                    return (
                      <div key={item.module}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[var(--color-text-primary)]">
                            {MODULE_LABELS[item.module] ?? item.module}
                          </span>
                          <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                            {formatTokens(item.spent)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-elevated)]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: "var(--color-primary)" }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Satın Al */}
      <div id="buy-section">
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-[var(--color-primary)]" />
              Token Satın Al
            </CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Tokenlar anında cüzdanınıza yüklenir. KDV dahil fiyatlar.
            </p>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Satın alma paketleri admin panelinden eklenebilir.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onBuy={handleBuy}
                    buying={buying}
                    purchaseEnabled={purchaseEnabled}
                  />
                ))}
              </div>
            )}

            <div
              className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-xs"
              style={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <Info size={13} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
              <span>
                1 token ≈ 1 kelime. Ortalama bir AI yanıtı ~200–800 token tüketir.
                Tokenlar satın alma tarihinden itibaren{" "}
                <strong className="text-[var(--color-text-primary)]">1 yıl</strong> geçerlidir.
              </span>
            </div>
            {!purchaseEnabled && (
              <div
                className="mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-xs"
                style={{
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <Shield size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Satın alma sistemi güvenlik modunda kapalı. Ödeme webhook bağlantısı tamamlandığında otomatik açılacaktır.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* İşlem Geçmişi */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} className="text-[var(--color-primary)]" />
            İşlem Geçmişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && transactions.length === 0 ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-[var(--color-surface-elevated)] animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center">
                <Zap size={20} className="text-[var(--color-text-secondary)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Henüz işlem yok</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                İlk AI sorgunu yaptıktan sonra kullanım geçmişin burada görünecek.
              </p>
            </div>
          ) : (
            <>
              {/* Tablo başlığı */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2 text-[10px] text-[var(--color-text-secondary)] uppercase tracking-widest border-b border-[var(--color-border)]">
                <span>Tür</span>
                <span>Açıklama</span>
                <span className="text-right">Miktar</span>
                <span className="text-right">Bakiye</span>
              </div>

              <div className="space-y-0.5 mt-1">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {txIcon(tx.type)}
                      <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                        {TX_LABELS[tx.type] ?? tx.type}
                      </Badge>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm text-[var(--color-text-primary)] truncate">{tx.description}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">
                        {new Date(tx.createdAt).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {tx.module && ` · ${MODULE_LABELS[tx.module] ?? tx.module}`}
                        {tx.model && ` · ${tx.model}`}
                      </p>
                    </div>

                    <span className={`text-sm font-mono font-semibold tabular-nums ${txColor(tx.type)}`}>
                      {txSign(tx.type)}{formatTokens(Math.abs(parseInt(tx.amount)))}
                    </span>

                    <span className="text-xs font-mono text-[var(--color-text-secondary)] tabular-nums text-right">
                      {formatTokens(parseInt(tx.balanceAfter))}
                    </span>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-4 text-center">
                  <Button variant="ghost" size="sm" onClick={loadMore} disabled={loading}>
                    {loading ? <RefreshCw size={13} className="animate-spin mr-1" /> : null}
                    Daha Fazla Göster
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bilgi notu */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs"
        style={{
          background: "rgba(0,196,235,0.05)",
          border: "1px solid rgba(0,196,235,0.15)",
          color: "var(--color-text-secondary)",
        }}
      >
        <ArrowDownRight size={13} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
        <span>
          Token tüketimi gerçek AI model kullanımına dayanır (input + output token sayısı).
          Sorun yaşarsanız{" "}
          <strong className="text-[var(--color-text-primary)]">destek@medasi.com.tr</strong>{" "}
          adresine yazın.
        </span>
      </div>
    </div>
  );
}
