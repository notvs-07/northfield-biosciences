import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Mic,
  MicOff,
  Send,
  ShieldAlert,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import type {
  Animal,
  HomeRemedySafety,
  LanguageCode,
  MilkLog,
  TriageMessage,
  TriageUrgency,
  VetAlert,
} from "../types";
import { translateSpecies } from "../utils/i18n";
import { ListenButton } from "./ListenButton";

export interface AutoCheckRequest {
  id: number;
  animalId: string;
  promptText: string;
}

interface TriageChatBoxProps {
  animals: Animal[];
  milkLogs: MilkLog[];
  selectedAnimalId: string;
  language: LanguageCode;
  triageHistory: TriageMessage[];
  autoCheckRequest?: AutoCheckRequest | null;
  onConsumeAutoCheck?: () => void;
  onSelectAnimal: (id: string) => void;
  onChangeLanguage: (lang: LanguageCode) => void;
  onAddTriageMessages: (messages: TriageMessage[]) => void;
  onClearHistory: () => void;
  onEscalateToVet: (
    alert: Omit<
      VetAlert,
      "id" | "createdAt" | "status" | "farmerId" | "farmerName" | "farmerVillage"
    >
  ) => VetAlert;
  onOpenVetDashboard: () => void;
  onClose?: () => void;
}

interface TriageApiResponse {
  reply: string;
  urgencyLevel: TriageUrgency;
  shouldEscalate: boolean;
  alertTitle: string;
  suspectedCategory: string;
  safeCareSteps: string[];
  redFlags: string[];
  homeRemedyDetected?: boolean;
  homeRemedySafety?: HomeRemedySafety;
  homeRemedyAdvice?: string;
  error?: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResult>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const QUICK_PROMPTS_EN = [
  "Udder is swollen, warm, and milk has clots",
  "Can I give mustard oil and hing for bloat?",
  "Animal is panting fast and unable to stand",
];

const QUICK_PROMPTS_HI = [
  "थन में सूजन है और दूध में थक्के आ रहे हैं",
  "क्या पेट फूलने पर सरसों का तेल और हींग पिला सकते हैं?",
  "पशु तेज़ हांफ रहा है और खड़ा नहीं हो पा रहा",
];

function getUrgencyLabel(
  urgency: TriageUrgency,
  isHi: boolean
): {
  text: string;
  colorClass: string;
  surfaceClass: string;
} {
  switch (urgency) {
    case "emergency":
      return {
        text: isHi ? "बहुत गंभीर · डॉक्टर को भेजा गया" : "Emergency · Escalated",
        colorClass: "text-[#B91C1C]",
        surfaceClass: "bg-[#FDF2F2] border-[#FECACA]",
      };
    case "urgent":
      return {
        text: isHi ? "तुरंत डॉक्टर को दिखाएं" : "Urgent · Vet Review",
        colorClass: "text-[#B91C1C]",
        surfaceClass: "bg-[#FFF7ED] border-[#FED7AA]",
      };
    case "moderate":
      return {
        text: isHi ? "ध्यान रखें (मध्यम)" : "Moderate · Monitor",
        colorClass: "text-[#B45309]",
        surfaceClass: "bg-[#FEF9EC] border-[#FDE68A]",
      };
    default:
      return {
        text: isHi ? "सामान्य देखभाल" : "Routine Care",
        colorClass: "text-[#15803D]",
        surfaceClass: "bg-[#EFF6F0] border-[#CFE3D2]",
      };
  }
}

function getRemedyMeta(
  safety: HomeRemedySafety,
  isHi: boolean
): { label: string; boxClass: string; titleClass: string } {
  switch (safety) {
    case "harmful":
      return {
        label: isHi ? "खतरनाक घरेलू उपाय — न दें" : "Harmful Remedy Warning — Do Not Give",
        boxClass: "bg-[#FDF2F2] border-[#FECACA] text-[#7F1D1D]",
        titleClass: "text-[#B91C1C]",
      };
    case "caution":
      return {
        label: isHi ? "सावधानी — डॉक्टर से पूछें" : "Home Remedy Caution",
        boxClass: "bg-[#FEF9EC] border-[#FDE68A] text-[#78350F]",
        titleClass: "text-[#B45309]",
      };
    default:
      return {
        label: isHi ? "सुरक्षित सहायक देखभाल" : "Safe Supportive Care",
        boxClass: "bg-[#EFF6F0] border-[#CFE3D2] text-[#14532D]",
        titleClass: "text-[#15803D]",
      };
  }
}

export function TriageChatBox({
  animals,
  milkLogs,
  selectedAnimalId,
  language,
  triageHistory,
  autoCheckRequest,
  onConsumeAutoCheck,
  onSelectAnimal,
  onChangeLanguage,
  onAddTriageMessages,
  onClearHistory,
  onEscalateToVet,
  onOpenVetDashboard,
  onClose,
}: TriageChatBoxProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manuallyEscalatedIds, setManuallyEscalatedIds] = useState<Record<string, boolean>>({});
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const handledAutoCheckIdRef = useRef<number | null>(null);

  const isHi = language === "hi";
  const selectedAnimal = animals.find((a) => a.id === selectedAnimalId) || animals[0];

  const speechRecognitionSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    );

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [triageHistory.length, isLoading]);

  const toggleVoiceInput = () => {
    if (!speechRecognitionSupported) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as Record<
      string,
      new () => SpeechRecognitionLike
    >;
    const SpeechRecCtor =
      win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecCtor) return;

    const recognition = new SpeechRecCtor();
    recognition.lang = isHi ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const buildRecentMilkSummary = useCallback(
    (animalId: string): string => {
      const logs = milkLogs
        .filter((l) => l.animalId === animalId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4);
      if (logs.length === 0) return "No recent milk yield entries";
      return logs.map((l) => `${l.date} ${l.session}: ${l.liters}L`).join(", ");
    },
    [milkLogs]
  );

  const submitSymptom = useCallback(
    async (rawText: string, overrideAnimalId?: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || isLoading) return;

      setErrorMsg(null);
      setInput("");

      const targetAnimal =
        (overrideAnimalId
          ? animals.find((a) => a.id === overrideAnimalId)
          : undefined) || selectedAnimal;
      const activeAnimalId = targetAnimal?.id || "general-herd";

      const userMessage: TriageMessage = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        language,
        animalId: activeAnimalId,
        timestamp: new Date().toISOString(),
        text: trimmed,
      };

      onAddTriageMessages([userMessage]);
      setIsLoading(true);

      try {
        const recentHistory = triageHistory.slice(-6).map((m) => ({
          role: m.role,
          text: isHi && m.textHi ? m.textHi : m.text,
        }));

        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            language,
            animal: targetAnimal
              ? {
                  id: targetAnimal.id,
                  name: targetAnimal.name,
                  species: targetAnimal.species,
                  breed: targetAnimal.breed,
                  ageLabel: `${targetAnimal.ageYears} yrs`,
                  weightKg: targetAnimal.weightKg,
                  status: targetAnimal.status,
                  recentMilkSummary: buildRecentMilkSummary(targetAnimal.id),
                }
              : undefined,
            history: recentHistory,
          }),
        });

        const data = (await res.json()) as TriageApiResponse;
        if (!res.ok) {
          throw new Error(
            data.error ||
              (isHi
                ? "जांच करने में दिक्कत आई। कृपया फिर कोशिश करें।"
                : "Unable to complete symptom triage. Please try again.")
          );
        }

        let createdAlertId: string | undefined;
        if (
          data.shouldEscalate ||
          data.urgencyLevel === "urgent" ||
          data.urgencyLevel === "emergency"
        ) {
          const alertSeverity =
            data.urgencyLevel === "emergency" ? "emergency" : "urgent";
          const createdAlert = onEscalateToVet({
            animalId: activeAnimalId,
            severity: alertSeverity,
            source: "AI Symptom Triage",
            title: data.alertTitle || "Urgent Symptom Triage Escalation",
            suspectedCategory: data.suspectedCategory || "Clinical Triage",
            symptoms: trimmed,
            aiSafeCareAdvice: data.safeCareSteps || [],
            redFlags: data.redFlags || [],
          });
          createdAlertId = createdAlert.id;
        }

        const assistantMessage: TriageMessage = {
          id: `msg-ai-${Date.now()}`,
          role: "assistant",
          language,
          animalId: activeAnimalId,
          timestamp: new Date().toISOString(),
          text: data.reply,
          urgencyLevel: data.urgencyLevel,
          shouldEscalate: data.shouldEscalate,
          escalatedAlertId: createdAlertId,
          alertTitle: data.alertTitle,
          suspectedCategory: data.suspectedCategory,
          safeCareSteps: data.safeCareSteps,
          redFlags: data.redFlags,
          homeRemedyDetected: Boolean(data.homeRemedyDetected),
          homeRemedySafety: data.homeRemedySafety || "none",
          homeRemedyAdvice: data.homeRemedyAdvice || "",
        };

        onAddTriageMessages([assistantMessage]);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : isHi
              ? "सर्वर से बात नहीं हो सकी।"
              : "Could not reach triage server.";
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [
      animals,
      buildRecentMilkSummary,
      isHi,
      isLoading,
      language,
      onAddTriageMessages,
      onEscalateToVet,
      selectedAnimal,
      triageHistory,
    ]
  );

  useEffect(() => {
    if (!autoCheckRequest) return;
    if (handledAutoCheckIdRef.current === autoCheckRequest.id) return;
    handledAutoCheckIdRef.current = autoCheckRequest.id;
    submitSymptom(autoCheckRequest.promptText, autoCheckRequest.animalId);
    onConsumeAutoCheck?.();
  }, [autoCheckRequest, onConsumeAutoCheck, submitSymptom]);

  const handleManualEscalate = (msg: TriageMessage) => {
    const targetAnimal = animals.find((a) => a.id === msg.animalId) || selectedAnimal;

    onEscalateToVet({
      animalId: targetAnimal?.id || "general-herd",
      severity: "urgent",
      source: "AI Symptom Triage",
      title: msg.alertTitle || "Farmer-Requested Vet Review",
      suspectedCategory: msg.suspectedCategory || "Symptom Triage",
      symptoms: isHi && msg.textHi ? msg.textHi : msg.text,
      aiSafeCareAdvice: msg.safeCareSteps || [],
      redFlags: msg.redFlags || [],
    });

    setManuallyEscalatedIds((prev) => ({ ...prev, [msg.id]: true }));
  };

  const quickPrompts = isHi ? QUICK_PROMPTS_HI : QUICK_PROMPTS_EN;

  return (
    <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-t-3xl sm:rounded-2xl flex flex-col h-[86vh] sm:h-auto sm:min-h-[540px] sm:max-h-[82vh] overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#F3E4E9] bg-[#FDF5F7]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Stethoscope className="w-5 h-5 text-[#9D174D] shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold text-[#2A1720] truncate">
              {isHi ? "AI बीमारी मददगार (बोलें या लिखें)" : "Gemini AI Symptom Triage"}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center p-0.5 bg-[#F4E1E6] rounded-lg">
              <button
                type="button"
                onClick={() => onChangeLanguage("en")}
                className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  language === "en"
                    ? "bg-white text-[#2A1720] shadow-xs"
                    : "text-[#634853] hover:text-[#2A1720]"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onChangeLanguage("hi")}
                className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  language === "hi"
                    ? "bg-white text-[#2A1720] shadow-xs"
                    : "text-[#634853] hover:text-[#2A1720]"
                }`}
              >
                हिंदी
              </button>
            </div>

            <button
              type="button"
              onClick={onClearHistory}
              title={isHi ? "चैट साफ़ करें" : "Clear chat"}
              aria-label={isHi ? "चैट साफ़ करें" : "Clear chat"}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#634853] hover:text-[#2A1720] hover:bg-[#F2DFE5] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title={isHi ? "बंद करें" : "Close"}
                aria-label={isHi ? "बंद करें" : "Close AI assistant"}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#634853] hover:text-[#2A1720] hover:bg-[#F2DFE5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Animal Context Selector & Non-Prescription Notice */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="triage-animal-select" className="text-xs text-[#634853] shrink-0">
              {isHi ? "पशु चुनें:" : "Animal:"}
            </label>
            <select
              id="triage-animal-select"
              value={selectedAnimal?.id || "general-herd"}
              onChange={(e) => onSelectAnimal(e.target.value)}
              className="min-h-[38px] px-3 py-1 rounded-lg bg-white border border-[#DFC6CE] text-xs font-medium text-[#2A1720] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30"
            >
              {animals.length === 0 ? (
                <option value="general-herd">
                  {isHi ? "सामान्य पशु सवाल" : "General Herd Inquiry"}
                </option>
              ) : (
                animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {isHi
                      ? `${a.nameHi} (${translateSpecies(a.species, "hi")} · ${a.earTag})`
                      : `${a.name} (${a.species} · ${a.earTag})`}
                  </option>
                ))
              )}
            </select>
          </div>

          <p className="text-xs text-[#634853] leading-tight">
            {isHi
              ? "कोई दवा नहीं बताता · गंभीर लक्षण सीधे डॉक्टर को जाते हैं"
              : "Never prescribes medicines · Urgent cases auto-escalate to Vet Dashboard"}
          </p>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FDF8F9]">
        {triageHistory.map((msg) => {
          const msgAnimal = animals.find((a) => a.id === msg.animalId);
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex flex-col items-end">
                <div className="text-[11px] text-[#634853] mb-1">
                  {msgAnimal
                    ? isHi
                      ? `${msgAnimal.nameHi} (${msgAnimal.earTag})`
                      : `${msgAnimal.name} (${msgAnimal.earTag})`
                    : ""}
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-[#9D174D] text-white px-4 py-2.5 text-sm leading-relaxed">
                  {msg.text}
                </div>
              </div>
            );
          }

          const urgency = msg.urgencyLevel || "routine";
          const urgencyMeta = getUrgencyLabel(urgency, isHi);
          const isEscalated =
            Boolean(msg.escalatedAlertId) ||
            Boolean(msg.shouldEscalate) ||
            Boolean(manuallyEscalatedIds[msg.id]);

          const displayText = isHi && msg.textHi ? msg.textHi : msg.text;
          const displaySteps =
            isHi && msg.safeCareStepsHi ? msg.safeCareStepsHi : msg.safeCareSteps;
          const displayFlags =
            isHi && msg.redFlagsHi ? msg.redFlagsHi : msg.redFlags;

          const showRemedyBox =
            Boolean(msg.homeRemedyDetected) &&
            msg.homeRemedySafety &&
            msg.homeRemedySafety !== "none" &&
            Boolean(msg.homeRemedyAdvice);
          const remedyMeta = showRemedyBox
            ? getRemedyMeta(msg.homeRemedySafety!, isHi)
            : null;

          const speakPayload = [
            displayText,
            showRemedyBox && msg.homeRemedyAdvice
              ? `${isHi ? "घरेलू उपाय जांच:" : "Home remedy check:"} ${msg.homeRemedyAdvice}`
              : "",
            displaySteps && displaySteps.length > 0
              ? `${isHi ? "सुरक्षित देखभाल:" : "Safe care:"} ${displaySteps.join(". ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={msg.id} className="flex flex-col items-start">
              <div className="w-full rounded-2xl rounded-bl-sm bg-white border border-[#ECD8DE] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F3E4E9]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {urgency === "emergency" || urgency === "urgent" ? (
                      <ShieldAlert className={`w-4 h-4 ${urgencyMeta.colorClass} shrink-0`} />
                    ) : urgency === "moderate" ? (
                      <AlertTriangle className={`w-4 h-4 ${urgencyMeta.colorClass} shrink-0`} />
                    ) : (
                      <CheckCircle2 className={`w-4 h-4 ${urgencyMeta.colorClass} shrink-0`} />
                    )}
                    <span className={urgencyMeta.colorClass}>{urgencyMeta.text}</span>
                  </div>

                  <ListenButton text={speakPayload} language={language} />
                </div>

                <p className="text-sm text-[#2A1720] leading-relaxed whitespace-pre-line">
                  {displayText}
                </p>

                {showRemedyBox && remedyMeta && (
                  <div className={`p-3 rounded-xl border ${remedyMeta.boxClass} space-y-1`}>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${remedyMeta.titleClass}`}>
                      <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                      <span>{remedyMeta.label}</span>
                    </div>
                    <p className="text-xs leading-relaxed">{msg.homeRemedyAdvice}</p>
                    <p className="text-[11px] font-medium opacity-90">
                      {isHi
                        ? "केवल पंजीकृत पशु डॉक्टर ही दवा लिख सकते हैं।"
                        : "Reminder: Only a licensed veterinarian can prescribe medicines."}
                    </p>
                  </div>
                )}

                {displaySteps && displaySteps.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-[#3B212C] mb-1">
                      {isHi ? "सुरक्षित देखभाल (बिना दवा):" : "Safe Non-Medicinal Care:"}
                    </p>
                    <ul className="space-y-1 text-xs text-[#4A2E3A] list-disc pl-4">
                      {displaySteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {displayFlags && displayFlags.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-[#991B1B] mb-1">
                      {isHi ? "खतरे के संकेत:" : "Watch for Red Flags:"}
                    </p>
                    <ul className="space-y-1 text-xs text-[#7F1D1D] list-disc pl-4">
                      {displayFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {isEscalated && !msg.id.startsWith("msg-welcome") && (
                  <div
                    className={`mt-2 p-3 rounded-xl border ${urgencyMeta.surfaceClass} flex flex-wrap items-center justify-between gap-2`}
                  >
                    <div className="text-xs font-medium text-[#7F1D1D]">
                      {isHi
                        ? "यह खबर डॉक्टर के डैशबोर्ड पर भेज दी गई है।"
                        : "Escalated to Veterinarian Dashboard for clinical review."}
                    </div>
                    <button
                      type="button"
                      onClick={onOpenVetDashboard}
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-[#B91C1C] text-white text-xs font-medium hover:bg-[#991B1B] transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>{isHi ? "डॉक्टर स्क्रीन देखें" : "Open Vet Dashboard"}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {!isEscalated && msg.urgencyLevel === "moderate" && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleManualEscalate(msg)}
                      className="min-h-[36px] px-3 py-1 rounded-lg border border-[#E4CDD4] text-xs font-medium text-[#3B212C] hover:bg-[#FDF5F7] transition-colors cursor-pointer"
                    >
                      {isHi ? "डॉक्टर को भेजें" : "Escalate to Veterinarian"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#634853] bg-white border border-[#ECD8DE] rounded-xl px-3.5 py-3 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-[#9D174D]" />
            <span>
              {isHi
                ? "जानकारी देखी जा रही है..."
                : "Analyzing symptoms safely..."}
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
            {errorMsg}
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Quick Prompts + Composer (with Voice Input) */}
      <div className="p-4 border-t border-[#F3E4E9] bg-[#FFFCFC] space-y-2.5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickPrompts.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => submitSymptom(promptText)}
              className="px-3 py-1.5 rounded-lg bg-[#FDF5F7] hover:bg-[#F5E4EA] border border-[#E4CDD4] text-xs text-[#3B212C] whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              {promptText}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSymptom(input);
          }}
          className="flex items-center gap-2"
        >
          {speechRecognitionSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isLoading}
              title={isHi ? "बोलकर बताएं" : "Speak symptoms"}
              aria-label={isHi ? "बोलकर बताएं" : "Speak symptoms"}
              className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border transition-colors inline-flex items-center justify-center gap-1.5 text-xs font-medium shrink-0 cursor-pointer ${
                isListening
                  ? "bg-[#B91C1C] text-white border-[#B91C1C]"
                  : "bg-[#FDF5F7] text-[#3B212C] border-[#DFC6CE] hover:bg-[#F4E1E6]"
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isListening ? (isHi ? "सुन रहा है..." : "Listening") : isHi ? "बोलें" : "Speak"}
              </span>
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={
              isHi
                ? "पशु की तकलीफ़ लिखें या बोलें..."
                : "Describe symptoms in English or Hindi..."
            }
            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FDF5F7] border border-[#DFC6CE] text-sm text-[#2A1720] placeholder:text-[#8E6F7B] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30 focus:bg-white"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label={isHi ? "भेजें" : "Send"}
            className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-[#9D174D] text-white hover:bg-[#831843] disabled:opacity-45 transition-colors inline-flex items-center justify-center gap-1.5 text-sm font-medium shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{isHi ? "पूछें" : "Triage"}</span>
          </button>
        </form>
      </div>
    </section>
  );
}
