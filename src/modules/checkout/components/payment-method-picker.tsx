"use client";

import { Badge } from "@/common/components/ui/badge";
import { Label } from "@/common/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group";
import { cn } from "@/common/lib/utils/cn.util";

import { PAYMENT_METHODS } from "../lib/constants/checkout.constants";

type PaymentMethodPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PaymentMethodPicker({ value, onChange, disabled }: PaymentMethodPickerProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      aria-label="Método de pago"
      className="gap-2"
    >
      {PAYMENT_METHODS.map((method) => {
        const id = `method-${method.id}`;
        return (
          <Label
            key={method.id}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary",
              !method.enabled && "cursor-not-allowed opacity-60",
            )}
          >
            <RadioGroupItem
              id={id}
              value={method.id}
              disabled={!method.enabled || disabled}
              className="mt-0.5"
            />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                {method.label}
                {!method.enabled ? (
                  <Badge variant="outline" className="font-normal">
                    Próximamente
                  </Badge>
                ) : null}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {method.description}
              </span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
