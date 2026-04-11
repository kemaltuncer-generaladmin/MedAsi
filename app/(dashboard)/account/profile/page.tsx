"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Camera,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Taxonomy = {
  universities: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; universityId: string }>;
  terms: Array<{ id: string; name: string; programId: string }>;
};

interface ProfileData {
  displayName: string;
  email: string;
  phone: string;
  city: string;
  role: string;
  institution: string;
  graduationYear: string;
  specialty: string;
  universityId: string;
  programId: string;
  termId: string;
  visibilityLevel: string;
  verificationStatus: string;
  lastUpdated: string;
}

const defaultProfile: ProfileData = {
  displayName: "",
  email: "",
  phone: "",
  city: "",
  role: "",
  institution: "",
  graduationYear: "",
  specialty: "",
  universityId: "",
  programId: "",
  termId: "",
  visibilityLevel: "verified_only",
  verificationStatus: "pending",
  lastUpdated: "",
};

function getInitials(name: string): string {
  if (!name.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function verificationLabel(status: string): string {
  if (status === "verified") return "Doğrulandı";
  if (status === "manual_review") return "İncelemede";
  return "Beklemede";
}

function verificationVariant(status: string): "success" | "warning" | "secondary" {
  if (status === "verified") return "success";
  if (status === "manual_review") return "warning";
  return "secondary";
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, taxonomyRes] = await Promise.all([
          fetch("/api/user/profile", { cache: "no-store" }),
          fetch("/api/community/taxonomy", { cache: "no-store" }),
        ]);

        if (!profileRes.ok || !taxonomyRes.ok) {
          throw new Error("Profil verileri yüklenemedi");
        }

        const [profileData, taxonomyData] = await Promise.all([
          profileRes.json(),
          taxonomyRes.json(),
        ]);

        const goals = profileData.goals as Record<string, string> | null;
        const academicProfile = profileData.academicProfile as
          | {
              universityId?: string | null;
              programId?: string | null;
              termId?: string | null;
              specialty?: string | null;
              verificationStatus?: string | null;
              visibilityLevel?: string | null;
              universityName?: string | null;
            }
          | null;

        setTaxonomy(taxonomyData);
        setProfile({
          displayName: profileData.name ?? "",
          email: profileData.email ?? "",
          phone: goals?.phone ?? "",
          city: goals?.city ?? "",
          role: goals?.role ?? "",
          institution: academicProfile?.universityName ?? goals?.institution ?? "",
          graduationYear: goals?.graduationYear ?? "",
          specialty: academicProfile?.specialty ?? goals?.specialty ?? "",
          universityId: academicProfile?.universityId ?? "",
          programId: academicProfile?.programId ?? "",
          termId: academicProfile?.termId ?? "",
          visibilityLevel: academicProfile?.visibilityLevel ?? "verified_only",
          verificationStatus: academicProfile?.verificationStatus ?? "pending",
          lastUpdated: "",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Profil yüklenemedi");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filteredPrograms = useMemo(
    () =>
      taxonomy?.programs.filter(
        (item) => !profile.universityId || item.universityId === profile.universityId,
      ) ?? [],
    [taxonomy, profile.universityId],
  );

  const filteredTerms = useMemo(
    () =>
      taxonomy?.terms.filter(
        (item) => !profile.programId || item.programId === profile.programId,
      ) ?? [],
    [taxonomy, profile.programId],
  );

  function handleChange(field: keyof ProfileData, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.displayName,
          phone: profile.phone,
          city: profile.city,
          role: profile.role,
          institution: profile.institution,
          graduationYear: profile.graduationYear,
          specialty: profile.specialty,
          universityId: profile.universityId || null,
          programId: profile.programId || null,
          termId: profile.termId || null,
          visibilityLevel: profile.visibilityLevel,
        }),
      });

      if (!res.ok) throw new Error("Profil kaydedilemedi");

      const lastUpdated = new Date().toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      setProfile((prev) => ({ ...prev, lastUpdated }));
      toast.success("Profil güncellendi");
    } catch {
      toast.error("Profil kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  if (loading || !taxonomy) {
    return (
      <div className="space-y-4">
        <div className="h-36 animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]" />
        <div className="h-52 animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]" />
        <div className="h-52 animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]" />
      </div>
    );
  }

  const selectedUniversity =
    taxonomy.universities.find((item) => item.id === profile.universityId)?.name ?? "";

  return (
    <AccountSubpageShell
      icon={User}
      title="Profil"
      description="Topluluk kimliği, akademik filtreler ve kişisel bilgiler burada yönetilir."
      badge={verificationLabel(profile.verificationStatus)}
      stats={[
        { label: "E-posta", value: profile.email || "-" },
        { label: "Üniversite", value: selectedUniversity || "Seçilmedi" },
        { label: "Görünürlük", value: profile.visibilityLevel },
        { label: "Son güncelleme", value: profile.lastUpdated || "Henüz yok" },
      ]}
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            className="border border-[var(--color-border)]"
            onClick={() => toast("Profil fotoğrafı özelliği yakında eklenecek", { icon: "⏳" })}
          >
            <Camera size={14} />
            Fotoğraf
          </Button>
          <Button size="sm" loading={saving} onClick={handleSave}>
            <Save size={14} />
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card variant="bordered" className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={16} className="text-[var(--color-primary)]" />
              Kişisel bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                Ad Soyad
              </label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(event) => handleChange("displayName", event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                <Mail size={14} /> E-posta
              </label>
              <input type="email" value={profile.email} disabled className={`${inputClass} opacity-70`} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <Phone size={14} /> Telefon
                </label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <MapPin size={14} /> Şehir
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(event) => handleChange("city", event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                Hedef rol / odak
              </label>
              <input
                type="text"
                value={profile.role}
                onChange={(event) => handleChange("role", event.target.value)}
                placeholder="Örn: TUS hazırlığı, intern klinik pratiği"
                className={inputClass}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered" className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap size={16} className="text-[var(--color-primary)]" />
              Akademik kimlik
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                <Building2 size={14} /> Üniversite
              </label>
              <select
                value={profile.universityId}
                onChange={(event) => {
                  handleChange("universityId", event.target.value);
                  handleChange("programId", "");
                  handleChange("termId", "");
                  handleChange(
                    "institution",
                    taxonomy.universities.find((item) => item.id === event.target.value)?.name ?? "",
                  );
                }}
                className={inputClass}
              >
                <option value="">Üniversite seç</option>
                {taxonomy.universities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                Program / Fakülte
              </label>
              <select
                value={profile.programId}
                onChange={(event) => {
                  handleChange("programId", event.target.value);
                  handleChange("termId", "");
                }}
                className={inputClass}
              >
                <option value="">Program seç</option>
                {filteredPrograms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                Dönem / sınıf
              </label>
              <select
                value={profile.termId}
                onChange={(event) => handleChange("termId", event.target.value)}
                className={inputClass}
              >
                <option value="">Dönem seç</option>
                {filteredTerms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <Stethoscope size={14} /> İlgi alanı
                </label>
                <input
                  type="text"
                  value={profile.specialty}
                  onChange={(event) => handleChange("specialty", event.target.value)}
                  placeholder="Örn: Dahiliye, cerrahi, farmakoloji"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Görünürlük
                </label>
                <select
                  value={profile.visibilityLevel}
                  onChange={(event) => handleChange("visibilityLevel", event.target.value)}
                  className={inputClass}
                >
                  <option value="verified_only">Sadece doğrulanmış rozetli göster</option>
                  <option value="public">Herkese açık göster</option>
                  <option value="private">Sadece bana özel tut</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="bordered" className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--color-primary)]" />
            Topluluk durumu
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-[var(--color-text-primary)]">
              Bu alanlar topluluk filtrelerini, eşleşmeleri ve moderasyon kapsamını belirler.
            </p>
            <Badge variant={verificationVariant(profile.verificationStatus)}>
              Doğrulama: {verificationLabel(profile.verificationStatus)}
            </Badge>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/15 text-xl font-semibold text-[var(--color-text-primary)]">
            {getInitials(profile.displayName)}
          </div>
        </CardContent>
      </Card>
    </AccountSubpageShell>
  );
}
