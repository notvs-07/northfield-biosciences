import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { LanguageCode } from "../types";
import { canUseSpeechSynthesis, speakText, stopSpeaking } from "../utils/i18n";

interface ListenButtonProps {
  text: string;
  language: LanguageCode;
  label?: string;
}

export function ListenButton({ text, language, label }: ListenButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  if (!canUseSpeechSynthesis()) return null;

  const isHi = language === "hi";
  const buttonLabel =
    label || (speaking ? (isHi ? "रोकें" : "Stop") : isHi ? "सुनें" : "Listen");

  const handleToggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speakText(text, language, () => setSpeaking(false));
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={buttonLabel}
      className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
        speaking
          ? "bg-[#9D174D] text-white border-[#9D174D]"
          : "bg-[#F8EAEF] text-[#3B212C] border-[#E4CDD4] hover:bg-[#F2DFE5]"
      }`}
    >
      {speaking ? (
        <VolumeX className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{buttonLabel}</span>
    </button>
  );
}
