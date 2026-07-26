export function SpecsTable({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  if (entries.length === 0) return null;

  return (
    <div className="glass-card backdrop-blur mt-6 divide-y divide-gray-200/60 p-3">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4 py-2 text-sm">
          <span className="text-gray-500">{key}</span>
          <span className="text-right text-gray-800">{value}</span>
        </div>
      ))}
    </div>
  );
}
