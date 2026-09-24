"use client";

import * as React from "react";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatFechaCorta } from "@/lib/format";

/** "2026-09-03" → Date local a medianoche (sin corrimiento de zona horaria). */
function aDate(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function aISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface DatePickerProps {
  /** Fecha ISO (YYYY-MM-DD) o "" si no hay. */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Fecha máxima elegible (ISO). */
  max?: string;
  /** Fecha mínima elegible (ISO). */
  min?: string;
  "aria-label"?: string;
}

/**
 * Selector de fecha de shadcn: <Button> que abre un <Calendar> en un <Popover>.
 * Trabaja con fechas ISO (como los <input type="date"> que reemplaza), en español.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Elegir fecha",
  disabled,
  className,
  max,
  min,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const fecha = aDate(value);
  const hasta = max ? aDate(max) : undefined;
  const desde = min ? aDate(min) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-11 w-full justify-start rounded-xl bg-surface-2/60 px-3.5 font-normal",
            !fecha && "text-faint",
            className,
          )}
        >
          <CalendarBlank className="text-muted" />
          <span className="truncate">{fecha ? formatFechaCorta(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          selected={fecha}
          defaultMonth={fecha}
          captionLayout="dropdown"
          disabled={[...(hasta ? [{ after: hasta }] : []), ...(desde ? [{ before: desde }] : [])]}
          onSelect={(d) => {
            if (d) onChange(aISO(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
