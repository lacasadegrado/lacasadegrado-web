const RATIOS = ["3 / 2", "2 / 3", "1 / 1", "3 / 2", "4 / 5", "3 / 2"];

export function PurchasesSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando tus compras">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-muted" />
          <div className="h-4 w-64 max-w-full rounded bg-muted" />
        </div>
        <div className="h-9 w-40 rounded-md bg-muted" />
      </div>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3 [&>li]:break-inside-avoid">
        {RATIOS.map((ratio, index) => (
          <li key={index}>
            <div className="overflow-hidden rounded-md border">
              <div className="bg-muted" style={{ aspectRatio: ratio }} />
              <div className="flex items-center justify-between p-2.5">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-9 w-24 rounded-md bg-muted" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
