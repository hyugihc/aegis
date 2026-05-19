import { formSelectClass } from "@/components/aegis/constants";

export function MasterSelectField({
  value,
  label,
  options,
  onChange,
}: {
  value: string;
  label: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const uniqueOptions = [...new Set(options.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const hasValue = value && !uniqueOptions.some((option) => option.toLowerCase() === value.toLowerCase());
  return (
    <label className="text-sm text-zinc-400">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={formSelectClass}>
        <option value="">Select {label.toLowerCase()}</option>
        {hasValue ? <option value={value}>{value}</option> : null}
        {uniqueOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
