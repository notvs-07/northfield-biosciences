import type {
  AlertWorkflowStatus,
  AnimalHealthState,
  AnimalSpecies,
  LanguageCode,
} from "../types";

export function translateSpecies(species: AnimalSpecies, lang: LanguageCode): string {
  if (lang === "en") return species;
  switch (species) {
    case "Cow":
      return "गाय";
    case "Goat":
      return "बकरी";
    case "Buffalo":
      return "भैंस";
  }
}

export function translateHealthState(
  state: AnimalHealthState,
  lang: LanguageCode
): string {
  if (lang === "en") return state;
  switch (state) {
    case "Healthy":
      return "स्वस्थ";
    case "Under Observation":
      return "निगरानी में";
    case "Emergency":
      return "तुरंत मदद ज़रूरी";
  }
}

export function translateAlertStatus(
  status: AlertWorkflowStatus,
  lang: LanguageCode
): string {
  if (lang === "en") return status;
  switch (status) {
    case "Pending Vet Review":
      return "डॉक्टर देख रहे हैं";
    case "Vet Dispatched":
      return "डॉक्टर आ रहे हैं";
    case "Resolved":
      return "ठीक हो गया";
  }
}

export function translateAlertSource(
  source: "Farmer Report" | "AI Symptom Triage",
  lang: LanguageCode
): string {
  if (lang === "en") return source;
  return source === "AI Symptom Triage" ? "AI जांच से" : "किसान द्वारा";
}

export function formatRelativeTime(isoString: string, lang: LanguageCode): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) {
    return lang === "hi" ? `${mins} मिनट पहले` : `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return lang === "hi" ? `${hrs} घंटे पहले` : `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  return lang === "hi" ? `${days} दिन पहले` : `${days}d ago`;
}

export function canUseSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (canUseSpeechSynthesis()) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(
  text: string,
  lang: LanguageCode,
  onEnd?: () => void
): void {
  if (!canUseSpeechSynthesis() || !text.trim()) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
  utterance.rate = 0.92;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((v) =>
    v.lang.toLowerCase().startsWith(lang === "hi" ? "hi" : "en")
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  window.speechSynthesis.speak(utterance);
}
