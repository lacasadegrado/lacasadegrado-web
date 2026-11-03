"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/common/components/ui/chart";
import { formatEur } from "@/common/lib/utils/money.util";

import type { RevenuePoint } from "../../lib/types/dashboard.types";

const config = {
  photos: { label: "Fotos", color: "var(--chart-1)" },
  packages: { label: "Paquetes", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** Confirmed money per day, week or month, photos and packages stacked. Values in euros. */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => `€ ${value.toLocaleString("es-VE", { maximumFractionDigits: 0 })}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{config[name as keyof typeof config]?.label ?? name}</span>
                  <span className="font-medium tabular-nums">{formatEur(Math.round(Number(value) * 100))}</span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="photos" stackId="revenue" fill="var(--color-photos)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="packages" stackId="revenue" fill="var(--color-packages)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
