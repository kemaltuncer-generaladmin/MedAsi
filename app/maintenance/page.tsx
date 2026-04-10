import { getPublicSystemConfigFromDb } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const config = await getPublicSystemConfigFromDb();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-xl rounded-3xl p-8 md:p-10"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p
          className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]"
          style={{ color: "var(--color-warning)" }}
        >
          Geçici Duruş
        </p>
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Medasi şu anda bakım modunda.
        </h1>
        <p
          className="mt-4 text-sm leading-7"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {config.maintenanceMessage}
        </p>
      </div>
    </div>
  );
}

