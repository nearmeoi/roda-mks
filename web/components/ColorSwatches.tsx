import Link from "next/link";
import type { Product } from "@/lib/types";

const COLOR_NAME_MAP: Record<string, string> = {
  black: "#111827",
  white: "#f9fafb",
  silver: "#cbd5e1",
  navy: "#1e3a8a",
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#eab308",
  grey: "#9ca3af",
  gray: "#9ca3af",
  orange: "#f97316",
};

function swatchColor(colors: string[]): string {
  const name = colors[0]?.toLowerCase() ?? "";
  return COLOR_NAME_MAP[name] ?? "#d1d5db";
}

export function ColorSwatches({ current, siblings }: { current: Product; siblings: Product[] }) {
  if (siblings.length === 0) return null;
  const options = [current, ...siblings];

  return (
    <div className="mt-4 flex gap-2">
      {options.map((option) => (
        <Link
          key={option.id}
          href={`/product/${option.id}`}
          title={option.colors[0] ?? option.model_name}
          className="h-6 w-6 rounded-full border-2"
          style={{
            borderColor: option.id === current.id ? "#16a34a" : "white",
            background: swatchColor(option.colors),
            boxShadow: "0 0 0 1px #d1d5db",
          }}
        />
      ))}
    </div>
  );
}
