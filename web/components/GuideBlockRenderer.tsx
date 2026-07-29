import type { ContentBlock } from "@/lib/types";

export function GuideBlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2 key={i} className="text-lg font-bold tracking-tight text-gray-900">
              {block.text}
            </h2>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-sm leading-relaxed text-gray-700">
              {block.text}
            </p>
          );
        }

        if (block.type === "bullets") {
          return (
            <ul key={i} className="flex flex-col gap-2 pl-1">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <div
            key={i}
            className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white/70 backdrop-blur-lg"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.08]">
                  {block.headers.map((h, k) => (
                    <th
                      key={k}
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr
                    key={r}
                    className={r < block.rows.length - 1 ? "border-b border-black/[0.08]" : ""}
                  >
                    {row.map((cell, c) => (
                      <td key={c} className="whitespace-nowrap px-4 py-2.5 text-gray-900">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
