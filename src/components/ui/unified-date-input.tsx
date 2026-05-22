
import { DateInput, type DateInputValue } from "@heroui/date-input";
import { HeroUIProvider } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import {
  useState,
  useEffect,
  type ComponentProps,
  type ComponentType,
} from "react";
import { cn } from "@/lib/utils";

interface UnifiedDateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
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

export function UnifiedDateInput({
  value,
  onChange,
  label,
  isRequired,
  className,
}: UnifiedDateInputProps) {
  const parseValue = (input: string): DateInputValue | null => {
    if (!input) return null;
    try {
      let normalized = input.replace(/[./]/g, "-");
      if (normalized.length === 7) normalized = `${normalized}-01`;
      return parseDate(normalized) as unknown as DateInputValue;
    } catch {
      return null;
    }
  };

  const isPresent = value === "至今" || value === "Present" || value.includes("Present") || value.includes("至今");

  const [selectedDate, setSelectedDate] = useState<DateInputValue | null>(() =>
    parseValue(value)
  );

  useEffect(() => {
    setSelectedDate(parseValue(value));
  }, [value]);

  const handleDateChange = (date: DateInputValue | null) => {
    setSelectedDate(date);
    if (!date) {
      onChange("");
      return;
    }
    const month = date.month.toString().padStart(2, "0");
    onChange(`${date.year}/${month}`);
  };

  return (
    <div className={className}>
      <HeroUIProvider locale="ja-JP">
        <DateInputCompat
          value={isPresent ? null : selectedDate}
          onChange={handleDateChange}
          isRequired={isRequired}
          granularity={"month" as any}
          variant="bordered"
          labelPlacement="outside"
          shouldForceLeadingZeros
          isDisabled={isPresent}
          className={cn(isPresent && "opacity-50")}
          classNames={{
            inputWrapper:
              "shadow-sm hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary bg-background",
          }}
        />
      </HeroUIProvider>
    </div>
  );
}
