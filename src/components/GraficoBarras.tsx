import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export interface PuntoBarras {
  anio: number;
  exc: number | null;
  sm: number | null;
}

interface Props {
  datos: PuntoBarras[];
  tema: "light" | "dark";
}

/** Tooltip monocromo a juego con el resto: panel del sitio, sin Tailwind. */
function TooltipMono({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const filas = payload.filter(
    (p) => typeof p.value === "number",
  ) as { name?: string; value: number }[];
  if (!filas.length) return null;

  return (
    <div className="graf__tooltip">
      <span className="graf__tooltip-titulo">{label}</span>
      <div className="graf__tooltip-filas">
        {filas.map((f) => (
          <span key={f.name} className="graf__tooltip-fila">
            <i className={`graf__punto graf__punto--${f.name === "Exaltación" ? "exc" : "sm"}`} />
            {f.name}: <b>{f.value}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Adaptación de mono-charts (Amicro): barras píldora de radio completo,
 * monocromas, tema claro/oscuro vía tokens. App agrupa los años en dos
 * series (Exaltación y San Martín) con su % de asistencia.
 */
export function GraficoBarras({ datos, tema }: Props) {
  const esMovil = useMediaQuery("(max-width: 760px)");
  const oscuro = tema === "dark";
  const trazo = oscuro ? "rgba(255,255,255,0.08)" : "rgba(28,24,20,0.07)";

  return (
    <div className={`graf ${oscuro ? "graf--oscuro" : ""}`}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={datos}
          margin={{ top: 8, right: 20, left: -16, bottom: 0 }}
          barCategoryGap="16%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="2 2" vertical={false} stroke={trazo} />
          <XAxis
            dataKey="anio"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--suave)" }}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--suave)" }}
          />
          <Tooltip content={TooltipMono} cursor={{ fill: "var(--hover-claro)" }} />
          <Bar
            dataKey="exc"
            name="Exaltación"
            fill="var(--burdeos)"
            radius={8}
            maxBarSize={40}
            isAnimationActive={!esMovil}
            animationDuration={esMovil ? 0 : 700}
          />
          <Bar
            dataKey="sm"
            name="San Martín"
            fill="var(--laton)"
            radius={8}
            maxBarSize={40}
            isAnimationActive={!esMovil}
            animationDuration={esMovil ? 0 : 900}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="graf__leyenda">
        <span className="graf__mucho">
          <i className="graf__punto graf__punto--exc" /> Exaltación de la Santa Cruz
        </span>
        <span className="graf__mucho">
          <i className="graf__punto graf__punto--sm" /> San Martín
        </span>
      </div>
    </div>
  );
}