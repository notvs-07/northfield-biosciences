import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Animal, LanguageCode, MilkLog } from "../types";
import { translateSpecies } from "../utils/i18n";
import { ListenButton } from "./ListenButton";

interface MilkProductionTrendsChartProps {
  animals: Animal[];
  milkLogs: MilkLog[];
  selectedAnimalId: string;
  language: LanguageCode;
  onSelectAnimal: (id: string) => void;
}

const SERIES_COLORS = [
  "#9D174D", // Deep Rosewood Berry (Ganga)
  "#0F766E", // Calm Teal (Moti)
  "#B45309", // Warm Ochre
  "#1D4ED8", // Cobalt Blue
  "#7C3AED", // Violet
];

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${year}-${month}-${day}`);
  }
  return days;
}

function formatAxisLabel(dateStr: string, isToday: boolean, isHi: boolean): string {
  if (isToday) return isHi ? "आज" : "Today";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(isHi ? "hi-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
  });
}

interface ChartDatum {
  date: string;
  label: string;
  [animalId: string]: string | number;
}

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
  isHi: boolean;
}

function TrendsTooltip({ active, payload, label, isHi }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce(
    (sum, item) => sum + (typeof item.value === "number" ? item.value : 0),
    0
  );

  return (
    <div className="bg-[#FFFCFC] border border-[#DFC6CE] rounded-xl px-3.5 py-2.5 shadow-sm text-xs">
      <p className="font-semibold text-[#2A1720] pb-1.5 mb-1.5 border-b border-[#F3E4E9]">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={String(entry.dataKey)}
            className="flex items-center justify-between gap-4"
          >
            <span className="inline-flex items-center gap-1.5 text-[#4A2E3A]">
              <span
                className="w-2 h-2 rounded-xs inline-block shrink-0"
                style={{ backgroundColor: entry.color || "#9D174D" }}
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-mono tabular-nums font-medium text-[#2A1720]">
              {typeof entry.value === "number" ? entry.value.toFixed(1) : "0.0"}{" "}
              {isHi ? "ली." : "L"}
            </span>
          </div>
        ))}
      </div>
      {payload.length > 1 && (
        <div className="flex items-center justify-between gap-4 pt-1.5 mt-1.5 border-t border-[#F3E4E9] font-medium text-[#9D174D]">
          <span>{isHi ? "कुल दूध" : "Herd Total"}</span>
          <span className="font-mono tabular-nums">
            {total.toFixed(1)} {isHi ? "ली." : "L"}
          </span>
        </div>
      )}
    </div>
  );
}

export function MilkProductionTrendsChart({
  animals,
  milkLogs,
  selectedAnimalId,
  language,
  onSelectAnimal,
}: MilkProductionTrendsChartProps) {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const isHi = language === "hi";

  const last7Days = useMemo(() => getLast7Days(), []);
  const todayStr = last7Days[last7Days.length - 1];

  const chartData = useMemo<ChartDatum[]>(() => {
    return last7Days.map((date) => {
      const point: ChartDatum = {
        date,
        label: formatAxisLabel(date, date === todayStr, isHi),
      };
      for (const animal of animals) {
        const dayTotal = milkLogs
          .filter((l) => l.animalId === animal.id && l.date === date)
          .reduce((sum, l) => sum + l.liters, 0);
        point[animal.id] = Number(dayTotal.toFixed(1));
      }
      return point;
    });
  }, [animals, milkLogs, last7Days, todayStr, isHi]);

  const animalSummaries = useMemo(() => {
    return animals.map((animal, idx) => {
      const total7d = chartData.reduce(
        (sum, day) => sum + (Number(day[animal.id]) || 0),
        0
      );
      const activeDays = chartData.filter(
        (day) => (Number(day[animal.id]) || 0) > 0
      ).length;
      const avg = activeDays > 0 ? total7d / activeDays : 0;
      const latest = Number(chartData[chartData.length - 1]?.[animal.id]) || 0;
      const first = Number(chartData[0]?.[animal.id]) || 0;
      const changePct =
        first > 0 ? Math.round(((latest - first) / first) * 100) : 0;

      return {
        animal,
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
        total7d: Number(total7d.toFixed(1)),
        avg: Number(avg.toFixed(1)),
        changePct,
      };
    });
  }, [animals, chartData]);

  const hasAnyYieldData = useMemo(() => {
    return chartData.some((d) =>
      animals.some((a) => Number(d[a.id] || 0) > 0)
    );
  }, [chartData, animals]);

  const audioSummary = useMemo(() => {
    if (animalSummaries.length === 0) {
      return isHi ? "अभी कोई दूध का ग्राफ़ नहीं है।" : "No milk trend data available yet.";
    }
    return animalSummaries
      .map(({ animal, total7d, avg }) =>
        isHi
          ? `${animal.nameHi} ने 7 दिन में कुल ${total7d} लीटर और रोज़ औसतन ${avg} लीटर दूध दिया।`
          : `${animal.name} produced ${total7d} liters over 7 days, averaging ${avg} liters per day.`
      )
      .join(" ");
  }, [animalSummaries, isHi]);

  return (
    <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F3E4E9]">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#2A1720] tracking-tight">
            {isHi ? "दूध उत्पादन का ग्राफ़" : "Milk Production Trends"}
          </h2>
          <p className="text-xs sm:text-sm text-[#634853] mt-0.5">
            {isHi
              ? "हर पशु का पिछले 7 दिन का दूध (कम-ज़्यादा देखें)"
              : "Last 7 days of daily milk yield per animal (in liters)"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ListenButton text={audioSummary} language={language} />

          {/* Chart Type Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#F5E4EA] rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                chartType === "line"
                  ? "bg-white text-[#2A1720] shadow-xs"
                  : "text-[#634853] hover:text-[#2A1720]"
              }`}
            >
              {isHi ? "लाइन ग्राफ़" : "Trend Line"}
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                chartType === "bar"
                  ? "bg-white text-[#2A1720] shadow-xs"
                  : "text-[#634853] hover:text-[#2A1720]"
              }`}
            >
              {isHi ? "तुलना चार्ट" : "Compare Bars"}
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="mt-4 w-full min-w-0">
        {!hasAnyYieldData ? (
          <div className="h-56 flex items-center justify-center text-sm text-[#634853]">
            {isHi
              ? "पिछले 7 दिन में अभी कोई दूध नहीं लिखा गया है।"
              : "No milk yield data recorded in the last 7 days."}
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F1DDE3"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#634853", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#ECD8DE" }}
                  />
                  <YAxis
                    unit={isHi ? " ली." : " L"}
                    tick={{ fill: "#634853", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip content={<TrendsTooltip isHi={isHi} />} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  {animals.map((animal, idx) => {
                    const color = SERIES_COLORS[idx % SERIES_COLORS.length];
                    const isSelected = animal.id === selectedAnimalId;
                    return (
                      <Line
                        key={animal.id}
                        type="monotone"
                        dataKey={animal.id}
                        name={
                          isHi
                            ? `${animal.nameHi} (${translateSpecies(animal.species, "hi")})`
                            : `${animal.name} (${animal.species})`
                        }
                        stroke={color}
                        strokeWidth={isSelected ? 2.75 : 2}
                        dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
                        activeDot={{ r: 5.5, stroke: "#FFFFFF", strokeWidth: 2 }}
                      />
                    );
                  })}
                </LineChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F1DDE3"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#634853", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#ECD8DE" }}
                  />
                  <YAxis
                    unit={isHi ? " ली." : " L"}
                    tick={{ fill: "#634853", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    content={<TrendsTooltip isHi={isHi} />}
                    cursor={{ fill: "#F9ECEF" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  {animals.map((animal, idx) => {
                    const color = SERIES_COLORS[idx % SERIES_COLORS.length];
                    return (
                      <Bar
                        key={animal.id}
                        dataKey={animal.id}
                        name={
                          isHi
                            ? `${animal.nameHi} (${translateSpecies(animal.species, "hi")})`
                            : `${animal.name} (${animal.species})`
                        }
                        fill={color}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={30}
                      />
                    );
                  })}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Per-Animal 7-Day Yield Summary Strip */}
      {animalSummaries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#F3E4E9] grid grid-cols-1 sm:grid-cols-2 gap-3">
          {animalSummaries.map(({ animal, color, total7d, avg, changePct }) => {
            const isSelected = animal.id === selectedAnimalId;
            return (
              <button
                key={animal.id}
                type="button"
                onClick={() => onSelectAnimal(animal.id)}
                className={`text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? "border-[#9D174D]/50 bg-[#FBEEF2]"
                    : "border-[#ECD8DE] bg-[#FDF7F8] hover:border-[#DFC6CE]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#2A1720] truncate">
                      {isHi
                        ? `${animal.nameHi} · ${translateSpecies(animal.species, "hi")}`
                        : `${animal.name} · ${animal.species}`}
                    </p>
                    <p className="text-[11px] text-[#634853] font-mono tabular-nums">
                      {isHi ? `औसत ${avg.toFixed(1)} ली./दिन` : `${avg.toFixed(1)} L/day avg`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-mono tabular-nums font-semibold text-[#2A1720]">
                    {total7d.toFixed(1)} {isHi ? "ली." : "L"}{" "}
                    <span className="font-normal text-[#634853]">
                      ({isHi ? "7 दिन" : "7d"})
                    </span>
                  </p>
                  <p
                    className={`text-[11px] font-mono tabular-nums font-medium ${
                      changePct <= -20
                        ? "text-[#B91C1C]"
                        : changePct < 0
                          ? "text-[#B45309]"
                          : "text-[#15803D]"
                    }`}
                  >
                    {changePct > 0 ? `+${changePct}%` : `${changePct}%`}{" "}
                    {isHi ? "बदलाव" : "vs 7d ago"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
