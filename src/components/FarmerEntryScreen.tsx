import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  MapPin,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import cowGangaImg from "../assets/images/cow_ganga_1794576066416.jpg";
import familyCattleImg from "../assets/images/family_cattle_bond_1794593491283.jpg";
import goatMotiImg from "../assets/images/goat_moti_1794576066279.jpg";
import dairyCareImg from "../assets/images/vet_care_scene_1794592168976.jpg";
import type { FarmerWorkspaceData, LanguageCode } from "../types";
import {
  findDuplicateFarmer,
  suggestUniqueFarmerNames,
} from "../utils/storage";
import { ListenButton } from "./ListenButton";

interface FarmerEntryScreenProps {
  farmers: Record<string, FarmerWorkspaceData>;
  language: LanguageCode;
  onSelectExistingFarmer: (farmerId: string) => void;
  onRegisterNewFarmer: (uniqueName: string, village: string) => void;
}

interface VisualCardProps {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
}

function ShowcasePhotoCard({ src, alt, title, subtitle }: VisualCardProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl overflow-hidden flex flex-col">
      <div className="aspect-[4/3] w-full bg-[#F8EAEF] relative overflow-hidden">
        {failed ? (
          <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#4A2E3A] bg-gradient-to-br from-[#F9ECEF] to-[#F2DFE5]">
            {title}
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-[#2A1720]">{title}</p>
        <p className="text-xs text-[#634853] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export function FarmerEntryScreen({
  farmers,
  language,
  onSelectExistingFarmer,
  onRegisterNewFarmer,
}: FarmerEntryScreenProps) {
  const [farmerName, setFarmerName] = useState("");
  const [village, setVillage] = useState("");
  const [duplicateTarget, setDuplicateTarget] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const isHi = language === "hi";

  const savedFarmerList = useMemo(() => {
    return Object.values(farmers).sort((a, b) => {
      if (a.profile.isDemo && !b.profile.isDemo) return -1;
      if (!a.profile.isDemo && b.profile.isDemo) return 1;
      return b.profile.createdAt.localeCompare(a.profile.createdAt);
    });
  }, [farmers]);

  const liveDuplicate = useMemo(() => {
    if (!farmerName.trim()) return undefined;
    return findDuplicateFarmer(farmerName, farmers);
  }, [farmerName, farmers]);

  const activeDuplicateName =
    duplicateTarget || (liveDuplicate ? farmerName.trim() : null);

  const suggestedNames = useMemo(() => {
    if (!activeDuplicateName) return [];
    return suggestUniqueFarmerNames(activeDuplicateName, village, farmers);
  }, [activeDuplicateName, village, farmers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = farmerName.trim().replace(/\s+/g, " ");
    const trimmedVillage = village.trim().replace(/\s+/g, " ");

    if (!trimmedName) {
      setFormError(isHi ? "नाम दर्ज करें" : "Enter farmer name");
      return;
    }
    if (!trimmedVillage) {
      setFormError(isHi ? "गाँव दर्ज करें" : "Enter village name");
      return;
    }

    const existing = findDuplicateFarmer(trimmedName, farmers);
    if (existing) {
      setDuplicateTarget(trimmedName);
      setFormError(null);
      return;
    }

    setDuplicateTarget(null);
    setFormError(null);
    onRegisterNewFarmer(trimmedName, trimmedVillage);
  };

  const handleApplySuggestion = (suggested: string) => {
    setFarmerName(suggested);
    setDuplicateTarget(null);
    setFormError(null);
  };

  return (
    <div className="max-w-6xl mx-auto py-3 sm:py-6 space-y-6">
      {/* Hero Split: Family & Cattle Bond Photography + Farmer Entry Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Farmer Family & Cattle Bond Visual Hero */}
        <section className="lg:col-span-7 relative rounded-2xl overflow-hidden border border-[#ECD8DE] bg-[#3B1E2A] min-h-[270px] sm:min-h-[360px]">
          {heroImgFailed ? (
            <div className="w-full h-full bg-gradient-to-br from-[#9D174D] to-[#4A1728]" />
          ) : (
            <img
              src={familyCattleImg}
              alt="Indian farming family standing affectionately with their Gir cow and goat like family"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full lg:h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2A101B]/85 via-[#2A101B]/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-white">
            <p className="text-xs font-medium tracking-wide text-white/90">
              {isHi ? "पशु हमारे परिवार" : "Cattle Are Family"}
            </p>
            <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight mt-1 text-balance">
              {isHi ? "परिवार जैसी पशु देखभाल" : "Care Like Your Family"}
            </h1>
          </div>
        </section>

        {/* Right: Clean Farmer Name & Village Entry Form */}
        <section className="lg:col-span-5 bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-2.5 pb-4 border-b border-[#F3E4E9]">
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-[#9D174D] shrink-0" />
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[#2A1720]">
                  {isHi ? "किसान विवरण दर्ज करें" : "Enter Farm Details"}
                </h2>
                <p className="text-xs text-[#634853]">
                  {isHi ? "अलग पशु रिकॉर्ड" : "Separate Herd Records"}
                </p>
              </div>
            </div>
            <ListenButton
              language={language}
              text={
                isHi
                  ? "अपना नाम और गाँव लिखें और डैशबोर्ड खोलें दबाएं।"
                  : "Enter your name and village, then tap Open Farm Dashboard."
              }
            />
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="farmer-name-input"
                className="block text-xs font-medium text-[#4A2E3A] mb-1.5"
              >
                {isHi ? "किसान का नाम" : "Farmer Name"}
              </label>
              <input
                id="farmer-name-input"
                type="text"
                value={farmerName}
                onChange={(e) => {
                  setFarmerName(e.target.value);
                  setDuplicateTarget(null);
                  setFormError(null);
                }}
                placeholder={isHi ? "जैसे Ramesh_02" : "e.g., Ramesh_02"}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#FDF7F8] border text-sm text-[#2A1720] placeholder:text-[#8E6F7B] focus:outline-none focus:ring-2 ${
                  activeDuplicateName
                    ? "border-[#D97706] focus:ring-[#D97706]/30 bg-[#FFFDF7]"
                    : "border-[#DFC6CE] focus:ring-[#9D174D]/30 focus:bg-white"
                }`}
              />
            </div>

            {/* Smart Duplicate Name Detection (Required EN + HI guidance & one-click suggestion) */}
            {activeDuplicateName && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] space-y-2.5"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs leading-relaxed text-[#78350F]">
                    <p className="font-medium">
                      A farmer with this name is already registered. Please add a
                      unique suffix, initial, or number to your name (e.g.,{" "}
                      <span className="font-mono font-semibold">Ramesh_02</span>{" "}
                      or{" "}
                      <span className="font-mono font-semibold">Ramesh_K</span>)
                      so your cattle and health records stay separate.
                    </p>
                    <p className="text-[11px] text-[#92400E]">
                      इस नाम से एक किसान पहले से पंजीकृत है। कृपया अपने नाम के
                      साथ कोई विशिष्ट प्रत्यय, अक्षर या संख्या जोड़ें (जैसे{" "}
                      <span className="font-mono font-semibold">Ramesh_02</span>{" "}
                      या{" "}
                      <span className="font-mono font-semibold">Ramesh_K</span>)
                      ताकि आपके पशुओं और स्वास्थ्य के रिकॉर्ड अलग रहें।
                    </p>
                  </div>
                </div>

                {suggestedNames.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    {suggestedNames.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleApplySuggestion(suggestion)}
                        className="min-h-[34px] px-3 py-1 rounded-lg bg-white border border-[#F59E0B] text-xs font-mono font-semibold text-[#92400E] hover:bg-[#FEF3C7] transition-colors cursor-pointer"
                      >
                        {isHi ? `"${suggestion}" चुनें` : `Use "${suggestion}"`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="farmer-village-input"
                className="block text-xs font-medium text-[#4A2E3A] mb-1.5"
              >
                {isHi ? "गाँव का नाम" : "Village Name"}
              </label>
              <input
                id="farmer-village-input"
                type="text"
                value={village}
                onChange={(e) => {
                  setVillage(e.target.value);
                  setFormError(null);
                }}
                placeholder={isHi ? "जैसे सीहोर" : "e.g., Sehore"}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#FDF7F8] border border-[#DFC6CE] text-sm text-[#2A1720] placeholder:text-[#8E6F7B] focus:outline-none focus:ring-2 focus:ring-[#9D174D]/30 focus:bg-white"
              />
            </div>

            {formError && (
              <p className="text-xs font-medium text-[#B91C1C]">{formError}</p>
            )}

            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#9D174D] text-white text-sm font-medium hover:bg-[#831843] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isHi ? "डैशबोर्ड खोलें" : "Open Farm Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>

      {/* 3-Card Family & Livestock Photography Showcase (3–4 word captions) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ShowcasePhotoCard
          src={dairyCareImg}
          alt="Fresh milk cans and Gir dairy cow in morning sun"
          title={isHi ? "परिवार जैसा स्नेह" : "Family Bond & Milk"}
          subtitle={isHi ? "सुबह व शाम माप" : "Morning & Evening Logs"}
        />
        <ShowcasePhotoCard
          src={cowGangaImg}
          alt="Healthy Indian Gir cow in dairy courtyard"
          title={isHi ? "स्वस्थ परिवार के पशु" : "Healthy Family Herd"}
          subtitle={isHi ? "समय पर टीका याद" : "Timely Vaccine Care"}
        />
        <ShowcasePhotoCard
          src={goatMotiImg}
          alt="Indian Jamunapari goat in farm pen"
          title={isHi ? "हर पल सुरक्षित साथ" : "Always Safe Together"}
          subtitle={isHi ? "तुरंत वेट सहायता" : "Quick Vet Support"}
        />
      </div>

      {/* Saved Farm Profiles Switcher */}
      <section className="bg-[#FFFCFC] border border-[#ECD8DE] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F3E4E9]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#9D174D] shrink-0" />
            <h2 className="text-sm sm:text-base font-semibold text-[#2A1720]">
              {isHi ? "सहेजे गए किसान" : "Saved Farm Profiles"}
            </h2>
          </div>
          <span className="text-xs text-[#634853]">
            {isHi ? "चुनने के लिए दबाएं" : "Tap To Switch"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {savedFarmerList.map((entry) => {
            const { profile, animals } = entry;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => onSelectExistingFarmer(profile.id)}
                className="p-3.5 rounded-xl border border-[#ECD8DE] bg-[#FDF7F8] hover:border-[#9D174D] hover:bg-[#F9EAEF] transition-colors text-left flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#9D174D] shrink-0" />
                    <p className="text-sm font-semibold text-[#2A1720] truncate">
                      {profile.uniqueName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#634853] mt-0.5 pl-5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{profile.village}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums shrink-0">
                      {animals.length}{" "}
                      {isHi ? "पशु" : animals.length === 1 ? "animal" : "animals"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#634853] shrink-0" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
