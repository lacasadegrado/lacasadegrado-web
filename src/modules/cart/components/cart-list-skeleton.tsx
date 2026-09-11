export function CartListSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true">
      <ul className="divide-y border-y">
        {[0, 1, 2].map((index) => (
          <li key={index} className="flex items-center gap-3 py-3">
            <div className="h-14 w-20 rounded-sm bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-28 rounded bg-muted" />
            </div>
            <div className="h-4 w-14 rounded bg-muted" />
          </li>
        ))}
      </ul>
      <div className="h-40 rounded-md border" />
    </div>
  );
}
