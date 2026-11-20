import { useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock, Plus, RotateCcw, X } from "lucide-react";
import type { Animal, LanguageCode, VaccinationReminder } from "../types";
import { translateSpecies } from "../utils/i18n";
import { ListenButton } from "./ListenButton";

interface VaccinationSectionProps {
  animals: Animal[];
  vaccinations: VaccinationReminder[];
  language: LanguageCode;
  onToggleVaccinationStatus: (id: string) => void;
  onAddVaccination: (reminder: Omit<VaccinationReminder, "id" | "status">) => void;
}

function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function VaccinationSection({
  animals,
  vaccinations,
  language,
  onToggleVaccinationStatus,
  onAddVaccination,
}: VaccinationSectionProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [animalId, setAnimalId] = useState<string>(animals[0]?.id || "");
  const [vaccineName, setVaccineName] = useState("");
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [notes, setNotes] = useState("");

  const isHi = language === "hi";

  const animalMap = useMemo(() => {
    const map = new Map<string, Animal>();
    for (const a of animals) map.set(a.id, a);
    return map;
  }, [animals]);

  const filteredReminders = useMemo(() => {
    return vaccinations
      .filter((v) => {
        if (filter === "pending") return v.status !== "Completed";
        if (filter === "completed") return v.status === "Completed";
        return true;
      })
      .sort((a, b) => {
        if (a.status === "Completed" && b.status !== "Completed") return 1;
        if (a.status !== "Completed" && b.status === "Completed") return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [vaccinations, filter]);

  const audioSummary = useMemo(() => {
    const pending = vaccinations.filter((v) => v.status !== "Completed");
    if (pending.length === 0) {
      return isHi ? "अभी कोई टीका बाकी नहीं है।" : "All scheduled vaccinations are complete.";
    }
    const next = pending[0];
    const animal = animalMap.get(next.animalId);
    const animalName = animal ? (isHi ? animal.nameHi : animal.name) : "";
    const vaxName = isHi ? next.vaccineNameHi : next.vaccineName;
    return isHi
      ? `कुल ${pending.length} टीके बाकी हैं। अगला टीका ${animalName} का ${vaxName} तारीख ${next.dueDate} को है।`
      : `${pending.length} vaccinations upcoming. Next due is ${vaxName} for ${animalName} on ${next.dueDate}.`;
  }, [vaccinations, animalMap, isHi]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineName.trim() || !animalId) return;
    onAddVaccination({
      animalId,
      vaccineName: vaccineName.trim(),
      vaccineNameHi: vaccineName.trim(),
      dueDate,
      notes: notes.trim() || undefined,
    });
    setVaccineName("");
    setNotes("");
    setShowAdd(false);
  };

  return (
    <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F3E4E9]">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#2A1720] tracking-tight">
            {isHi ? "टीकाकरण याद दिलाने वाला" : "Vaccination Reminders"}
          </h2>
          <p className="text-xs sm:text-sm text-[#634853] mt-0.5">
            {isHi
              ? "आने वाले और लग चुके टीकों की सूची"
              : "Upcoming & completed immunization schedule"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ListenButton text={audioSummary} language={language} />

          <button
            type="button"
            disabled={animals.length === 0}
            onClick={() => setShowAdd(!showAdd)}
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#E4CDD4] bg-white text-[#2A1720] text-xs sm:text-sm font-medium hover:bg-[#FDF5F7] disabled:opacity-45 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showAdd ? (isHi ? "बंद करें" : "Close") : isHi ? "नया टीका जोड़ें" : "Add Reminder"}</span>
          </button>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="mt-4 p-4 rounded-xl bg-[#FDF5F7] border border-[#E4CDD4] space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#4A2E3A] mb-1">
                {isHi ? "पशु" : "Animal"}
              </label>
              <select
                value={animalId || animals[0]?.id || ""}
                onChange={(e) => setAnimalId(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720]"
              >
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {isHi
                      ? `${a.nameHi} (${translateSpecies(a.species, "hi")})`
                      : `${a.name} (${a.earTag})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A2E3A] mb-1">
                {isHi ? "टीके का नाम" : "Vaccine Name"}
              </label>
              <input
                type="text"
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                placeholder={isHi ? "जैसे खुरपका या गलघोंटू" : "e.g., Black Quarter (BQ)"}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A2E3A] mb-1">
                {isHi ? "तारीख" : "Due Date"}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm font-mono text-[#2A1720]"
                required
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isHi ? "कोई जानकारी (वैकल्पिक)" : "Optional notes"}
              className="flex-1 min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720]"
            />
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-lg bg-[#9D174D] text-white text-sm font-medium hover:bg-[#831843] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isHi ? "सहेजें" : "Save Reminder"}
            </button>
          </div>
        </form>
      )}

      {/* Filter Segmented Control */}
      <div className="flex items-center gap-1 p-1 bg-[#F5E4EA] rounded-lg w-fit mt-4">
        {(
          [
            { key: "all", en: "All", hi: "सभी" },
            { key: "pending", en: "Upcoming", hi: "लगाना बाकी" },
            { key: "completed", en: "Completed", hi: "लग चुका" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              filter === tab.key
                ? "bg-white text-[#2A1720] shadow-xs"
                : "text-[#634853] hover:text-[#2A1720]"
            }`}
          >
            {isHi ? tab.hi : tab.en}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="mt-3 divide-y divide-[#F3E4E9]">
        {filteredReminders.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#634853]">
            {isHi
              ? "इस सूची में अभी कोई टीका नहीं है।"
              : "No vaccination reminders in this filter."}
          </p>
        ) : (
          filteredReminders.map((item) => {
            const animal = animalMap.get(item.animalId);
            const isDone = item.status === "Completed";
            const isDueSoon = item.status === "Due Soon";

            return (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                    ) : isDueSoon ? (
                      <Clock className="w-4 h-4 text-[#B45309] shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 text-[#634853] shrink-0" />
                    )}
                    <p
                      className={`text-sm font-medium truncate ${
                        isDone ? "text-[#634853] line-through" : "text-[#2A1720]"
                      }`}
                    >
                      {isHi ? item.vaccineNameHi : item.vaccineName}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#634853] mt-1 pl-6">
                    <span className="font-medium text-[#3B212C]">
                      {animal
                        ? isHi
                          ? `${animal.nameHi} (${translateSpecies(animal.species, "hi")})`
                          : `${animal.name} (${animal.earTag})`
                        : isHi
                          ? "पशुधन"
                          : "Herd"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {isDone && item.completedDate
                        ? isHi
                          ? `लगा: ${item.completedDate}`
                          : `Given ${item.completedDate}`
                        : isHi
                          ? `तारीख: ${item.dueDate}`
                          : `Due ${item.dueDate}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-medium ${
                        isDone
                          ? "text-[#15803D]"
                          : isDueSoon
                            ? "text-[#B45309]"
                            : "text-[#4A2E3A]"
                      }`}
                    >
                      {isDone
                        ? isHi
                          ? "लग चुका"
                          : "Completed"
                        : isDueSoon
                          ? isHi
                            ? "जल्द लगवाएं"
                            : "Due Soon"
                          : isHi
                            ? "आने वाला"
                            : "Upcoming"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleVaccinationStatus(item.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    isDone
                      ? "border border-[#E4CDD4] text-[#634853] hover:bg-[#FDF5F7]"
                      : "bg-[#F8EAEF] text-[#9D174D] hover:bg-[#F2DFE5] border border-[#E4CDD4]"
                  }`}
                >
                  {isDone ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isHi ? "वापस खोलें" : "Reopen"}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isHi ? "टीका लग गया" : "Mark Done"}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
