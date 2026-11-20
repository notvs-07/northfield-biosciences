import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Droplets,
  HeartHandshake,
  LayoutGrid,
  MapPin,
  Megaphone,
  Plus,
  ShieldAlert,
  Stethoscope,
  Syringe,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import cattleAiEmblemImg from "../assets/images/cattle_ai_emblem_1794593491338.jpg";
import type {
  Animal,
  AnimalSpecies,
  FarmerProfile,
  LanguageCode,
  MilkLog,
  TriageMessage,
  VaccinationReminder,
  VetAlert,
  VillagePreventionAlert,
} from "../types";
import {
  translateAlertStatus,
  translateHealthState,
  translateSpecies,
} from "../utils/i18n";
import { AnimalAvatar } from "./AnimalAvatar";
import { AnimalInsuranceShield } from "./AnimalInsuranceShield";
import { ListenButton } from "./ListenButton";
import { MilkProductionTrendsChart } from "./MilkProductionTrendsChart";
import { MilkYieldSection } from "./MilkYieldSection";
import { RecentMilkEntriesSection } from "./RecentMilkEntriesSection";
import { TriageChatBox, type AutoCheckRequest } from "./TriageChatBox";
import { VaccinationSection } from "./VaccinationSection";

type FarmerSectionKey =
  | "all"
  | "herd"
  | "trends"
  | "logs"
  | "entries"
  | "vaccines";

interface SilentMilkDropState {
  animal: Animal;
  loggedLiters: number;
  baselineAvg: number;
  dropPct: number;
  date: string;
  session: "Morning" | "Evening";
}

interface FarmerViewProps {
  farmerProfile: FarmerProfile;
  animals: Animal[];
  milkLogs: MilkLog[];
  vaccinations: VaccinationReminder[];
  vetAlerts: VetAlert[];
  villagePreventionAlerts: VillagePreventionAlert[];
  triageHistory: TriageMessage[];
  selectedAnimalId: string;
  language: LanguageCode;
  onSelectAnimal: (id: string) => void;
  onChangeLanguage: (lang: LanguageCode) => void;
  onSwitchFarmer: () => void;
  onAddAnimal: (animal: Omit<Animal, "id">) => void;
  onAddMilkLog: (entry: Omit<MilkLog, "id">) => void;
  onDeleteMilkLog: (id: string) => void;
  onToggleVaccinationStatus: (id: string) => void;
  onAddVaccination: (reminder: Omit<VaccinationReminder, "id" | "status">) => void;
  onAddTriageMessages: (messages: TriageMessage[]) => void;
  onClearTriageHistory: () => void;
  onEscalateToVet: (
    alert: Omit<
      VetAlert,
      "id" | "createdAt" | "status" | "farmerId" | "farmerName" | "farmerVillage"
    >
  ) => VetAlert;
  onOpenVetDashboard: () => void;
}

export function FarmerView({
  farmerProfile,
  animals,
  milkLogs,
  vaccinations,
  vetAlerts,
  villagePreventionAlerts,
  triageHistory,
  selectedAnimalId,
  language,
  onSelectAnimal,
  onChangeLanguage,
  onSwitchFarmer,
  onAddAnimal,
  onAddMilkLog,
  onDeleteMilkLog,
  onToggleVaccinationStatus,
  onAddVaccination,
  onAddTriageMessages,
  onClearTriageHistory,
  onEscalateToVet,
  onOpenVetDashboard,
}: FarmerViewProps) {
  const [activeSection, setActiveSection] = useState<FarmerSectionKey>("all");
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [emblemImgFailed, setEmblemImgFailed] = useState(false);
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [silentMilkDropAlert, setSilentMilkDropAlert] =
    useState<SilentMilkDropState | null>(null);
  const [autoCheckRequest, setAutoCheckRequest] =
    useState<AutoCheckRequest | null>(null);

  // Add Animal Form
  const [newName, setNewName] = useState("");
  const [newSpecies, setNewSpecies] = useState<AnimalSpecies>("Cow");
  const [newBreed, setNewBreed] = useState("Sahiwal");
  const [newEarTag, setNewEarTag] = useState("PR-305");
  const [newAge, setNewAge] = useState("3");
  const [newWeight, setNewWeight] = useState("380");
  const [newShed, setNewShed] = useState("Shed A · Stall 2");

  // Direct Emergency Report Form
  const [alertAnimalId, setAlertAnimalId] = useState(animals[0]?.id || "");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertSymptoms, setAlertSymptoms] = useState("");

  const isHi = language === "hi";
  const activeAlerts = vetAlerts.filter(
    (a) => a.farmerId === farmerProfile.id && a.status !== "Resolved"
  );

  useEffect(() => {
    if (!showAiAssistant) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAiAssistant(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showAiAssistant]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const getAnimalTodayMilk = (animalId: string): number => {
    return Number(
      milkLogs
        .filter((l) => l.animalId === animalId && l.date === todayStr)
        .reduce((acc, l) => acc + l.liters, 0)
        .toFixed(1)
    );
  };

  const handleCreateAnimal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddAnimal({
      name: newName.trim(),
      nameHi: newName.trim(),
      species: newSpecies,
      breed: newBreed.trim() || "Indigenous",
      earTag: newEarTag.trim() || `PR-${Math.floor(300 + Math.random() * 600)}`,
      ageYears: Math.max(1, Number(newAge) || 2),
      weightKg: Math.max(10, Number(newWeight) || 350),
      status: "Lactating",
      healthState: "Healthy",
      shedLocation: newShed.trim() || "Shed A",
    });
    setNewName("");
    setShowAddAnimal(false);
  };

  const matchingVillageAdvisories = useMemo(() => {
    const normalizedVillage = farmerProfile.village.trim().toLowerCase();
    return villagePreventionAlerts.filter(
      (advisory) => advisory.village.trim().toLowerCase() === normalizedVillage
    );
  }, [villagePreventionAlerts, farmerProfile.village]);

  const selectedAnimal = useMemo(
    () => animals.find((a) => a.id === selectedAnimalId) || animals[0],
    [animals, selectedAnimalId]
  );

  const handleMilkLogWithDropCheck = (entry: Omit<MilkLog, "id">) => {
    const targetAnimal = animals.find((a) => a.id === entry.animalId);
    const priorLogs = milkLogs.filter(
      (l) =>
        l.animalId === entry.animalId &&
        !(l.date === entry.date && l.session === entry.session)
    );
    const sameSessionLogs = priorLogs.filter((l) => l.session === entry.session);
    const baselineLogs = sameSessionLogs.length > 0 ? sameSessionLogs : priorLogs;

    if (targetAnimal && baselineLogs.length >= 1) {
      const baselineAvg =
        baselineLogs.reduce((sum, l) => sum + l.liters, 0) / baselineLogs.length;

      if (baselineAvg > 0 && entry.liters < baselineAvg * 0.75) {
        const dropPct = Math.round(
          ((baselineAvg - entry.liters) / baselineAvg) * 100
        );
        if (dropPct > 25) {
          setSilentMilkDropAlert({
            animal: targetAnimal,
            loggedLiters: entry.liters,
            baselineAvg: Number(baselineAvg.toFixed(1)),
            dropPct,
            date: entry.date,
            session: entry.session,
          });
        }
      }
    }

    onAddMilkLog(entry);
  };

  const handleOneTapSymptomCheck = () => {
    if (!silentMilkDropAlert) return;
    const { animal, loggedLiters, baselineAvg, dropPct, session } =
      silentMilkDropAlert;

    const sessionLabel = isHi
      ? session === "Morning"
        ? "सुबह"
        : "शाम"
      : session.toLowerCase();

    const promptText = isHi
      ? `${animal.nameHi} का ${sessionLabel} का दूध ${baselineAvg} लीटर औसत से ${dropPct}% घटकर ${loggedLiters} लीटर रह गया है। क्या यह किसी छिपी हुई शुरुआती बीमारी का संकेत है? अभी किन संकेतों की जांच करूं?`
      : `${animal.name}'s ${sessionLabel} milk yield dropped by ${dropPct}% (logged ${loggedLiters} L vs normal ${baselineAvg} L average). Could this signal an early hidden illness? What signs should I check right now?`;

    onSelectAnimal(animal.id);
    setSilentMilkDropAlert(null);
    setAutoCheckRequest({
      id: Date.now(),
      animalId: animal.id,
      promptText,
    });
    setShowAiAssistant(true);
  };

  const handleReportEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertSymptoms.trim()) return;
    onEscalateToVet({
      animalId: alertAnimalId || selectedAnimalId || "general-herd",
      severity: "emergency",
      source: "Farmer Report",
      title: alertTitle.trim(),
      titleHi: alertTitle.trim(),
      suspectedCategory: "Emergency Farmer Report",
      symptoms: alertSymptoms.trim(),
      symptomsHi: alertSymptoms.trim(),
      aiSafeCareAdvice: [
        "Keep the animal isolated in a calm, shaded area with fresh water nearby until the vet arrives.",
      ],
      aiSafeCareAdviceHi: [
        "डॉक्टर के आने तक पशु को छायादार और शांत जगह पर रखें और पास में साफ़ पानी रखें।",
      ],
      redFlags: ["Monitor breathing rate and ability to stand."],
      redFlagsHi: ["सांस लेने की गति और खड़े होने की क्षमता पर ध्यान दें।"],
    });
    setAlertTitle("");
    setAlertSymptoms("");
    setShowEmergencyForm(false);
  };

  const sectionTabs: Array<{
    key: FarmerSectionKey;
    labelEn: string;
    labelHi: string;
    icon: ComponentType<{ className?: string }>;
  }> = [
    { key: "all", labelEn: "All Sections", labelHi: "सब कुछ", icon: LayoutGrid },
    { key: "herd", labelEn: "Livestock Herd", labelHi: "पशु परिवार", icon: Users },
    { key: "trends", labelEn: "Milk Trends", labelHi: "दूध ग्राफ़", icon: BarChart3 },
    { key: "logs", labelEn: "Daily Milk Logs", labelHi: "दैनिक दूध", icon: Droplets },
    { key: "entries", labelEn: "Recent Entries", labelHi: "हाल के रिकॉर्ड", icon: ClipboardList },
    { key: "vaccines", labelEn: "Vaccinations", labelHi: "टीकाकरण", icon: Syringe },
  ];

  const showSection = (key: Exclude<FarmerSectionKey, "all">) =>
    activeSection === "all" || activeSection === key;

  const herdAudioText = useMemo(() => {
    if (animals.length === 0) {
      return isHi
        ? `${farmerProfile.uniqueName}, आपके खाते में अभी कोई पशु नहीं जुड़ा है।`
        : `${farmerProfile.uniqueName}, you have no animals added yet.`;
    }
    return animals
      .map((a) => {
        const liters = getAnimalTodayMilk(a.id);
        return isHi
          ? `${a.nameHi} (${translateSpecies(a.species, "hi")}) ने आज ${liters} लीटर दूध दिया, स्थिति ${translateHealthState(a.healthState, "hi")} है।`
          : `${a.name} (${a.species}) gave ${liters} liters today, status ${a.healthState}.`;
      })
      .join(" ");
  }, [animals, farmerProfile.uniqueName, isHi, milkLogs, todayStr]);

  return (
    <div className="max-w-5xl mx-auto pb-24 lg:pb-12 space-y-6">
      {/* 1. Personalized Farmer Welcome & Family Bond Bar */}
      <div className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl px-4 py-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F8EAEF] border border-[#E4CDD4] flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-[#9D174D]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold text-[#2A1720] truncate">
              {isHi
                ? `नमस्ते, ${farmerProfile.uniqueName}`
                : `Welcome, ${farmerProfile.uniqueName}`}
              <span className="text-[#B89AA5] mx-2" aria-hidden="true">
                ·
              </span>
              <span className="font-normal text-[#634853] inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 inline shrink-0" />
                {farmerProfile.village}
              </span>
            </p>
            <p className="text-xs text-[#7D4B5E] inline-flex items-center gap-1 mt-0.5">
              <HeartHandshake className="w-3.5 h-3.5 shrink-0 text-[#9D174D]" />
              <span>
                {isHi
                  ? "पशु और किसान एक परिवार हैं"
                  : "Cattle and farmers are one family"}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchFarmer}
          className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-[#E4CDD4] bg-[#FDF5F7] text-xs font-medium text-[#2A1720] hover:bg-[#F5E4EA] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-[#634853]" />
          <span>{isHi ? "किसान बदलें" : "Switch Farmer"}</span>
        </button>
      </div>

      {/* Village Prevention Advisory Banner (sent from Vet Village Cluster Radar) */}
      {matchingVillageAdvisories.length > 0 &&
        matchingVillageAdvisories.slice(0, 2).map((advisory) => {
          const msg = isHi ? advisory.messageHi : advisory.messageEn;
          return (
            <div
              key={advisory.id}
              className="bg-[#FEF9EC] border border-[#FDE68A] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <Megaphone className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#78350F]">
                    {isHi
                      ? `गाँव सावधानी सूचना · ${advisory.village} (${advisory.category})`
                      : `Village Prevention Advisory · ${advisory.village} (${advisory.category})`}
                  </p>
                  <p className="text-xs sm:text-sm text-[#78350F] mt-1 leading-relaxed">
                    {msg}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <ListenButton text={msg} language={language} />
              </div>
            </div>
          );
        })}

      {/* 2. Active Emergency Vet Alert Banner */}
      {activeAlerts.length > 0 && (() => {
        const alert = activeAlerts[0];
        const a = animals.find((an) => an.id === alert.animalId);
        const animalLabel = a
          ? isHi
            ? `${a.nameHi} (${translateSpecies(a.species, "hi")})`
            : `${a.name} (${a.species} · ${a.earTag})`
          : "";
        const alertHeadline =
          isHi && alert.titleHi ? alert.titleHi : alert.title;
        const alertSpeakText = isHi
          ? `ध्यान दें। ${animalLabel} के लिए गंभीर चेतावनी है: ${alertHeadline}। स्थिति: ${translateAlertStatus(alert.status, "hi")}।`
          : `Attention. Active emergency alert for ${animalLabel}: ${alertHeadline}. Status: ${alert.status}.`;

        return (
          <div className="bg-[#FDF2F2] border border-[#FECACA] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-[#7F1D1D]">
                    {isHi
                      ? `गंभीर चेतावनी (${activeAlerts.length})`
                      : `Active Emergency Vet Alert (${activeAlerts.length})`}
                  </span>
                  <span aria-hidden="true" className="text-[#FCA5A5]">
                    ·
                  </span>
                  <span className="text-xs font-medium text-[#991B1B]">
                    {translateAlertStatus(alert.status, language)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#7F1D1D] mt-1">
                  {animalLabel} — {alertHeadline}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <ListenButton text={alertSpeakText} language={language} />
              <button
                type="button"
                onClick={onOpenVetDashboard}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-medium hover:bg-[#991B1B] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <span>{isHi ? "डॉक्टर स्क्रीन देखें" : "View in Vet Dashboard"}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* 3. Clean Separate-Section Navigation Bar (AI Help lives in the always-visible square cattle icon) */}
      <nav
        aria-label={isHi ? "विभाग चुनें" : "Farm workspace sections"}
        className="flex items-center gap-2 overflow-x-auto pb-1"
      >
        {sectionTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#9D174D] text-white border-[#9D174D]"
                  : "bg-[#FFFCFC] text-[#3B212C] border-[#ECD8DE] hover:bg-[#F8EAEF]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{isHi ? tab.labelHi : tab.labelEn}</span>
            </button>
          );
        })}
      </nav>

      {/* 4. Separate Full-Width Sections */}
      <div className="space-y-6">
        {/* SECTION A: Livestock Herd */}
        {showSection("herd") && (
          <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F3E4E9]">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-[#2A1720] tracking-tight">
                  {isHi ? "मेरा पशु परिवार" : "Livestock Family Herd"}
                </h1>
                <p className="text-xs sm:text-sm text-[#634853] mt-0.5">
                  {isHi
                    ? "जानकारी देखने के लिए किसी पशु पर टैप करें"
                    : "Tap any family animal to focus milk logs and care"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ListenButton text={herdAudioText} language={language} />

                <button
                  type="button"
                  onClick={() => {
                    setAlertAnimalId(selectedAnimalId);
                    setShowEmergencyForm(!showEmergencyForm);
                    setShowAddAnimal(false);
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-lg border border-[#FECACA] bg-[#FDF2F2] text-[#B91C1C] text-xs font-medium hover:bg-[#FEE2E2] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isHi ? "डॉक्टर को बुलाएं" : "Raise Vet Alert"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddAnimal(!showAddAnimal);
                    setShowEmergencyForm(false);
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-lg border border-[#E4CDD4] bg-white text-[#2A1720] text-xs font-medium hover:bg-[#FDF5F7] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {showAddAnimal ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isHi ? "नया पशु जोड़ें" : "Add Animal"}</span>
                </button>
              </div>
            </div>

            {/* Direct Emergency Alert Form */}
            {showEmergencyForm && (
              <form
                onSubmit={handleReportEmergency}
                className="mt-4 p-4 rounded-xl bg-[#FDF2F2] border border-[#FECACA] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#7F1D1D]">
                    {isHi
                      ? "पशु डॉक्टर को तुरंत संदेश भेजें"
                      : "Send Direct Emergency Alert to Vet"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowEmergencyForm(false)}
                    className="p-1 text-[#991B1B] hover:text-[#7F1D1D] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={alertAnimalId || "general-herd"}
                    onChange={(e) => setAlertAnimalId(e.target.value)}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#FCA5A5] text-sm text-[#2A1720]"
                  >
                    {animals.length === 0 ? (
                      <option value="general-herd">
                        {isHi ? "सामान्य पशु" : "General Livestock / Herd"}
                      </option>
                    ) : (
                      animals.map((a) => (
                        <option key={a.id} value={a.id}>
                          {isHi
                            ? `${a.nameHi} (${translateSpecies(a.species, "hi")})`
                            : `${a.name} (${a.species} · ${a.earTag})`}
                        </option>
                      ))
                    )}
                  </select>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder={
                      isHi
                        ? "क्या दिक्कत है (जैसे तेज बुखार)"
                        : "Issue headline (e.g., Sudden lameness)"
                    }
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#FCA5A5] text-sm text-[#2A1720]"
                    required
                  />
                </div>
                <textarea
                  rows={2}
                  value={alertSymptoms}
                  onChange={(e) => setAlertSymptoms(e.target.value)}
                  placeholder={
                    isHi
                      ? "पशु की हालत के बारे में थोड़ा लिखें..."
                      : "Describe observed symptoms for the veterinarian..."
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#FCA5A5] text-sm text-[#2A1720]"
                  required
                />
                <button
                  type="submit"
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-[#B91C1C] text-white text-xs sm:text-sm font-medium hover:bg-[#991B1B] transition-colors cursor-pointer"
                >
                  {isHi ? "डॉक्टर को भेजें" : "Dispatch Alert to Vet Dashboard"}
                </button>
              </form>
            )}

            {/* Add Animal Form */}
            {showAddAnimal && (
              <form
                onSubmit={handleCreateAnimal}
                className="mt-4 p-4 rounded-xl bg-[#FDF5F7] border border-[#E4CDD4] space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={isHi ? "पशु का नाम (जैसे लक्ष्मी)" : "Animal name"}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720]"
                    required
                  />
                  <select
                    value={newSpecies}
                    onChange={(e) => setNewSpecies(e.target.value as AnimalSpecies)}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720]"
                  >
                    <option value="Cow">{isHi ? "गाय (Cow)" : "Cow"}</option>
                    <option value="Goat">{isHi ? "बकरी (Goat)" : "Goat"}</option>
                    <option value="Buffalo">{isHi ? "भैंस (Buffalo)" : "Buffalo"}</option>
                  </select>
                  <input
                    type="text"
                    value={newBreed}
                    onChange={(e) => setNewBreed(e.target.value)}
                    placeholder={isHi ? "नस्ल (जैसे गिर)" : "Breed"}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720]"
                  />
                  <input
                    type="text"
                    value={newEarTag}
                    onChange={(e) => setNewEarTag(e.target.value)}
                    placeholder={isHi ? "टैग नंबर (PR-305)" : "Ear Tag (PR-305)"}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm font-mono text-[#2A1720]"
                  />
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder={isHi ? "उम्र (साल)" : "Age (yrs)"}
                    min="1"
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm font-mono text-[#2A1720]"
                  />
                  <input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder={isHi ? "वज़न (किलो)" : "Weight (kg)"}
                    min="5"
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm font-mono text-[#2A1720]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newShed}
                    onChange={(e) => setNewShed(e.target.value)}
                    placeholder={isHi ? "बाड़ा / स्थान" : "Shed / stall location"}
                    className="flex-1 min-h-[42px] px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720]"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] px-5 py-2 rounded-lg bg-[#9D174D] text-white text-sm font-medium hover:bg-[#831843] transition-colors cursor-pointer"
                  >
                    {isHi ? "पशु सहेजें" : "Save Animal"}
                  </button>
                </div>
              </form>
            )}

            {/* Animal Selection Grid or Empty State */}
            {animals.length === 0 ? (
              <div className="mt-4 py-8 px-4 rounded-xl bg-[#FDF5F7] border border-dashed border-[#DFC6CE] text-center space-y-2.5">
                <p className="text-sm font-medium text-[#2A1720]">
                  {isHi
                    ? `${farmerProfile.uniqueName} के खाते में अभी कोई पशु नहीं है।`
                    : `No cattle registered under ${farmerProfile.uniqueName} yet.`}
                </p>
                <p className="text-xs text-[#634853] max-w-md mx-auto">
                  {isHi
                    ? "अपनी पहली गाय, बकरी या भैंस जोड़ें।"
                    : "Add your first cow, goat, or buffalo to start tracking."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddAnimal(true)}
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-[#9D174D] text-white text-xs font-medium hover:bg-[#831843] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isHi ? "पहला पशु जोड़ें" : "Add First Animal"}</span>
                </button>
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {animals.map((animal) => {
                    const isSelected = animal.id === selectedAnimalId;
                    const animalAlert = activeAlerts.find((al) => al.animalId === animal.id);
                    const todayLiters = getAnimalTodayMilk(animal.id);

                    return (
                      <button
                        key={animal.id}
                        type="button"
                        onClick={() => onSelectAnimal(animal.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${
                          isSelected
                            ? "border-[#9D174D] bg-[#FBEEF2] ring-1 ring-[#9D174D]/20"
                            : "border-[#ECD8DE] bg-white hover:border-[#D4B0BC]"
                        }`}
                      >
                        <AnimalAvatar
                          name={animal.name}
                          species={animal.species}
                          photoUrl={animal.photoUrl}
                          sizeClass="w-16 h-16"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-base font-semibold text-[#2A1720] truncate">
                              {isHi ? animal.nameHi : animal.name}
                            </p>
                            <span className="text-xs font-mono tabular-nums text-[#634853] shrink-0">
                              {animal.earTag}
                            </span>
                          </div>

                          <p className="text-xs text-[#634853] mt-0.5 truncate">
                            {translateSpecies(animal.species, language)} · {animal.breed} ·{" "}
                            {animal.ageYears} {isHi ? "साल" : "yrs"} ·{" "}
                            <span className="font-mono tabular-nums">
                              {animal.weightKg} {isHi ? "किग्रा" : "kg"}
                            </span>
                          </p>

                          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#F2E2E7]">
                            <span className="text-xs font-mono tabular-nums text-[#2A1720] font-medium">
                              {todayLiters.toFixed(1)} {isHi ? "ली. आज" : "L today"}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                animalAlert
                                  ? "text-[#B91C1C]"
                                  : animal.healthState === "Under Observation"
                                    ? "text-[#B45309]"
                                    : "text-[#15803D]"
                              }`}
                            >
                              {animalAlert
                                ? isHi
                                  ? "डॉक्टर सूचना सक्रिय"
                                  : "Vet Alert Active"
                                : translateHealthState(animal.healthState, language)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Co-op & Insurance Shield Card inside the Selected Animal Profile */}
                {selectedAnimal && (
                  <AnimalInsuranceShield
                    farmerProfile={farmerProfile}
                    animal={selectedAnimal}
                    milkLogs={milkLogs}
                    vaccinations={vaccinations}
                    vetAlerts={vetAlerts}
                    language={language}
                  />
                )}
              </>
            )}
          </section>
        )}

        {/* SECTION B: Milk Production Trends (Recharts) */}
        {showSection("trends") && (
          <MilkProductionTrendsChart
            animals={animals}
            milkLogs={milkLogs}
            selectedAnimalId={selectedAnimalId}
            language={language}
            onSelectAnimal={onSelectAnimal}
          />
        )}

        {/* SECTION C: Daily Milk Yield Logs (Monitored by Silent Milk-Drop Agent) */}
        {showSection("logs") && (
          <MilkYieldSection
            animals={animals}
            milkLogs={milkLogs}
            selectedAnimalId={selectedAnimalId}
            language={language}
            onSelectAnimal={onSelectAnimal}
            onAddMilkLog={handleMilkLogWithDropCheck}
          />
        )}

        {/* SECTION D: Recent Entries (Dedicated Table Section) */}
        {showSection("entries") && (
          <RecentMilkEntriesSection
            animals={animals}
            milkLogs={milkLogs}
            selectedAnimalId={selectedAnimalId}
            language={language}
            onDeleteMilkLog={onDeleteMilkLog}
          />
        )}

        {/* SECTION E: Vaccination Reminders */}
        {showSection("vaccines") && (
          <VaccinationSection
            animals={animals}
            vaccinations={vaccinations}
            language={language}
            onToggleVaccinationStatus={onToggleVaccinationStatus}
            onAddVaccination={onAddVaccination}
          />
        )}
      </div>

      {/* Prominent Always-Visible Square 'Emergency' Cattle AI Launcher */}
      <button
        type="button"
        onClick={() => setShowAiAssistant(true)}
        aria-label={
          isHi
            ? "आपातकालीन AI पशु सहायता खोलें"
            : "Emergency Cattle AI Triage"
        }
        title={isHi ? "आपातकालीन AI पशु सहायता" : "Emergency AI Cattle Triage"}
        className="fixed bottom-5 right-5 z-40 w-[86px] h-[86px] sm:w-[94px] sm:h-[94px] aspect-square rounded-xl border-2 border-[#B91C1C] bg-[#FFFCFC] shadow-lg shadow-[#B91C1C]/20 hover:scale-[1.03] active:scale-[0.98] transition-transform overflow-hidden flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C] focus-visible:ring-offset-2"
      >
        <div className="flex-1 w-full bg-[#FCEEF1] overflow-hidden flex items-center justify-center">
          {emblemImgFailed ? (
            <ShieldAlert className="w-8 h-8 text-[#B91C1C]" />
          ) : (
            <img
              src={cattleAiEmblemImg}
              alt={isHi ? "आपातकालीन पशु सहायता" : "Emergency Cattle Icon"}
              referrerPolicy="no-referrer"
              onError={() => setEmblemImgFailed(true)}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <span className="w-full py-1.5 px-1 bg-[#B91C1C] text-white text-[11px] font-bold tracking-tight leading-none inline-flex items-center justify-center gap-1 whitespace-nowrap">
          <ShieldAlert className="w-3 h-3 shrink-0" />
          <span>{isHi ? "आपात मदद" : "Emergency"}</span>
        </span>
      </button>

      {/* Silent Milk-Drop Proactive AI Health Alert Modal */}
      {silentMilkDropAlert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isHi ? "दूध में अचानक गिरावट चेतावनी" : "Silent Milk-Drop Agent Alert"}
          onClick={() => setSilentMilkDropAlert(null)}
          className="fixed inset-0 z-50 bg-[#2A1720]/45 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFCFC] border border-[#FECACA] rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FDF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-[#B91C1C]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">
                    {isHi ? "साइलेंट मिल्क-ड्रॉप एजेंट" : "Silent Milk-Drop Agent"}
                  </p>
                  <h2 className="text-base sm:text-lg font-semibold text-[#2A1720] mt-0.5">
                    {isHi
                      ? `${silentMilkDropAlert.animal.nameHi} के दूध में ${silentMilkDropAlert.dropPct}% गिरावट`
                      : `${silentMilkDropAlert.dropPct}% Milk Drop Detected · ${silentMilkDropAlert.animal.name}`}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSilentMilkDropAlert(null)}
                aria-label={isHi ? "बंद करें" : "Dismiss alert"}
                className="p-1.5 rounded-lg text-[#634853] hover:bg-[#F5E4EA] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#FECACA] text-xs sm:text-sm text-[#7F1D1D] space-y-1.5 leading-relaxed">
              <p>
                {isHi
                  ? `दर्ज दूध: ${silentMilkDropAlert.loggedLiters} ली. (सामान्य औसत: ${silentMilkDropAlert.baselineAvg} ली.)।`
                  : `Logged ${silentMilkDropAlert.loggedLiters} L vs normal ${silentMilkDropAlert.baselineAvg} L average.`}
              </p>
              <p className="font-medium">
                {isHi
                  ? "25% से अधिक अचानक दूध कम होना शुरुआती छिपी बीमारी (जैसे थनैला या बुखार) का पहला संकेत हो सकता है।"
                  : "A sudden drop over 25% can warn of early hidden illness such as subclinical mastitis or fever before visible symptoms appear."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <ListenButton
                text={
                  isHi
                    ? `सावधान! ${silentMilkDropAlert.animal.nameHi} का दूध सामान्य से ${silentMilkDropAlert.dropPct}% कम हुआ है। यह शुरुआती छिपी बीमारी का संकेत हो सकता है। तुरंत जांच शुरू करें।`
                    : `Warning! ${silentMilkDropAlert.animal.name}'s milk dropped by ${silentMilkDropAlert.dropPct}% below normal. This may indicate an early hidden illness. Tap for a quick symptom check.`
                }
                language={language}
              />

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSilentMilkDropAlert(null)}
                  className="min-h-[40px] px-3 py-2 rounded-lg border border-[#E4CDD4] text-xs font-medium text-[#3B212C] hover:bg-[#FDF5F7] cursor-pointer"
                >
                  {isHi ? "बाद में" : "Dismiss"}
                </button>
                <button
                  type="button"
                  onClick={handleOneTapSymptomCheck}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-[#9D174D] text-white text-xs font-semibold hover:bg-[#831843] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>{isHi ? "1-टैप लक्षण जांच" : "1-Tap Symptom Check"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instant Emergency Cattle AI Overlay Drawer/Modal */}
      {showAiAssistant && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isHi ? "AI पशु सहायता" : "Emergency Cattle AI Assistant"}
          onClick={() => setShowAiAssistant(false)}
          className="fixed inset-0 z-50 bg-[#2A1720]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col"
          >
            <TriageChatBox
              animals={animals}
              milkLogs={milkLogs}
              selectedAnimalId={selectedAnimalId}
              language={language}
              triageHistory={triageHistory}
              autoCheckRequest={autoCheckRequest}
              onConsumeAutoCheck={() => setAutoCheckRequest(null)}
              onSelectAnimal={onSelectAnimal}
              onChangeLanguage={onChangeLanguage}
              onAddTriageMessages={onAddTriageMessages}
              onClearHistory={onClearTriageHistory}
              onEscalateToVet={onEscalateToVet}
              onOpenVetDashboard={() => {
                setShowAiAssistant(false);
                onOpenVetDashboard();
              }}
              onClose={() => setShowAiAssistant(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
