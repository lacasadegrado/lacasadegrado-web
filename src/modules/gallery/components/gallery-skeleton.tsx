const RATIOS = ["3 / 2", "2 / 3", "1 / 1", "3 / 2", "4 / 5", "3 / 2", "1 / 1", "2 / 3"];

/** Loading state for the gallery route. Same column layout as the real grid. */
export function GallerySkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando tus fotos">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-muted" />
        <div className="h-4 w-72 max-w-full rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-56 rounded bg-muted" />
        <div className="h-4 w-64 max-w-full rounded bg-muted" />
      </div>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>li]:mb-3 [&>li]:break-inside-avoid">
        {RATIOS.map((ratio, index) => (
          <li key={index}>
            <div className="overflow-hidden rounded-md border">
              <div className="bg-muted" style={{ aspectRatio: ratio }} />
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="h-4 w-14 rounded bg-muted" />
                <div className="h-9 w-32 rounded-md bg-muted" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
