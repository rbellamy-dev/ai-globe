import type { Query } from "@/lib/querySchema";

const SHOWN: (keyof Query)[] = [
  "minMagnitude",
  "maxMagnitude",
  "minDepthKm",
  "maxDepthKm",
  "region",
  "days",
  "sort",
  "limit",
];

const INDENT = "  ";

const Key = ({ name }: { name: string }) => <span className="text-code-key">{name}</span>;
const Val = ({ value }: { value: unknown }) => (
  <span className="text-ink">{typeof value === "string" ? `"${value}"` : String(value)}</span>
);
const round = (n: number) => Math.round(n * 100) / 100;

/** One `key: value` line. The region gets two lines (place, then coordinates) so the box stays short. */
function Field({ name, value, last }: { name: keyof Query; value: Query[keyof Query]; last: boolean }) {
  const end = last ? "\n" : ",\n";

  if (name === "region" && value && typeof value === "object") {
    const r = value as NonNullable<Query["region"]>;
    return (
      <>
        {INDENT}
        <Key name="region" />
        {": { "}
        <Key name="name" />: <Val value={r.name} />, <Key name="radiusKm" />: <Val value={r.radiusKm} />,{"\n"}
        {INDENT.repeat(3)}
        <Key name="lat" />: <Val value={round(r.lat)} />, <Key name="lon" />: <Val value={round(r.lon)} />
        {" }"}
        {end}
      </>
    );
  }

  return (
    <>
      {INDENT}
      <Key name={name} />
      {": "}
      <Val value={value} />
      {end}
    </>
  );
}

/**
 * The query behind the answer, shown as code. This is the case study's
 * point: the question only becomes this filter; the data does the rest.
 */
export function QueryCode({ query, source }: { query: Query; source: "preset" | "ai" | null }) {
  const fields = SHOWN.filter((key) => query[key] != null);

  return (
    // Opened in place under the question: a rule on phones (the answer is already a card there),
    // a quiet tinted block on wide screens.
    <div className="border-t border-line pt-3 lg:rounded-lg lg:border-0 lg:bg-chip/60 lg:px-4 lg:py-3">
      <p className="text-xs text-muted">
        <span className="font-medium text-ink">
          {source === "ai" ? "The AI only wrote this query." : "This example is a ready-made query."}
        </span>{" "}
        Every dot is real USGS data.
      </p>
      <pre className="mt-2.5 font-mono whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">
        {"{\n"}
        {fields.map((key, i) => (
          <Field key={key} name={key} value={query[key]} last={i === fields.length - 1} />
        ))}
        {"}"}
      </pre>
    </div>
  );
}
