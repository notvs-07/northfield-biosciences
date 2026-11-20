import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Animal, LanguageCode, MilkLog } from "../types";
import { translateSpecies } from "../utils/i18n";
import { ListenButton } from "./ListenButton";

interface MilkYieldSectionProps {
  animals: Animal[];
  milkLogs: MilkLog[];
  selectedAnimalId: string;
  language: LanguageCode;
  onSelectAnimal: (id: string) => void;
  onAddMilkLog: (entry: Omit<MilkLog, "id">) => void;
}

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

function formatShortDay(dateStr: string, isHi: boolean): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(isHi ? "hi-IN" : "en-IN", {
    weekday: "short",
  });
}

export function MilkYieldSection({
  animals,
  milkLogs,
  selectedAnimalId,
  language,
  onSelectAnimal,
  onAddMilkLog,
}: MilkYieldSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formAnimalId, setFormAnimalId] = useState<string>(selectedAnimalId);
  const [formDate, setFormDate] = useState<string>(getTodayDateString());
  const [formSession, setFormSession] = useState<"Morning" | "Evening">("Evening");
  const [formLiters, setFormLiters] = useState<string>("6.2");
  const [formFat, setFormFat] = useState<string>("4.5");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  const isHi = language === "hi";
  const selectedAnimal = animals.find((a) => a.id === selectedAnimalId) || animals[0];

  const filteredLogs = useMemo(() => {
    return milkLogs.filter((log) => log.animalId === selectedAnimal?.id);
  }, [milkLogs, selectedAnimal]);

  const last7Days = useMemo(() => getLast7Days(), []);
  const todayStr = last7Days[last7Days.length - 1];

  const chartDays = useMemo(() => {
    return last7Days.map((date) => {
      const dayLogs = filteredLogs.filter((l) => l.date === date);
      const morning = dayLogs
        .filter((l) => l.session === "Morning")
        .reduce((sum, l) => sum + l.liters, 0);
      const evening = dayLogs
        .filter((l) => l.session === "Evening")
        .reduce((sum, l) => sum + l.liters, 0);
      return {
        date,
        label: formatShortDay(date, isHi),
        morning: Number(morning.toFixed(1)),
        evening: Number(evening.toFixed(1)),
        total: Number((morning + evening).toFixed(1)),
      };
    });
  }, [filteredLogs, last7Days, isHi]);

  const maxDayTotal = useMemo(() => {
    const maxVal = Math.max(...chartDays.map((d) => d.total), 1);
    return Math.ceil(maxVal * 1.15);
  }, [chartDays]);

  const todayAnimalTotal = useMemo(() => {
    const day = chartDays.find((d) => d.date === todayStr);
    return day ? day.total : 0;
  }, [chartDays, todayStr]);

  const avgDailyYield = useMemo(() => {
    const activeDays = chartDays.filter((d) => d.total > 0);
    if (activeDays.length === 0) return 0;
    const sum = activeDays.reduce((acc, d) => acc + d.total, 0);
    return Number((sum / activeDays.length).toFixed(1));
  }, [chartDays]);

  const todayHerdTotal = useMemo(() => {
    return Number(
      milkLogs
        .filter((l) => l.date === todayStr)
        .reduce((acc, l) => acc + l.liters, 0)
        .toFixed(1)
    );
  }, [milkLogs, todayStr]);

  const audioSummary = useMemo(() => {
    if (!selectedAnimal) {
      return isHi ? "अभी कोई पशु नहीं जुड़ा है।" : "No animal added yet.";
    }
    const name = isHi ? selectedAnimal.nameHi : selectedAnimal.name;
    return isHi
      ? `${name} ने आज ${todayAnimalTotal.toFixed(1)} लीटर दूध दिया। पिछले 7 दिन का औसत ${avgDailyYield.toFixed(1)} लीटर है। पूरे घर का आज का कुल दूध ${todayHerdTotal.toFixed(1)} लीटर है।`
      : `${name} produced ${todayAnimalTotal.toFixed(1)} liters today. 7-day average is ${avgDailyYield.toFixed(1)} liters per day. Total herd yield today is ${todayHerdTotal.toFixed(1)} liters.`;
  }, [selectedAnimal, isHi, todayAnimalTotal, avgDailyYield, todayHerdTotal]);

  const openForm = () => {
    setFormAnimalId(selectedAnimal?.id || animals[0]?.id || "");
    setFormDate(getTodayDateString());
    setFormError("");
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const litersNum = parseFloat(formLiters);
    if (isNaN(litersNum) || litersNum <= 0 || litersNum > 60) {
      setFormError(
        isHi
          ? "कृपया 0.1 से 60 लीटर के बीच सही संख्या लिखें।"
          : "Enter a valid milk yield between 0.1 and 60 liters."
      );
      return;
    }
    const fatNum = formFat.trim() ? parseFloat(formFat) : undefined;
    if (fatNum !== undefined && (isNaN(fatNum) || fatNum < 1 || fatNum > 15)) {
      setFormError(
        isHi ? "फ़ैट 1 से 15 के बीच होना चाहिए।" : "Fat % must be between 1 and 15."
      );
      return;
    }
    onAddMilkLog({
      animalId: formAnimalId,
      date: formDate,
      session: formSession,
      liters: Number(litersNum.toFixed(1)),
      fatPercent: fatNum !== undefined ? Number(fatNum.toFixed(1)) : undefined,
      notes: formNotes.trim() || undefined,
      notesHi: formNotes.trim() || undefined,
    });
    onSelectAnimal(formAnimalId);
    setFormNotes("");
    setFormError("");
    setShowAddForm(false);
  };

  return (
    <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F3E4E9]">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#2A1720] tracking-tight">
            {isHi ? "दैनिक दूध माप" : "Daily Milk Yield Logs"}
          </h2>
          <p className="text-xs sm:text-sm text-[#634853] mt-0.5">
            {selectedAnimal
              ? isHi
                ? `${selectedAnimal.nameHi} (${translateSpecies(selectedAnimal.species, "hi")}) · सुबह और शाम का हिसाब`
                : `${selectedAnimal.name} (${selectedAnimal.earTag}) · Morning & evening summary`
              : isHi
                ? "दूध लिखने के लिए पहले पशु जोड़ें"
                : "Add an animal first to record daily milk"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ListenButton text={audioSummary} language={language} />

          <button
            type="button"
            disabled={animals.length === 0}
            onClick={() => (showAddForm ? setShowAddForm(false) : openForm())}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#9D174D] text-white text-xs sm:text-sm font-medium hover:bg-[#831843] disabled:opacity-45 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showAddForm ? (isHi ? "बंद करें" : "Close") : isHi ? "दूध लिखें" : "Log Milk Yield"}</span>
          </button>
        </div>
      </div>

      {/* Add Milk Log Inline Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 p-4 rounded-xl bg-[#FDF5F7] border border-[#E4CDD4] space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#4A2E3A] mb-1">
                {isHi ? "पशु चुनें" : "Animal"}
              </label>
              <select
                value={formAnimalId}
                onChange={(e) => setFormAnimalId(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30"
              >
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {isHi
                      ? `${a.nameHi} (${translateSpecies(a.species, "hi")})`
                      : `${a.name} (${a.species} · ${a.earTag})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A2E3A] mb-1">
                {isHi ? "तारीख" : "Date"}
              </label>
              <input
                type="date"
                value={formDate}
                max={getTodayDateString()}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm font-mono text-[#2A1720] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A2E3A] mb-1">
                {isHi ? "समय" : "Session"}
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F4E1E6]">
                {(["Morning", "Evening"] as const).map((sess) => (
                  <button
                    key={sess}
                    type="button"
                    onClick={() => setFormSession(sess)}
                    className={`min-h-[34px] text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      formSession === sess
                        ? "bg-white text-[#2A1720] shadow-xs"
                        : "text-[#634853] hover:text-[#2A1720]"
                    }`}
                  >
                    {sess === "Morning" ? (isHi ? "सुबह" : "Morning") : isHi ? "शाम" : "Evening"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#4A2E3A] mb-1">
                  {isHi ? "लीटर" : "Liters"}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="60"
                  value={formLiters}
                  onChange={(e) => setFormLiters(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm font-mono tabular-nums text-[#2A1720] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A2E3A] mb-1">
                  {isHi ? "फ़ैट %" : "Fat %"}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="15"
                  value={formFat}
                  onChange={(e) => setFormFat(e.target.value)}
                  placeholder="4.5"
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm font-mono tabular-nums text-[#2A1720] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder={
                isHi
                  ? "कोई बात लिखें (जैसे चारा ठीक खाया)"
                  : "Optional note (e.g., good appetite, calm)"
              }
              className="flex-1 min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30"
            />
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-lg bg-[#9D174D] text-white text-sm font-medium hover:bg-[#831843] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isHi ? "जमा करें" : "Save Entry"}
            </button>
          </div>
          {formError && (
            <p className="text-xs text-[#B91C1C] font-medium">{formError}</p>
          )}
        </form>
      )}

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-b border-[#F3E4E9]">
        <div>
          <p className="text-xs text-[#634853]">
            {isHi ? "आज का दूध (चुना पशु)" : "Today (Selected Animal)"}
          </p>
          <p className="text-xl font-semibold font-mono tabular-nums text-[#2A1720] mt-0.5">
            {todayAnimalTotal.toFixed(1)}{" "}
            <span className="text-xs font-normal text-[#634853]">
              {isHi ? "लीटर" : "L"}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-[#634853]">
            {isHi ? "7 दिन का रोज़ औसत" : "7-Day Daily Average"}
          </p>
          <p className="text-xl font-semibold font-mono tabular-nums text-[#2A1720] mt-0.5">
            {avgDailyYield.toFixed(1)}{" "}
            <span className="text-xs font-normal text-[#634853]">
              {isHi ? "ली./दिन" : "L/day"}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-[#634853]">
            {isHi ? "आज का कुल दूध (सभी पशु)" : "Herd Total Today"}
          </p>
          <p className="text-xl font-semibold font-mono tabular-nums text-[#9D174D] mt-0.5">
            {todayHerdTotal.toFixed(1)}{" "}
            <span className="text-xs font-normal text-[#634853]">
              {isHi ? "लीटर" : "L"}
            </span>
          </p>
        </div>
      </div>

      {/* 7-Day Morning vs Evening Stacked Bar Visual */}
      <div className="pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#634853] mb-3">
          <span>
            {isHi ? "सुबह और शाम का दूध (पिछले 7 दिन)" : "Morning vs Evening (Last 7 Days)"}
          </span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#9D174D] inline-block" />
              {isHi ? "सुबह" : "Morning"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#DB8BA8] inline-block" />
              {isHi ? "शाम" : "Evening"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-36 pt-3">
          {chartDays.map((day) => {
            const totalPct = Math.min(100, Math.round((day.total / maxDayTotal) * 100));
            const morningPct =
              day.total > 0 ? Math.round((day.morning / day.total) * 100) : 0;
            const isToday = day.date === todayStr;

            return (
              <div
                key={day.date}
                className="flex flex-col items-center h-full justify-end"
              >
                <span className="text-[11px] font-mono tabular-nums text-[#3B212C] mb-1">
                  {day.total > 0 ? day.total.toFixed(1) : "—"}
                </span>
                <div className="w-full max-w-[38px] flex-1 flex items-end bg-[#F8EAEF] rounded-md overflow-hidden">
                  {day.total > 0 && (
                    <div
                      style={{ height: `${Math.max(totalPct, 8)}%` }}
                      className="w-full flex flex-col justify-end transition-all duration-200"
                      title={`${day.label}: ${day.morning}L + ${day.evening}L = ${day.total}L`}
                    >
                      <div
                        style={{ height: `${100 - morningPct}%` }}
                        className="w-full bg-[#DB8BA8]"
                      />
                      <div
                        style={{ height: `${morningPct}%` }}
                        className="w-full bg-[#9D174D]"
                      />
                    </div>
                  )}
                </div>
                <span
                  className={`text-[11px] mt-1.5 whitespace-nowrap ${
                    isToday ? "font-semibold text-[#9D174D]" : "text-[#634853]"
                  }`}
                >
                  {isToday ? (isHi ? "आज" : "Today") : day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
