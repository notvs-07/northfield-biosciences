import { useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  Animal,
  FarmerProfile,
  LanguageCode,
  MilkLog,
  VaccinationReminder,
  VetAlert,
} from "../types";
import { translateAlertStatus, translateHealthState, translateSpecies } from "../utils/i18n";
import { ListenButton } from "./ListenButton";

interface AnimalInsuranceShieldProps {
  farmerProfile: FarmerProfile;
  animal: Animal;
  milkLogs: MilkLog[];
  vaccinations: VaccinationReminder[];
  vetAlerts: VetAlert[];
  language: LanguageCode;
}

export function AnimalInsuranceShield({
  farmerProfile,
  animal,
  milkLogs,
  vaccinations,
  vetAlerts,
  language,
}: AnimalInsuranceShieldProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStamp, setReportStamp] = useState<string>("");
  const [reportId, setReportId] = useState<string>("");

  const isHi = language === "hi";

  const animalMilkLogs = useMemo(
    () =>
      milkLogs
        .filter((l) => l.animalId === animal.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [milkLogs, animal.id]
  );

  const distinctMilkDays = useMemo(
    () => new Set(animalMilkLogs.map((l) => l.date)).size,
    [animalMilkLogs]
  );

  const totalLitersLogged = useMemo(
    () => Number(animalMilkLogs.reduce((sum, l) => sum + l.liters, 0).toFixed(1)),
    [animalMilkLogs]
  );

  const avgDailyLiters = useMemo(() => {
    if (distinctMilkDays === 0) return 0;
    return Number((totalLitersLogged / distinctMilkDays).toFixed(1));
  }, [distinctMilkDays, totalLitersLogged]);

  const animalVaccinations = useMemo(
    () =>
      vaccinations
        .filter((v) => v.animalId === animal.id)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [vaccinations, animal.id]
  );

  const animalVetAlerts = useMemo(
    () =>
      vetAlerts
        .filter(
          (al) => al.farmerId === farmerProfile.id && al.animalId === animal.id
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [vetAlerts, farmerProfile.id, animal.id]
  );

  const isEligibleForAdvance = distinctMilkDays >= 3;
  const animalDisplayName = isHi ? animal.nameHi : animal.name;

  const shieldAudioText = isEligibleForAdvance
    ? isHi
      ? `${animalDisplayName} के ${distinctMilkDays} दिन के नियमित दूध रिकॉर्ड के आधार पर आप ₹2,500 आपातकालीन पशु अग्रिम राशि के लिए पात्र हैं। आप बीमा क्लेम रिपोर्ट भी बना सकते हैं।`
      : `${animal.name} has ${distinctMilkDays} regular milk log days and is eligible for a ₹2,500 Emergency Vet Advance to avoid distress selling. You can also generate an insurance claim report.`
    : isHi
      ? `${animalDisplayName} के ${distinctMilkDays} में से 3 दिन के दूध रिकॉर्ड पूरे होने पर ₹2,500 आपातकालीन अग्रिम राशि मिलेगी।`
      : `${animal.name} has ${distinctMilkDays} of 3 milk log days needed to unlock the ₹2,500 Emergency Vet Advance.`;

  const openClaimReport = () => {
    const now = new Date();
    setReportStamp(
      now.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    );
    setReportId(`PR-CLM-${animal.earTag}-${now.getTime().toString().slice(-5)}`);
    setReportOpen(true);
  };

  const buildPlainTextReport = () => {
    const lines = [
      "========================================================",
      "NORTHFIELD BIOSCIENCES — LIVESTOCK INSURANCE & VET CLAIM REPORT",
      "========================================================",
      `Report ID      : ${reportId}`,
      `Generated At   : ${reportStamp}`,
      `Farmer Name/ID : ${farmerProfile.uniqueName}`,
      `Village        : ${farmerProfile.village}`,
      "",
      "--- ANIMAL PROFILE ---",
      `Name           : ${animal.name} (${animal.nameHi})`,
      `Species/Breed  : ${animal.species} · ${animal.breed}`,
      `Ear Tag        : ${animal.earTag}`,
      `Age / Weight   : ${animal.ageYears} yrs · ${animal.weightKg} kg`,
      `Shed Location  : ${animal.shedLocation}`,
      `Current Health : ${animal.healthState}`,
      "",
      "--- CO-OP & MILK RECORD VERIFICATION ---",
      `Logged Milking Days : ${distinctMilkDays} days`,
      `Total Milk Logged   : ${totalLitersLogged.toFixed(1)} L`,
      `Average Daily Yield : ${avgDailyLiters.toFixed(1)} L/day`,
      `Emergency Advance   : ${
        isEligibleForAdvance
          ? "ELIGIBLE for Rs. 2,500 Co-op Emergency Vet Advance"
          : `In progress (${distinctMilkDays}/3 days logged)`
      }`,
      "",
      "--- VACCINATION HISTORY ---",
      ...(animalVaccinations.length === 0
        ? ["No vaccination records logged."]
        : animalVaccinations.map(
            (v) =>
              `• ${v.vaccineName} | Status: ${v.status} | Due: ${v.dueDate}${
                v.completedDate ? ` | Given: ${v.completedDate}` : ""
              }`
          )),
      "",
      "--- VETERINARY VISITS & HEALTH INCIDENTS ---",
      ...(animalVetAlerts.length === 0
        ? ["No escalated vet incidents recorded for this animal."]
        : animalVetAlerts.map(
            (al, idx) =>
              `${idx + 1}. [${al.severity.toUpperCase()} · ${al.status}] ${al.title}\n   Reported: ${new Date(
                al.createdAt
              ).toLocaleString("en-IN")}\n   Symptoms: ${al.symptoms}\n   Vet Assessment Notes: ${
                al.vetNotes?.trim() || "Pending vet clinical assessment"
              }`
          )),
      "",
      "Generated locally via NorthField Biosciences · Anti-Distress Insurance Shield",
    ];
    return lines.join("\n");
  };

  const handleDownloadTxt = () => {
    const content = buildPlainTextReport();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportId || "insurance-claim-report"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mt-5 rounded-xl border border-[#ECD8DE] bg-[#FDF7F8] p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2A1720]">
                <ShieldCheck className="w-4 h-4 text-[#9D174D] shrink-0" />
                <span>
                  {isHi
                    ? `सहकारिता व बीमा सुरक्षा · ${animalDisplayName}`
                    : `Co-op & Insurance Shield · ${animal.name}`}
                </span>
              </span>

              {isEligibleForAdvance ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#EFF6F0] border border-[#CFE3D2] text-xs font-semibold text-[#15803D]">
                  <BadgeIndianRupee className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isHi
                      ? "₹2,500 आपातकालीन पशु अग्रिम के लिए पात्र"
                      : "Eligible for ₹2,500 Emergency Vet Advance"}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FEF9EC] border border-[#FDE68A] text-xs font-medium text-[#B45309] font-mono tabular-nums">
                  {isHi
                    ? `अग्रिम अनलॉक: ${distinctMilkDays}/3 दूध दिन`
                    : `Advance progress: ${distinctMilkDays}/3 milk days logged`}
                </span>
              )}
            </div>

            <p className="text-xs text-[#634853] leading-relaxed">
              {isEligibleForAdvance
                ? isHi
                  ? `${distinctMilkDays} दिनों के नियमित दूध रिकॉर्ड (${avgDailyLiters.toFixed(1)} ली./दिन औसत) से बिना पशु बेचे तुरंत इलाज सहायता मिलती है।`
                  : `Backed by ${distinctMilkDays} regular milk log days (${avgDailyLiters.toFixed(1)} L/day avg) to protect your household against distress selling.`
                : isHi
                  ? "₹2,500 ब्याज-मुक्त पशु अग्रिम पाने के लिए कम से कम 3 दिन का दूध लॉग दर्ज करें।"
                  : "Log milk yield on at least 3 days for this animal to unlock the ₹2,500 Co-op Emergency Vet Advance."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ListenButton text={shieldAudioText} language={language} />
            <button
              type="button"
              onClick={openClaimReport}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#9D174D] text-white text-xs font-medium hover:bg-[#831843] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isHi ? "बीमा क्लेम रिपोर्ट बनाएं" : "Generate Insurance Claim Report"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Timestamped Insurance Claim & Vet Summary Modal */}
      {reportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isHi ? "बीमा क्लेम रिपोर्ट" : "Insurance Claim Report"}
          onClick={() => setReportOpen(false)}
          className="fixed inset-0 z-50 bg-[#2A1720]/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#FDF5F7] border-b border-[#ECD8DE] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#2A1720] truncate">
                  {isHi
                    ? "पशु स्वास्थ्य व बीमा क्लेम रिपोर्ट"
                    : "Verified Insurance Claim & Health Summary"}
                </p>
                <p className="text-xs font-mono tabular-nums text-[#634853] mt-0.5">
                  {reportId} · {reportStamp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                aria-label={isHi ? "बंद करें" : "Close report"}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#634853] hover:text-[#2A1720] hover:bg-[#F2DFE5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Report Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
              {/* Farmer & Animal Identity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#FDF7F8] border border-[#ECD8DE]">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#634853]">
                    {isHi ? "किसान विवरण" : "Farmer Household"}
                  </p>
                  <p className="font-semibold text-[#2A1720]">
                    {farmerProfile.uniqueName}
                  </p>
                  <p className="text-xs text-[#634853]">{farmerProfile.village}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#634853]">
                    {isHi ? "पशु पहचान" : "Insured Animal"}
                  </p>
                  <p className="font-semibold text-[#2A1720]">
                    {animalDisplayName} ·{" "}
                    <span className="font-mono">{animal.earTag}</span>
                  </p>
                  <p className="text-xs text-[#634853]">
                    {translateSpecies(animal.species, language)} · {animal.breed} ·{" "}
                    {animal.ageYears} {isHi ? "साल" : "yrs"} · {animal.weightKg}{" "}
                    {isHi ? "किग्रा" : "kg"} ·{" "}
                    {translateHealthState(animal.healthState, language)}
                  </p>
                </div>
              </div>

              {/* Milk & Co-op Advance Summary */}
              <div className="p-4 rounded-xl bg-white border border-[#ECD8DE] space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#634853]">
                  {isHi ? "दूध लॉग व सहकारिता पात्रता" : "Milk Production & Co-op Shield"}
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-[#FDF5F7]">
                    <p className="text-[11px] text-[#634853]">
                      {isHi ? "दूध के दिन" : "Logged Days"}
                    </p>
                    <p className="text-base font-semibold font-mono tabular-nums text-[#2A1720]">
                      {distinctMilkDays}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FDF5F7]">
                    <p className="text-[11px] text-[#634853]">
                      {isHi ? "औसत/दिन" : "Daily Avg"}
                    </p>
                    <p className="text-base font-semibold font-mono tabular-nums text-[#2A1720]">
                      {avgDailyLiters.toFixed(1)} L
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#FDF5F7]">
                    <p className="text-[11px] text-[#634853]">
                      {isHi ? "कुल दूध" : "Total Logged"}
                    </p>
                    <p className="text-base font-semibold font-mono tabular-nums text-[#2A1720]">
                      {totalLitersLogged.toFixed(1)} L
                    </p>
                  </div>
                </div>
                <p className="text-xs font-medium text-[#15803D] inline-flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isEligibleForAdvance
                      ? isHi
                        ? "सत्यापित: ₹2,500 आपातकालीन पशु चिकित्सा अग्रिम के लिए पात्र"
                        : "Verified: Eligible for ₹2,500 Emergency Vet Advance"
                      : isHi
                        ? `प्रगति पर: ${distinctMilkDays}/3 दूध दिन दर्ज`
                        : `In progress: ${distinctMilkDays}/3 milk days logged`}
                  </span>
                </p>
              </div>

              {/* Vaccination Records */}
              <div className="p-4 rounded-xl bg-white border border-[#ECD8DE] space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#634853]">
                  {isHi ? "टीकाकरण रिकॉर्ड" : "Vaccination Records"}
                </p>
                {animalVaccinations.length === 0 ? (
                  <p className="text-xs text-[#634853]">
                    {isHi ? "कोई टीकाकरण रिकॉर्ड नहीं है।" : "No vaccinations recorded yet."}
                  </p>
                ) : (
                  <ul className="divide-y divide-[#F3E4E9] text-xs">
                    {animalVaccinations.map((v) => (
                      <li
                        key={v.id}
                        className="py-2 flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-[#2A1720]">
                          {isHi ? v.vaccineNameHi : v.vaccineName}
                        </span>
                        <span className="font-mono tabular-nums text-[#634853]">
                          {v.status} · {v.completedDate || v.dueDate}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Vet Visits & Health Incidents */}
              <div className="p-4 rounded-xl bg-white border border-[#ECD8DE] space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#634853]">
                  {isHi
                    ? "पशु डॉक्टर जांच व आपात घटनाएं"
                    : "Veterinary Visit & Health Incident Log"}
                </p>
                {animalVetAlerts.length === 0 ? (
                  <p className="text-xs text-[#634853]">
                    {isHi
                      ? "इस पशु के लिए कोई आपात स्वास्थ्य घटना दर्ज नहीं है।"
                      : "No emergency veterinary incidents recorded for this animal."}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {animalVetAlerts.map((al) => (
                      <div
                        key={al.id}
                        className="p-3 rounded-lg bg-[#FDF7F8] border border-[#ECD8DE] text-xs space-y-1"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[#2A1720]">
                            {isHi && al.titleHi ? al.titleHi : al.title}
                          </span>
                          <span className="font-mono text-[11px] text-[#9D174D]">
                            {translateAlertStatus(al.status, language)} ·{" "}
                            {new Date(al.createdAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <p className="text-[#4A2E3A]">
                          {isHi && al.symptomsHi ? al.symptomsHi : al.symptoms}
                        </p>
                        {al.vetNotes && (
                          <p className="text-[#15803D] font-medium pt-0.5">
                            {isHi ? "डॉक्टर नोट्स:" : "Vet Notes:"} {al.vetNotes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-[#FDF5F7] border-t border-[#ECD8DE] flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#E4CDD4] bg-white text-xs font-medium text-[#2A1720] hover:bg-[#F5E4EA] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isHi ? "प्रिंट करें" : "Print"}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#9D174D] text-white text-xs font-medium hover:bg-[#831843] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isHi ? "रिपोर्ट डाउनलोड करें (.txt)" : "Download Report (.txt)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
