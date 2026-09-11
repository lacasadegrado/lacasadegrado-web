import { LANDING_STEPS } from "../lib/constants/landing.constants";

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 id="how-heading" className="text-2xl font-bold sm:text-3xl">
          Cómo funciona
        </h2>
        <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {LANDING_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4 sm:block">
              <span
                aria-hidden="true"
                className="font-heading text-3xl text-amber tabular-nums sm:block"
              >
                {index + 1}
              </span>
              <div className="sm:mt-3">
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-base text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
