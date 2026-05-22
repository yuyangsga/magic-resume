
import { DateInput, type DateInputValue } from "@heroui/date-input";
import { HeroUIProvider } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useState, type ComponentProps, type ComponentType } from "react";
import { cn } from "@/lib/utils";

interface UnifiedDateRangeInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

type DateInputCompatProps = Omit<
  ComponentProps<typeof DateInput>,
  "value" | "onChange"
> & {
  value?: DateInputValue | null;
  onChange?: (value: DateInputValue | null) => void;
};

const DateInputCompat = DateInput as unknown as ComponentType<DateInputCompatProps>;

const SEPARATOR = " - ";
const PRESENT_VALUES = new Set(["至今", "Present", "Now"]);

const parsePart = (part: string): DateInputValue | null => {
  if (!part) return null;
  const cleanPart = part.trim();
  if (PRESENT_VALUES.has(cleanPart)) return null;

  try {
    let isoStr = cleanPart.replace(/[./]/g, "-");
    if (isoStr.length === 7) isoStr += "-01";
    if (isoStr.length === 4) isoStr += "-01-01";
    return parseDate(isoStr) as unknown as DateInputValue;
  } catch {
    return null;
  }
};

const parseRange = (rangeValue: string) => {
  if (!rangeValue) return { start: null, end: null };

  let startStr = "";
  let endStr = "";

  if (rangeValue.includes(SEPARATOR)) {
    [startStr, endStr] = rangeValue.split(SEPARATOR);
  } else {
    const match = rangeValue.match(/^([^\s]+)\s*(?:-|–|—)\s*([^\s]+)$/);
    if (match) {
      startStr = match[1];
      endStr = match[2];
    } else {
      startStr = rangeValue;
    }
  }

  return { start: parsePart(startStr), end: parsePart(endStr) };
};

export function UnifiedDateRangeInput({
  value,
  onChange,
  className,
}: UnifiedDateRangeInputProps) {
  const [range, setRange] = useState<{ start: DateInputValue | null; end: DateInputValue | null }>(
    () => parseRange(value)
  );

  const isPresent = value.includes("至今") || value.includes("Present");

  const updateValue = (
    newStart: DateInputValue | null,
    newEnd: DateInputValue | null
  ) => {
    const format = (d: DateInputValue) =>
      `${d.year}/${d.month.toString().padStart(2, "0")}`;

    const startStr = newStart ? format(newStart) : "";
    const endStr = isPresent ? (value.includes("至今") ? "至今" : "Present") : (newEnd ? format(newEnd) : "");

    if (!startStr && !endStr) {
      onChange("");
      return;
    }

    if (startStr && !endStr) {
      onChange(startStr);
      return;
    }

    onChange(`${startStr}${SEPARATOR}${endStr}`);
  };

  const handleStartChange = (newStart: DateInputValue | null) => {
    setRange((prev) => {
      const next = { start: newStart, end: prev.end };
      updateValue(next.start, next.end);
      return next;
    });
  };

  const handleEndChange = (newEnd: DateInputValue | null) => {
    setRange((prev) => {
      const next = { start: prev.start, end: newEnd };
      updateValue(next.start, next.end);
      return next;
    });
  };

  return (
    <div className={cn("w-full", className)}>
      <HeroUIProvider locale="ja-JP">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DateInputCompat
              value={range.start}
              onChange={handleStartChange}
              variant="bordered"
              granularity={"month" as any}
              shouldForceLeadingZeros
              aria-label="Start Date"
              classNames={{
                inputWrapper:
                  "bg-background hover:bg-muted/20 h-9 min-h-0 py-0 px-3 shadow-sm ring-1 ring-inset ring-input border-0",
                innerWrapper: "pb-0",
              }}
            />
          </div>
          <span className="text-muted-foreground">-</span>
          <div className="flex-1 relative">
            <DateInputCompat
              value={isPresent ? null : range.end}
              onChange={handleEndChange}
              variant="bordered"
              granularity={"month" as any}
              shouldForceLeadingZeros
              aria-label="End Date"
              isDisabled={isPresent}
              className={cn(isPresent && "opacity-50")}
              classNames={{
                inputWrapper:
                  "bg-background hover:bg-muted/20 h-9 min-h-0 py-0 px-3 shadow-sm ring-1 ring-inset ring-input border-0",
                innerWrapper: "pb-0",
              }}
            />
          </div>
        </div>
      </HeroUIProvider>
    </div>
  );

}
