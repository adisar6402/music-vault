const PALETTES: [string, string][] = [
  ["#7c3aed", "#2563eb"],
  ["#db2777", "#7c3aed"],
  ["#059669", "#0284c7"],
  ["#d97706", "#dc2626"],
  ["#a855f7", "#db2777"],
  ["#0284c7", "#059669"],
  ["#dc2626", "#7c3aed"],
  ["#a855f7", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#3b82f6"],
  ["#6366f1", "#ec4899"],
  ["#14b8a6", "#6366f1"],
];

export function getGradientColors(id: string): [string, string] {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTES[hash % PALETTES.length];
}
