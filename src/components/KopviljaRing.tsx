import { kopviljaColor } from '@/components/meta'

/** Circular köpvilja gauge: AI-bedömd köpvilja 0–100, coloured by threshold. */
export function KopviljaRing({
  score,
  size = 44,
}: {
  score: number | null
  size?: number
}) {
  const stroke = size < 40 ? 3 : 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100
  const color = kopviljaColor(score)

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted-foreground/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </svg>
      <span
        className="absolute font-semibold tabular-nums"
        style={{ color, fontSize: size * 0.32 }}
      >
        {score === null ? '–' : score}
      </span>
    </span>
  )
}
