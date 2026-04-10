function LoadingBlock({
  className,
}: {
  className: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-2xl ${className}`}
      style={{ backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 88%, white)" }}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border p-5"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <LoadingBlock className="h-4 w-24" />
            <LoadingBlock className="mt-4 h-9 w-20" />
            <LoadingBlock className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div
          className="rounded-3xl border p-6"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <LoadingBlock className="h-6 w-40" />
          <LoadingBlock className="mt-6 h-56 w-full" />
        </div>

        <div className="space-y-6">
          <div
            className="rounded-3xl border p-6"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <LoadingBlock className="h-5 w-32" />
            <div className="mt-5 space-y-3">
              <LoadingBlock className="h-12 w-full" />
              <LoadingBlock className="h-12 w-full" />
              <LoadingBlock className="h-12 w-full" />
            </div>
          </div>

          <div
            className="rounded-3xl border p-6"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <LoadingBlock className="h-5 w-28" />
            <LoadingBlock className="mt-5 h-28 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
