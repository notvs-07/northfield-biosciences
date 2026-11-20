import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  Megaphone,
  Radar,
  ShieldAlert,
  Truck,
  UserCheck,
} from "lucide-react";
import type {
  AlertWorkflowStatus,
  Animal,
  FarmerWorkspaceData,
  LanguageCode,
  VetAlert,
  VillagePreventionAlert,
} from "../types";
import {
  formatRelativeTime,
  translateAlertSource,
  translateAlertStatus,
  translateSpecies,
} from "../utils/i18n";
import { AnimalAvatar } from "./AnimalAvatar";
import { ListenButton } from "./ListenButton";

interface VetDashboardProps {
  farmers: Record<string, FarmerWorkspaceData>;
  vetAlerts: VetAlert[];
  villagePreventionAlerts: VillagePreventionAlert[];
  language: LanguageCode;
  onUpdateAlertStatus: (alertId: string, status: AlertWorkflowStatus) => void;
  onSaveVetNotes: (alertId: string, notes: string) => void;
  onToggleVaccinationStatus: (farmerId: string, vaccinationId: string) => void;
  onSendVillagePreventionAlert: (
    payload: Omit<VillagePreventionAlert, "id" | "sentAt">
  ) => void;
}

function classifySymptomCluster(alert: VetAlert): {
  key: string;
  labelEn: string;
  labelHi: string;
  preventionEn: string;
  preventionHi: string;
} {
  const haystack =
    `${alert.suspectedCategory} ${alert.title} ${alert.symptoms}`.toLowerCase();

  if (
    haystack.includes("bloat") ||
    haystack.includes("ruminal") ||
    haystack.includes("stomach") ||
    haystack.includes("appetite") ||
    haystack.includes("digest") ||
    haystack.includes("अफारा") ||
    haystack.includes("पेट") ||
    haystack.includes("जुगाली")
  ) {
    return {
      key: "digestive_bloat",
      labelEn: "Digestive / Ruminal Bloat",
      labelHi: "पेट फूलना / अफारा",
      preventionEn:
        "Pause sudden wet lush fodder changes, offer dry straw first, keep clean water accessible, and report any swollen left flank early.",
      preventionHi:
        "अचानक ताज़ा गीला चारा देना बंद करें, पहले सूखा भूसा दें, साफ़ पानी रखें और पेट फूलते ही डॉक्टर को सूचित करें।",
    };
  }

  if (
    haystack.includes("mastitis") ||
    haystack.includes("udder") ||
    haystack.includes("teat") ||
    haystack.includes("clot") ||
    haystack.includes("milk") ||
    haystack.includes("थन") ||
    haystack.includes("दूध")
  ) {
    return {
      key: "udder_mastitis",
      labelEn: "Udder / Mastitis Signs",
      labelHi: "थनैला / थन सूजन लक्षण",
      preventionEn:
        "Keep milking area dry and sanitized, wash hands and udder with clean water before milking, and isolate affected milk immediately.",
      preventionHi:
        "दूध निकालने की जगह सूखी व साफ़ रखें, दूध दोहने से पहले हाथ व थन साफ़ पानी से धोएं और संदिग्ध दूध अलग रखें।",
    };
  }

  if (
    haystack.includes("breath") ||
    haystack.includes("pant") ||
    haystack.includes("cough") ||
    haystack.includes("nasal") ||
    haystack.includes("respir") ||
    haystack.includes("सांस") ||
    haystack.includes("हांफ") ||
    haystack.includes("खांसी")
  ) {
    return {
      key: "respiratory",
      labelEn: "Respiratory Distress",
      labelHi: "सांस व फेफड़ों के लक्षण",
      preventionEn:
        "Move cattle to cool airy shade, isolate coughing animals from the herd, and monitor breathing rate closely.",
      preventionHi:
        "पशुओं को हवादार छाया में रखें, खांसी या तेज़ सांस वाले पशु को बाकी पशुओं से अलग रखें और डॉक्टर से जांच कराएं।",
    };
  }

  if (
    haystack.includes("lameness") ||
    haystack.includes("hoof") ||
    haystack.includes("foot") ||
    haystack.includes("mouth") ||
    haystack.includes("fmd") ||
    haystack.includes("लंगड़ा") ||
    haystack.includes("खुर") ||
    haystack.includes("मुंह")
  ) {
    return {
      key: "foot_mouth",
      labelEn: "Hoof / FMD-Like Symptoms",
      labelHi: "खुर / मुंहपका जैसे लक्षण",
      preventionEn:
        "Restrict herd movement across common grazing paths, keep sheds dry, and verify FMD vaccination status.",
      preventionHi:
        "साझा चरागाह में पशुओं का आना-जाना रोकें, बाड़ा सूखा रखें और मुंहपका-खुरपका (FMD) टीके की जांच करें।",
    };
  }

  return {
    key: "fever_systemic",
    labelEn: "Fever / Systemic Illness",
    labelHi: "बुखार / सामान्य कमज़ोरी",
    preventionEn:
      "Provide cool clean drinking water, shaded rest, and watch feed intake and milk yield across nearby sheds.",
    preventionHi:
      "साफ़ ठंडा पानी व छायादार आराम दें, और आसपास के सभी पशुओं के चारा व दूध पर नज़र रखें।",
  };
}

export function VetDashboard({
  farmers,
  vetAlerts,
  villagePreventionAlerts,
  language,
  onUpdateAlertStatus,
  onSaveVetNotes,
  onToggleVaccinationStatus,
  onSendVillagePreventionAlert,
}: VetDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | AlertWorkflowStatus>("all");
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savedNoticeId, setSavedNoticeId] = useState<string | null>(null);

  const isHi = language === "hi";
  const farmerList = useMemo(() => Object.values(farmers), [farmers]);

  const animalLookup = useMemo(() => {
    const map = new Map<string, Animal>();
    for (const f of farmerList) {
      for (const a of f.animals) {
        map.set(`${f.profile.id}::${a.id}`, a);
        if (!map.has(a.id)) map.set(a.id, a);
      }
    }
    return map;
  }, [farmerList]);

  const totalAnimalsCount = useMemo(
    () => farmerList.reduce((sum, f) => sum + f.animals.length, 0),
    [farmerList]
  );

  const pendingVaccinationsCount = useMemo(
    () =>
      farmerList.reduce(
        (sum, f) =>
          sum + f.vaccinations.filter((v) => v.status !== "Completed").length,
        0
      ),
    [farmerList]
  );

  const activeAlertsCount = vetAlerts.filter((a) => a.status !== "Resolved").length;
  const emergencyCount = vetAlerts.filter(
    (a) => a.status !== "Resolved" && a.severity === "emergency"
  ).length;

  const filteredAlerts = useMemo(() => {
    return vetAlerts
      .filter((a) => (statusFilter === "all" ? true : a.status === statusFilter))
      .sort((a, b) => {
        if (a.status === "Resolved" && b.status !== "Resolved") return 1;
        if (a.status !== "Resolved" && b.status === "Resolved") return -1;
        if (a.severity === "emergency" && b.severity !== "emergency") return -1;
        if (a.severity !== "emergency" && b.severity === "emergency") return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [vetAlerts, statusFilter]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const herdAnalytics = useMemo(() => {
    return farmerList.flatMap((farmerData) =>
      farmerData.animals.map((animal) => {
        const logs = farmerData.milkLogs.filter((l) => l.animalId === animal.id);
        const todayTotal = logs
          .filter((l) => l.date === todayStr)
          .reduce((sum, l) => sum + l.liters, 0);

        const dateTotals = new Map<string, number>();
        for (const l of logs) {
          if (l.date !== todayStr) {
            dateTotals.set(l.date, (dateTotals.get(l.date) || 0) + l.liters);
          }
        }
        const prevDays = Array.from(dateTotals.values());
        const baselineAvg =
          prevDays.length > 0
            ? prevDays.reduce((s, v) => s + v, 0) / prevDays.length
            : todayTotal;

        const deltaPct =
          baselineAvg > 0
            ? Math.round(((todayTotal - baselineAvg) / baselineAvg) * 100)
            : 0;

        const nextVax = farmerData.vaccinations
          .filter((v) => v.animalId === animal.id && v.status !== "Completed")
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

        const openAlert = vetAlerts.find(
          (al) =>
            al.farmerId === farmerData.profile.id &&
            al.animalId === animal.id &&
            al.status !== "Resolved"
        );

        return {
          farmerProfile: farmerData.profile,
          animal,
          todayTotal: Number(todayTotal.toFixed(1)),
          baselineAvg: Number(baselineAvg.toFixed(1)),
          deltaPct,
          nextVax,
          openAlert,
        };
      })
    );
  }, [farmerList, vetAlerts, todayStr]);

  const villageClusters = useMemo(() => {
    const groups = new Map<
      string,
      {
        village: string;
        clusterKey: string;
        labelEn: string;
        labelHi: string;
        preventionEn: string;
        preventionHi: string;
        animalKeys: Set<string>;
        farmerNames: Set<string>;
        alertCount: number;
        latestAt: string;
      }
    >();

    for (const al of vetAlerts) {
      if (al.status === "Resolved") continue;
      const villageName = al.farmerVillage.trim() || "Unknown Village";
      const cluster = classifySymptomCluster(al);
      const mapKey = `${villageName.toLowerCase()}::${cluster.key}`;

      let entry = groups.get(mapKey);
      if (!entry) {
        entry = {
          village: villageName,
          clusterKey: cluster.key,
          labelEn: cluster.labelEn,
          labelHi: cluster.labelHi,
          preventionEn: cluster.preventionEn,
          preventionHi: cluster.preventionHi,
          animalKeys: new Set<string>(),
          farmerNames: new Set<string>(),
          alertCount: 0,
          latestAt: al.createdAt,
        };
        groups.set(mapKey, entry);
      }

      entry.animalKeys.add(`${al.farmerId}::${al.animalId}`);
      entry.farmerNames.add(al.farmerName);
      entry.alertCount += 1;
      if (al.createdAt > entry.latestAt) {
        entry.latestAt = al.createdAt;
      }
    }

    return Array.from(groups.values())
      .map((g) => ({
        ...g,
        affectedAnimalCount: g.animalKeys.size,
        farmersList: Array.from(g.farmerNames),
        isOutbreakCluster: g.animalKeys.size >= 2 || g.alertCount >= 2,
      }))
      .sort((a, b) => {
        if (a.affectedAnimalCount !== b.affectedAnimalCount) {
          return b.affectedAnimalCount - a.affectedAnimalCount;
        }
        return b.latestAt.localeCompare(a.latestAt);
      });
  }, [vetAlerts]);

  const handleSaveNotes = (alertId: string) => {
    const text = draftNotes[alertId] ?? "";
    onSaveVetNotes(alertId, text);
    setSavedNoticeId(alertId);
    setTimeout(() => {
      setSavedNoticeId((curr) => (curr === alertId ? null : curr));
    }, 2200);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Village Outbreak / Cluster Radar Box (Top of Vet Dashboard) */}
      <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F3E4E9]">
          <div className="flex items-start gap-2.5">
            <Radar className="w-5 h-5 text-[#9D174D] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#2A1720]">
                {isHi ? "गाँव बीमारी क्लस्टर रडार" : "Village Cluster Radar"}
              </h2>
              <p className="text-xs sm:text-sm text-[#634853] mt-0.5">
                {isHi
                  ? "एक ही गाँव में मिलते-जुलते लक्षण वाले पशुओं की तुरंत पहचान और रोकथाम सूचना"
                  : "Detects when multiple animals in the same village show similar symptoms"}
              </p>
            </div>
          </div>

          {villageClusters.length > 0 && (
            <ListenButton
              text={
                isHi
                  ? `${villageClusters.length} गाँव समूह निगरानी में हैं। ${villageClusters[0].village} में ${villageClusters[0].labelHi} के ${villageClusters[0].affectedAnimalCount} पशु प्रभावित हैं।`
                  : `${villageClusters.length} village symptom ${
                      villageClusters.length === 1 ? "pattern" : "patterns"
                    } active. Top cluster: ${villageClusters[0].village} has ${
                      villageClusters[0].affectedAnimalCount
                    } animal(s) with ${villageClusters[0].labelEn}.`
              }
              language={language}
            />
          )}
        </div>

        <div className="mt-4 space-y-3">
          {villageClusters.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#EFF6F0] border border-[#CFE3D2] text-xs sm:text-sm text-[#14532D]">
              {isHi
                ? "किसी भी गाँव में अभी एक जैसे लक्षणों का समूह नहीं मिला है।"
                : "No multi-animal symptom clusters detected across villages right now."}
            </div>
          ) : (
            villageClusters.map((cluster) => {
              const alreadySent = villagePreventionAlerts.some(
                (sent) =>
                  sent.village.trim().toLowerCase() ===
                    cluster.village.trim().toLowerCase() &&
                  sent.category === cluster.labelEn
              );

              return (
                <div
                  key={`${cluster.village}-${cluster.clusterKey}`}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    cluster.isOutbreakCluster
                      ? "bg-[#FDF2F2] border-[#FECACA]"
                      : "bg-[#FDF7F8] border-[#ECD8DE]"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold ${
                          cluster.isOutbreakCluster
                            ? "bg-[#B91C1C] text-white"
                            : "bg-[#FEF9EC] border border-[#FDE68A] text-[#B45309]"
                        }`}
                      >
                        {cluster.isOutbreakCluster
                          ? isHi
                            ? "गाँव में क्लस्टर चेतावनी"
                            : "Outbreak Cluster"
                          : isHi
                            ? "गाँव निगरानी"
                            : "Single-Case Watch"}
                      </span>
                      <span className="font-semibold text-[#2A1720]">
                        {cluster.village}
                      </span>
                      <span aria-hidden="true" className="text-[#B89AA5]">
                        ·
                      </span>
                      <span className="font-medium text-[#9D174D]">
                        {isHi ? cluster.labelHi : cluster.labelEn}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#2A1720]">
                      {isHi
                        ? `${cluster.affectedAnimalCount} पशु (${cluster.farmersList.join(", ")}) में एक जैसे लक्षण मिले हैं।`
                        : `${cluster.affectedAnimalCount} ${
                            cluster.affectedAnimalCount === 1 ? "animal" : "animals"
                          } affected (${cluster.farmersList.join(", ")}).`}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {alreadySent ? (
                      <span className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#EFF6F0] border border-[#CFE3D2] text-[#15803D] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          {isHi
                            ? "गाँव सावधानी सूचना भेजी गई"
                            : "Village Prevention Alert Sent"}
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onSendVillagePreventionAlert({
                            village: cluster.village,
                            category: cluster.labelEn,
                            affectedAnimalCount: cluster.affectedAnimalCount,
                            messageEn: cluster.preventionEn,
                            messageHi: cluster.preventionHi,
                          })
                        }
                        className="min-h-[40px] px-4 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold hover:bg-[#991B1B] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Megaphone className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {isHi
                            ? "गाँव सावधानी सूचना भेजें"
                            : "Send Village Prevention Alert"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Clinical KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-4">
          <p className="text-xs text-[#634853]">
            {isHi ? "बाकी मामले" : "Active Triage Cases"}
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#2A1720] mt-1">
            {activeAlertsCount}
          </p>
          <p className="text-xs text-[#7B5F6A] mt-1">
            {isHi ? "सभी गाँव के घर" : "Across all village households"}
          </p>
        </div>

        <div className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-4">
          <p className="text-xs text-[#634853]">
            {isHi ? "अत्यंत गंभीर" : "Emergency Priority"}
          </p>
          <p
            className={`text-2xl font-semibold font-mono tabular-nums mt-1 ${
              emergencyCount > 0 ? "text-[#B91C1C]" : "text-[#15803D]"
            }`}
          >
            {emergencyCount}
          </p>
          <p className="text-xs text-[#7B5F6A] mt-1">
            {emergencyCount > 0
              ? isHi
                ? "तुरंत जाना ज़रूरी"
                : "Immediate visit needed"
              : isHi
                ? "कोई गंभीर मामला नहीं"
                : "No critical emergencies"}
          </p>
        </div>

        <div className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-4">
          <p className="text-xs text-[#634853]">
            {isHi ? "कुल पशु" : "Monitored Herd"}
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#2A1720] mt-1">
            {totalAnimalsCount}
          </p>
          <p className="text-xs text-[#7B5F6A] mt-1 font-mono tabular-nums">
            {farmerList.length} {isHi ? "किसान खाते" : farmerList.length === 1 ? "farmer" : "farmers"}
          </p>
        </div>

        <div className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-4">
          <p className="text-xs text-[#634853]">
            {isHi ? "बाकी टीके" : "Pending Vaccinations"}
          </p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#9D174D] mt-1">
            {pendingVaccinationsCount}
          </p>
          <p className="text-xs text-[#7B5F6A] mt-1">
            {isHi ? "लगने वाले टीके" : "Scheduled immunizations"}
          </p>
        </div>
      </div>

      {/* Escalated Triage & Emergency Queue */}
      <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F3E4E9]">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#2A1720] tracking-tight">
              {isHi
                ? "पशु डॉक्टर जांच व आपात कतार"
                : "Veterinary Escalation & Triage Queue"}
            </h1>
            <p className="text-xs sm:text-sm text-[#634853] mt-0.5">
              {isHi
                ? "हर सूचना में किसान का नाम और गाँव लिखा है"
                : "Every alert displays the farmer's unique Name/ID and Village"}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F5E4EA] rounded-lg overflow-x-auto max-w-full">
            {(
              [
                { key: "all", en: "All", hi: "सभी" },
                { key: "Pending Vet Review", en: "Pending", hi: "बाकी" },
                { key: "Vet Dispatched", en: "Dispatched", hi: "रास्ते में" },
                { key: "Resolved", en: "Resolved", hi: "ठीक हुए" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-white text-[#2A1720] shadow-xs"
                    : "text-[#634853] hover:text-[#2A1720]"
                }`}
              >
                {isHi ? tab.hi : tab.en}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#634853]">
              {isHi
                ? "इस सूची में कोई मामला नहीं है।"
                : "No triage alerts match this status filter."}
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const animal =
                animalLookup.get(`${alert.farmerId}::${alert.animalId}`) ||
                animalLookup.get(alert.animalId);
              const isResolved = alert.status === "Resolved";
              const isEmergency = alert.severity === "emergency";
              const noteValue =
                draftNotes[alert.id] !== undefined
                  ? draftNotes[alert.id]
                  : alert.vetNotes || "";

              const displayTitle =
                isHi && alert.titleHi ? alert.titleHi : alert.title;
              const displaySymptoms =
                isHi && alert.symptomsHi ? alert.symptomsHi : alert.symptoms;
              const displayAdvice =
                isHi && alert.aiSafeCareAdviceHi
                  ? alert.aiSafeCareAdviceHi
                  : alert.aiSafeCareAdvice;

              const alertSpeakPayload = isHi
                ? `किसान ${alert.farmerName}, गाँव ${alert.farmerVillage}। समस्या: ${displayTitle}। लक्षण: ${displaySymptoms}`
                : `Farmer ${alert.farmerName}, ${alert.farmerVillage}. Alert: ${displayTitle}. Symptoms: ${displaySymptoms}`;

              return (
                <article
                  key={alert.id}
                  className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                    isResolved
                      ? "border-[#ECD8DE] bg-[#FDF7F8]"
                      : isEmergency
                        ? "border-[#FCA5A5] bg-[#FFFDFD]"
                        : "border-[#FDE68A] bg-[#FFFEFA]"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {animal && (
                        <AnimalAvatar
                          name={animal.name}
                          species={animal.species}
                          photoUrl={animal.photoUrl}
                          sizeClass="w-14 h-14"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isResolved
                                ? "text-[#15803D]"
                                : isEmergency
                                  ? "text-[#B91C1C]"
                                  : "text-[#B45309]"
                            }`}
                          >
                            {isResolved ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isEmergency ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            <span>
                              {isResolved
                                ? isHi
                                  ? "ठीक हो गया"
                                  : "Resolved"
                                : isEmergency
                                  ? isHi
                                    ? "अत्यंत गंभीर"
                                    : "Emergency"
                                  : isHi
                                    ? "तत्काल जांच"
                                    : "Urgent"}
                            </span>
                          </span>
                          <span aria-hidden="true" className="text-[#B89AA5]">
                            ·
                          </span>
                          <span className="text-[#634853]">
                            {translateAlertSource(alert.source, language)}
                          </span>
                          <span aria-hidden="true" className="text-[#B89AA5]">
                            ·
                          </span>
                          <span className="font-mono tabular-nums text-[#634853]">
                            {formatRelativeTime(alert.createdAt, language)}
                          </span>
                          <span aria-hidden="true" className="text-[#B89AA5]">
                            ·
                          </span>
                          <span className="font-medium text-[#3B212C]">
                            {translateAlertStatus(alert.status, language)}
                          </span>
                        </div>

                        <h2 className="text-base sm:text-lg font-semibold text-[#2A1720] mt-1">
                          {displayTitle}
                        </h2>

                        {/* Farmer Name/ID & Village Household Identifier */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#9D174D]">
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isHi ? "किसान:" : "Farmer:"}{" "}
                              <span className="font-semibold text-[#2A1720]">
                                {alert.farmerName}
                              </span>
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isHi ? "गाँव:" : "Village:"}{" "}
                              <span className="font-semibold text-[#2A1720]">
                                {alert.farmerVillage}
                              </span>
                            </span>
                          </span>
                        </div>

                        {animal ? (
                          <p className="text-xs text-[#634853] mt-1">
                            <span className="font-medium text-[#3B212C]">
                              {isHi ? animal.nameHi : animal.name}
                            </span>{" "}
                            · {animal.earTag} ·{" "}
                            {translateSpecies(animal.species, language)} ({animal.breed}) ·{" "}
                            {animal.ageYears} {isHi ? "साल" : "yrs"} ·{" "}
                            <span className="font-mono tabular-nums">
                              {animal.weightKg} {isHi ? "किग्रा" : "kg"}
                            </span>
                          </p>
                        ) : (
                          <p className="text-xs text-[#634853] mt-1">
                            {isHi ? "सामान्य पशु परामर्श" : "General herd inquiry"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Workflow Status Actions + Audio */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <ListenButton text={alertSpeakPayload} language={language} />

                      {alert.status === "Pending Vet Review" && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAlertStatus(alert.id, "Vet Dispatched")
                          }
                          className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#9D174D] text-white text-xs font-medium hover:bg-[#831843] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>{isHi ? "डॉक्टर भेजें" : "Dispatch Visit"}</span>
                        </button>
                      )}
                      {alert.status !== "Resolved" ? (
                        <button
                          type="button"
                          onClick={() => onUpdateAlertStatus(alert.id, "Resolved")}
                          className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#15803D] text-white text-xs font-medium hover:bg-[#166534] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>{isHi ? "मामला बंद करें" : "Mark Resolved"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAlertStatus(alert.id, "Pending Vet Review")
                          }
                          className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#E4CDD4] bg-white text-[#3B212C] text-xs font-medium hover:bg-[#FDF5F7] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{isHi ? "फिर खोलें" : "Reopen Case"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Clinical Details Grid */}
                  <div className="mt-4 pt-4 border-t border-[#F3E4E9] grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#634853]">
                          {isHi ? "किसान द्वारा बताए लक्षण" : "Reported Presentation"}
                        </p>
                        <p className="text-sm text-[#2A1720] mt-1 leading-relaxed">
                          {displaySymptoms}
                        </p>
                      </div>

                      {displayAdvice.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#634853]">
                            {isHi
                              ? "बिना दवा वाली प्राथमिक सलाह"
                              : "Non-Medicinal First-Aid Given to Farmer"}
                          </p>
                          <ul className="mt-1 space-y-1 text-xs text-[#4A2E3A] list-disc pl-4">
                            {displayAdvice.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Licensed Vet Clinical Notes */}
                    <div className="space-y-2">
                      <label
                        htmlFor={`vet-notes-${alert.id}`}
                        className="block text-xs font-semibold uppercase tracking-wider text-[#9D174D]"
                      >
                        {isHi
                          ? "डॉक्टर के जांच और दवा नोट्स"
                          : "Licensed Vet Clinical Assessment & Rx Notes"}
                      </label>
                      <textarea
                        id={`vet-notes-${alert.id}`}
                        rows={3}
                        value={noteValue}
                        onChange={(e) =>
                          setDraftNotes((prev) => ({
                            ...prev,
                            [alert.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          isHi
                            ? "जांच, बुखार, दवा और अगली सलाह लिखें..."
                            : "Record physical exam findings, vital signs, licensed prescription, and follow-up plan..."
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[#DFC6CE] text-sm text-[#2A1720] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#15803D]">
                          {savedNoticeId === alert.id
                            ? isHi
                              ? "नोट्स सहेजे गए"
                              : "Clinical notes saved"
                            : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(alert.id)}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[#9D174D] text-[#9D174D] text-xs font-medium hover:bg-[#FDF5F7] transition-colors cursor-pointer"
                        >
                          {isHi ? "नोट्स सहेजें" : "Save Clinical Notes"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* Herd Clinical & Milk Drop Monitoring Table */}
      <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
        <div className="pb-4 border-b border-[#F3E4E9]">
          <h2 className="text-base sm:text-lg font-semibold text-[#2A1720]">
            {isHi
              ? "सभी किसानों के पशु और दूध जांच तालिका"
              : "Herd Clinical & Milk Yield Anomaly Table"}
          </h2>
          <p className="text-xs sm:text-sm text-[#634853] mt-0.5">
            {isHi
              ? "दूध में अचानक कमी से बीमारी का शुरुआती संकेत मिल सकता है"
              : "Compares today's milk yield against prior baseline across all registered farmer households"}
          </p>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#F3E4E9] text-xs text-[#634853]">
                <th className="py-2.5 pr-4 font-medium">{isHi ? "पशु" : "Animal"}</th>
                <th className="py-2.5 pr-4 font-medium">{isHi ? "किसान / गाँव" : "Farmer / Village"}</th>
                <th className="py-2.5 pr-4 font-medium text-right">{isHi ? "आज का दूध" : "Today Milk"}</th>
                <th className="py-2.5 pr-4 font-medium text-right">{isHi ? "औसत" : "Baseline Avg"}</th>
                <th className="py-2.5 pr-4 font-medium text-right">{isHi ? "बदलाव" : "Variance"}</th>
                <th className="py-2.5 pr-4 font-medium">{isHi ? "आगामी टीका" : "Next Vaccination"}</th>
                <th className="py-2.5 font-medium text-right">{isHi ? "कार्य" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F6E9ED]">
              {herdAnalytics.map(
                ({
                  farmerProfile,
                  animal,
                  todayTotal,
                  baselineAvg,
                  deltaPct,
                  nextVax,
                  openAlert,
                }) => (
                  <tr
                    key={`${farmerProfile.id}-${animal.id}`}
                    className="hover:bg-[#FDF5F7] transition-colors"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <AnimalAvatar
                          name={animal.name}
                          species={animal.species}
                          photoUrl={animal.photoUrl}
                          sizeClass="w-9 h-9"
                        />
                        <div>
                          <p className="font-medium text-[#2A1720]">
                            {isHi ? animal.nameHi : animal.name}
                          </p>
                          <p className="text-xs font-mono text-[#634853]">
                            {animal.earTag} · {translateSpecies(animal.species, language)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <p className="text-xs font-medium text-[#2A1720]">
                        {farmerProfile.uniqueName}
                      </p>
                      <p className="text-[11px] text-[#634853]">
                        {farmerProfile.village}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums font-medium text-[#2A1720] whitespace-nowrap">
                      {todayTotal.toFixed(1)} {isHi ? "ली." : "L"}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-[#634853] whitespace-nowrap">
                      {baselineAvg.toFixed(1)} {isHi ? "ली." : "L"}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right font-mono tabular-nums text-xs font-semibold whitespace-nowrap ${
                        deltaPct <= -20
                          ? "text-[#B91C1C]"
                          : deltaPct < 0
                            ? "text-[#B45309]"
                            : "text-[#15803D]"
                      }`}
                    >
                      {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                      {openAlert ? (isHi ? " · चेतावनी" : " · Alert") : ""}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[#4A2E3A] whitespace-nowrap">
                      {nextVax ? (
                        <span>
                          {isHi ? nextVax.vaccineNameHi : nextVax.vaccineName} ·{" "}
                          <span className="font-mono">{nextVax.dueDate}</span>
                        </span>
                      ) : (
                        <span className="text-[#15803D]">
                          {isHi ? "सभी टीके पूरे" : "Up to date"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {nextVax ? (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleVaccinationStatus(farmerProfile.id, nextVax.id)
                          }
                          className="min-h-[34px] px-2.5 py-1 rounded-lg border border-[#E4CDD4] text-xs font-medium text-[#9D174D] hover:bg-[#FDF5F7] transition-colors cursor-pointer"
                        >
                          {isHi ? "टीका लग गया" : "Record Vaccine"}
                        </button>
                      ) : (
                        <span className="text-xs text-[#7B5F6A]">—</span>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
