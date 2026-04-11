"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getAdminPackagePolicies,
  savePackagePolicyOverrides,
  seedCanonicalPackagesFromPolicy,
} from "@/lib/actions/policy-admin";

type PolicyRow = {
  tier: "ucretsiz" | "giris" | "pro" | "kurumsal";
  displayName: string;
  monthlyPrice: number;
  initialTokenGrant: number;
  questionBankMonthlyLimit: number | null;
  hasExamAccess: boolean;
  hasUnlimitedQuestionBank: boolean;
  canBuyAddons: boolean;
};

type EditablePolicyState = Record<
  PolicyRow["tier"],
  {
    monthlyPrice: string;
    initialTokenGrant: string;
    questionBankMonthlyLimit: string;
    hasExamAccess: boolean;
    hasUnlimitedQuestionBank: boolean;
    canBuyAddons: boolean;
  }
>;

const EMPTY_STATE: EditablePolicyState = {
  ucretsiz: {
    monthlyPrice: "0",
    initialTokenGrant: "75000",
    questionBankMonthlyLimit: "150",
    hasExamAccess: false,
    hasUnlimitedQuestionBank: false,
    canBuyAddons: true,
  },
  giris: {
    monthlyPrice: "149",
    initialTokenGrant: "250000",
    questionBankMonthlyLimit: "500",
    hasExamAccess: false,
    hasUnlimitedQuestionBank: false,
    canBuyAddons: true,
  },
  pro: {
    monthlyPrice: "399",
    initialTokenGrant: "500000",
    questionBankMonthlyLimit: "",
    hasExamAccess: true,
    hasUnlimitedQuestionBank: true,
    canBuyAddons: true,
  },
  kurumsal: {
    monthlyPrice: "1299",
    initialTokenGrant: "500000",
    questionBankMonthlyLimit: "",
    hasExamAccess: true,
    hasUnlimitedQuestionBank: true,
    canBuyAddons: true,
  },
};

export default function AdminPackagesPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [form, setForm] = useState<EditablePolicyState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    try {
      const data = await getAdminPackagePolicies();
      const next = { ...EMPTY_STATE };
      for (const policy of data.policies) {
        next[policy.tier] = {
          monthlyPrice: String(policy.monthlyPrice),
          initialTokenGrant: String(policy.initialTokenGrant),
          questionBankMonthlyLimit:
            policy.questionBankMonthlyLimit === null
              ? ""
              : String(policy.questionBankMonthlyLimit),
          hasExamAccess: policy.hasExamAccess,
          hasUnlimitedQuestionBank: policy.hasUnlimitedQuestionBank,
          canBuyAddons: policy.canBuyAddons,
        };
      }
      setPolicies(data.policies);
      setForm(next);
    } catch {
      toast.error("Paket politikaları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function update<T extends keyof EditablePolicyState["ucretsiz"]>(
    tier: PolicyRow["tier"],
    key: T,
    value: EditablePolicyState["ucretsiz"][T],
  ) {
    setForm((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [key]: value },
    }));
  }

  function save() {
    startTransition(async () => {
      try {
        await savePackagePolicyOverrides({
          ucretsiz: {
            monthlyPrice: Number(form.ucretsiz.monthlyPrice),
            initialTokenGrant: Number(form.ucretsiz.initialTokenGrant),
            questionBankMonthlyLimit: Number(form.ucretsiz.questionBankMonthlyLimit || "0"),
            hasExamAccess: form.ucretsiz.hasExamAccess,
            hasUnlimitedQuestionBank: form.ucretsiz.hasUnlimitedQuestionBank,
            canBuyAddons: form.ucretsiz.canBuyAddons,
          },
          giris: {
            monthlyPrice: Number(form.giris.monthlyPrice),
            initialTokenGrant: Number(form.giris.initialTokenGrant),
            questionBankMonthlyLimit: Number(form.giris.questionBankMonthlyLimit || "0"),
            hasExamAccess: form.giris.hasExamAccess,
            hasUnlimitedQuestionBank: form.giris.hasUnlimitedQuestionBank,
            canBuyAddons: form.giris.canBuyAddons,
          },
          pro: {
            monthlyPrice: Number(form.pro.monthlyPrice),
            initialTokenGrant: Number(form.pro.initialTokenGrant),
            questionBankMonthlyLimit: form.pro.questionBankMonthlyLimit
              ? Number(form.pro.questionBankMonthlyLimit)
              : null,
            hasExamAccess: form.pro.hasExamAccess,
            hasUnlimitedQuestionBank: form.pro.hasUnlimitedQuestionBank,
            canBuyAddons: form.pro.canBuyAddons,
          },
          kurumsal: {
            monthlyPrice: Number(form.kurumsal.monthlyPrice),
            initialTokenGrant: Number(form.kurumsal.initialTokenGrant),
            questionBankMonthlyLimit: form.kurumsal.questionBankMonthlyLimit
              ? Number(form.kurumsal.questionBankMonthlyLimit)
              : null,
            hasExamAccess: form.kurumsal.hasExamAccess,
            hasUnlimitedQuestionBank: form.kurumsal.hasUnlimitedQuestionBank,
            canBuyAddons: form.kurumsal.canBuyAddons,
          },
        });
        await seedCanonicalPackagesFromPolicy();
        toast.success("Paket politikaları güncellendi.");
        await load();
      } catch {
        toast.error("Paket politikaları kaydedilemedi.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Paket Politikaları
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Fiyat, token grant, soru bankası limiti ve sınav erişimini tek merkezden yönetin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading || isPending}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Yenile
          </Button>
          <Button size="sm" onClick={save} loading={isPending}>
            <Save size={14} />
            Kaydet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {policies.map((policy) => {
          const state = form[policy.tier];
          return (
            <div
              key={policy.tier}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {policy.displayName}
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Tier: {policy.tier}
                  </p>
                </div>
                <Badge variant={policy.hasExamAccess ? "success" : "secondary"}>
                  {policy.hasExamAccess ? "Sınav Açık" : "Sınav Kapalı"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="block text-[var(--color-text-secondary)] mb-1">Aylık Fiyat</span>
                  <input
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                    value={state.monthlyPrice}
                    onChange={(e) => update(policy.tier, "monthlyPrice", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-[var(--color-text-secondary)] mb-1">Token Grant</span>
                  <input
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                    value={state.initialTokenGrant}
                    onChange={(e) => update(policy.tier, "initialTokenGrant", e.target.value)}
                  />
                </label>
                <label className="text-sm col-span-2">
                  <span className="block text-[var(--color-text-secondary)] mb-1">
                    Aylık Soru Bankası Limiti
                  </span>
                  <input
                    placeholder="Sınırsız için boş bırak"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                    value={state.questionBankMonthlyLimit}
                    onChange={(e) =>
                      update(policy.tier, "questionBankMonthlyLimit", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    key: "hasExamAccess" as const,
                    label: "Sınav modülleri",
                  },
                  {
                    key: "hasUnlimitedQuestionBank" as const,
                    label: "Soru bankası sınırsız",
                  },
                  {
                    key: "canBuyAddons" as const,
                    label: "Addon satın alabilir",
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => update(policy.tier, item.key, !state[item.key])}
                    className={`rounded-xl border px-3 py-3 text-left ${
                      state[item.key]
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-[var(--color-border)] bg-[var(--color-background)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                      <ShieldCheck size={14} />
                      {item.label}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      {state[item.key] ? "Aktif" : "Pasif"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
