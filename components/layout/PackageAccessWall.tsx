"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  canAccessPathForPackage,
  getMinimumPackageTierForPath,
  isUserAppPath,
  type PackageAccessTier,
} from "@/lib/access/package-access";

const PLAN_LABEL: Record<PackageAccessTier, string> = {
  ucretsiz: "Ucretsiz",
  giris: "Giris",
  pro: "Pro",
  kurumsal: "Kurumsal",
};

export function PackageAccessWall({
  children,
  packageName,
  role,
}: {
  children: ReactNode;
  packageName?: string | null;
  role?: string | null;
}) {
  const pathname = usePathname();
  const isPrivileged = role === "admin" || role === "org_admin";

  if (isPrivileged || !isUserAppPath(pathname) || canAccessPathForPackage(pathname, packageName)) {
    return <>{children}</>;
  }

  const required = getMinimumPackageTierForPath(pathname);
  const requiredLabel = required ? PLAN_LABEL[required] : "Ust Paket";

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
        <div
          className="mx-4 w-full max-w-lg rounded-2xl p-6 text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-warning) 16%, transparent)" }}
          >
            <Lock size={20} style={{ color: "var(--color-warning)" }} />
          </div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Bu modulu goruntuleyebilirsin, kullanmak icin paket yukseltmen gerekiyor
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Bu alandaki aksiyonlar en az <strong>{requiredLabel}</strong> paketinde aktif.
          </p>
          <div className="mt-4 flex justify-center">
            <Link
              href={`/upgrade?reason=package_access&target=${encodeURIComponent(pathname)}`}
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-inverse)" }}
            >
              Paketi Yukselt
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

