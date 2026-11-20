import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Animal, LanguageCode, MilkLog } from "../types";
import { translateSpecies } from "../utils/i18n";
import { ListenButton } from "./ListenButton";

interface RecentMilkEntriesSectionProps {
  animals: Animal[];
  milkLogs: MilkLog[];
  selectedAnimalId: string;
  language: LanguageCode;
  onDeleteMilkLog: (id: string) => void;
}

export function RecentMilkEntriesSection({
  animals,
  milkLogs,
  selectedAnimalId,
  language,
  onDeleteMilkLog,
}: RecentMilkEntriesSectionProps) {
  const [scope, setScope] = useState<"selected" | "all">("all");
  const isHi = language === "hi";

  const animalMap = useMemo(() => {
    const map = new Map<string, Animal>();
    for (const a of animals) map.set(a.id, a);
    return map;
  }, [animals]);

  const sortedLogs = useMemo(() => {
    return milkLogs
      .filter((log) =>
        scope === "selected" && selectedAnimalId
          ? log.animalId === selectedAnimalId
          : true
      )
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.session === "Evening" && b.session === "Morning" ? -1 : 1;
      });
  }, [milkLogs, scope, selectedAnimalId]);

  const selectedAnimal = animalMap.get(selectedAnimalId);

  const audioSummary = useMemo(() => {
    if (sortedLogs.length === 0) {
      return isHi ? "अभी कोई दूध का रिकॉर्ड दर्ज नहीं है।" : "No milk entries recorded yet.";
    }
    const latest = sortedLogs[0];
    const an = animalMap.get(latest.animalId);
    const anName = an ? (isHi ? an.nameHi : an.name) : "";
    const sess =
      latest.session === "Morning"
        ? isHi
          ? "सुबह"
          : "Morning"
        : isHi
          ? "शाम"
          : "Evening";
    return isHi
      ? `ताज़ा रिकॉर्ड: ${anName} ने ${latest.date} को ${sess} में ${latest.liters} लीटर दूध दिया।`
      : `Latest entry: ${anName} gave ${latest.liters} liters on ${latest.date} ${sess}.`;
  }, [sortedLogs, animalMap, isHi]);

  return (
    <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F3E4E9]">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#2A1720] tracking-tight">
            {isHi ? "हाल के दूध रिकॉर्ड" : "Recent Entries"}
          </h2>
          <p className="text-xs sm:text-sm text-[#634853] mt-0.5">
            {isHi
              ? "सुबह और शाम के दूध की पूरी सूची"
              : "Complete table of recorded morning & evening milkings"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ListenButton text={audioSummary} language={language} />

          <div className="flex items-center gap-1 p-1 bg-[#F5E4EA] rounded-lg">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scope === "all"
                  ? "bg-white text-[#2A1720] shadow-xs"
                  : "text-[#634853] hover:text-[#2A1720]"
              }`}
            >
              {isHi ? "सभी पशु" : "All Animals"}
            </button>
            <button
              type="button"
              disabled={!selectedAnimal}
              onClick={() => setScope("selected")}
              className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 ${
                scope === "selected"
                  ? "bg-white text-[#2A1720] shadow-xs"
                  : "text-[#634853] hover:text-[#2A1720]"
              }`}
            >
              {selectedAnimal
                ? isHi
                  ? selectedAnimal.nameHi
                  : selectedAnimal.name
                : isHi
                  ? "चुना पशु"
                  : "Selected"}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4">
        {sortedLogs.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#634853]">
            {isHi
              ? "अभी कोई दूध का रिकॉर्ड नहीं है। ऊपर से दूध दर्ज करें।"
              : "No milk yield entries recorded yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#F3E4E9] text-xs text-[#634853]">
                  <th className="py-2.5 pr-4 font-medium">{isHi ? "तारीख" : "Date"}</th>
                  <th className="py-2.5 pr-4 font-medium">{isHi ? "पशु" : "Animal"}</th>
                  <th className="py-2.5 pr-4 font-medium">{isHi ? "समय" : "Session"}</th>
                  <th className="py-2.5 pr-4 font-medium text-right">{isHi ? "दूध (ली.)" : "Yield"}</th>
                  <th className="py-2.5 pr-4 font-medium text-right hidden sm:table-cell">
                    {isHi ? "फ़ैट %" : "Fat"}
                  </th>
                  <th className="py-2.5 pr-4 font-medium hidden md:table-cell">
                    {isHi ? "टिप्पणी" : "Notes"}
                  </th>
                  <th className="py-2.5 text-right font-medium w-10">
                    <span className="sr-only">{isHi ? "हटाएं" : "Delete"}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F6E9ED]">
                {sortedLogs.slice(0, 10).map((log) => {
                  const animal = animalMap.get(log.animalId);
                  return (
                    <tr key={log.id} className="hover:bg-[#FDF5F7] transition-colors">
                      <td className="py-3 pr-4 font-mono tabular-nums text-xs text-[#3B212C] whitespace-nowrap">
                        {log.date}
                      </td>
                      <td className="py-3 pr-4 text-xs font-medium text-[#2A1720] whitespace-nowrap">
                        {animal
                          ? isHi
                            ? `${animal.nameHi} (${translateSpecies(animal.species, "hi")})`
                            : `${animal.name} (${animal.species})`
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#4A2E3A] whitespace-nowrap">
                        {log.session === "Morning"
                          ? isHi
                            ? "सुबह"
                            : "Morning"
                          : isHi
                            ? "शाम"
                            : "Evening"}
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums text-right font-semibold text-[#2A1720] whitespace-nowrap">
                        {log.liters.toFixed(1)} {isHi ? "ली." : "L"}
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums text-right text-xs text-[#634853] hidden sm:table-cell whitespace-nowrap">
                        {log.fatPercent ? `${log.fatPercent.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#634853] hidden md:table-cell max-w-[260px] truncate">
                        {isHi ? log.notesHi || log.notes || "—" : log.notes || "—"}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteMilkLog(log.id)}
                          aria-label={isHi ? "हटाएं" : `Delete log ${log.date}`}
                          className="p-2 rounded-md text-[#7B5F6A] hover:text-[#B91C1C] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
