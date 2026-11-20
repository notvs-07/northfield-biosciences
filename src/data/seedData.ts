import cowGangaImg from "../assets/images/cow_ganga_1794576066416.jpg";
import goatMotiImg from "../assets/images/goat_moti_1794576066279.jpg";
import type {
  FarmerProfile,
  FarmerWorkspaceData,
  MultiFarmerStore,
  TriageMessage,
  VetAlert,
} from "../types";

export const DEMO_FARMER_ID = "farmer-ramesh-patel";

function formatLocalDateOffset(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function createWelcomeTriageMessage(
  farmerName: string,
  defaultAnimalId = ""
): TriageMessage {
  return {
    id: `msg-welcome-${Date.now()}`,
    role: "assistant",
    language: "en",
    animalId: defaultAnimalId,
    timestamp: isoHoursAgo(0),
    text: `Namaste ${farmerName}! I am NorthField Biosciences AI. Describe any animal symptoms in English or हिंदी. I provide safe non-medicinal care guidance and automatically escalate urgent cases to the Veterinarian Dashboard.`,
    textHi: `नमस्ते ${farmerName}! मैं नॉर्थफ़ील्ड बायोसाइंसेज़ मददगार हूँ। अपने पशु की कोई भी तकलीफ़ लिखें या बोलें। मैं बिना दवा की सुरक्षित देखभाल बताऊँगा और गंभीर होने पर सीधे डॉक्टर को खबर भेजूँगा।`,
    urgencyLevel: "routine",
    shouldEscalate: false,
    suspectedCategory: "Triage Ready",
    safeCareSteps: [
      "Select an animal above before describing symptoms so milk and profile context is included.",
      "Share changes in appetite, cud chewing, udder warmth, temperature, or breathing.",
    ],
    safeCareStepsHi: [
      "पूछने से पहले ऊपर अपना पशु चुनें।",
      "भूख कम लगना, जुगाली बंद होना, थन में सूजन या बुखार जैसी बात बताएं।",
    ],
    redFlags: [
      "Severe bloat, breathing distress, collapse, or bloody discharge will auto-escalate to the Vet Dashboard.",
    ],
    redFlagsHi: [
      "पेट फूलना, सांस फूलना, बैठ जाना या खून आने पर तुरंत डॉक्टर को खबर जाएगी।",
    ],
  };
}

export function createDemoFarmerData(): FarmerWorkspaceData {
  const today = formatLocalDateOffset(0);
  const d1 = formatLocalDateOffset(-1);
  const d2 = formatLocalDateOffset(-2);
  const d3 = formatLocalDateOffset(-3);
  const d4 = formatLocalDateOffset(-4);
  const d5 = formatLocalDateOffset(-5);
  const d6 = formatLocalDateOffset(-6);

  return {
    profile: {
      id: DEMO_FARMER_ID,
      uniqueName: "Ramesh Patel",
      village: "Sehore Village",
      createdAt: isoHoursAgo(48),
      isDemo: true,
    },
    animals: [
      {
        id: "animal-ganga",
        name: "Ganga",
        nameHi: "गंगा",
        species: "Cow",
        breed: "Gir",
        earTag: "PR-101",
        ageYears: 4,
        weightKg: 420,
        status: "Lactating",
        healthState: "Healthy",
        shedLocation: "Shed A · Stall 1",
        photoUrl: cowGangaImg,
      },
      {
        id: "animal-moti",
        name: "Moti",
        nameHi: "मोती",
        species: "Goat",
        breed: "Jamunapari",
        earTag: "PR-204",
        ageYears: 2,
        weightKg: 38,
        status: "Lactating",
        healthState: "Emergency",
        shedLocation: "Pen B · Unit 3",
        photoUrl: goatMotiImg,
      },
    ],
    milkLogs: [
      {
        id: "milk-1",
        animalId: "animal-ganga",
        date: today,
        session: "Morning",
        liters: 6.8,
        fatPercent: 4.6,
        notes: "Normal appetite & steady yield",
        notesHi: "सामान्य भूख और अच्छा दूध",
      },
      {
        id: "milk-2",
        animalId: "animal-moti",
        date: today,
        session: "Morning",
        liters: 0.7,
        fatPercent: 4.1,
        notes: "Reduced output; dull & off-feed",
        notesHi: "दूध कम हुआ, सुस्त है और चारा नहीं खाया",
      },
      {
        id: "milk-3",
        animalId: "animal-ganga",
        date: d1,
        session: "Evening",
        liters: 6.1,
        fatPercent: 4.7,
      },
      {
        id: "milk-4",
        animalId: "animal-ganga",
        date: d1,
        session: "Morning",
        liters: 6.7,
        fatPercent: 4.5,
      },
      {
        id: "milk-5",
        animalId: "animal-moti",
        date: d1,
        session: "Evening",
        liters: 0.8,
        fatPercent: 4.2,
        notes: "Slight dip noticed in evening",
        notesHi: "शाम को दूध थोड़ा कम हुआ",
      },
      {
        id: "milk-6",
        animalId: "animal-moti",
        date: d1,
        session: "Morning",
        liters: 1.2,
        fatPercent: 4.4,
      },
      {
        id: "milk-7",
        animalId: "animal-ganga",
        date: d2,
        session: "Evening",
        liters: 6.2,
        fatPercent: 4.6,
      },
      {
        id: "milk-8",
        animalId: "animal-ganga",
        date: d2,
        session: "Morning",
        liters: 6.9,
        fatPercent: 4.5,
      },
      {
        id: "milk-9",
        animalId: "animal-moti",
        date: d2,
        session: "Evening",
        liters: 1.1,
        fatPercent: 4.3,
      },
      {
        id: "milk-10",
        animalId: "animal-moti",
        date: d2,
        session: "Morning",
        liters: 1.3,
        fatPercent: 4.4,
      },
      {
        id: "milk-11",
        animalId: "animal-ganga",
        date: d3,
        session: "Evening",
        liters: 6.0,
        fatPercent: 4.6,
      },
      {
        id: "milk-12",
        animalId: "animal-ganga",
        date: d3,
        session: "Morning",
        liters: 6.6,
        fatPercent: 4.5,
      },
      {
        id: "milk-13",
        animalId: "animal-moti",
        date: d3,
        session: "Evening",
        liters: 1.1,
        fatPercent: 4.3,
      },
      {
        id: "milk-14",
        animalId: "animal-moti",
        date: d3,
        session: "Morning",
        liters: 1.4,
        fatPercent: 4.4,
      },
      {
        id: "milk-15",
        animalId: "animal-ganga",
        date: d4,
        session: "Evening",
        liters: 6.3,
        fatPercent: 4.7,
      },
      {
        id: "milk-16",
        animalId: "animal-ganga",
        date: d4,
        session: "Morning",
        liters: 6.8,
        fatPercent: 4.6,
      },
      {
        id: "milk-17",
        animalId: "animal-moti",
        date: d4,
        session: "Evening",
        liters: 1.2,
        fatPercent: 4.3,
      },
      {
        id: "milk-18",
        animalId: "animal-moti",
        date: d4,
        session: "Morning",
        liters: 1.3,
        fatPercent: 4.5,
      },
      {
        id: "milk-19",
        animalId: "animal-ganga",
        date: d5,
        session: "Evening",
        liters: 5.9,
        fatPercent: 4.5,
      },
      {
        id: "milk-20",
        animalId: "animal-ganga",
        date: d5,
        session: "Morning",
        liters: 6.5,
        fatPercent: 4.5,
      },
      {
        id: "milk-21",
        animalId: "animal-moti",
        date: d5,
        session: "Evening",
        liters: 1.1,
        fatPercent: 4.2,
      },
      {
        id: "milk-22",
        animalId: "animal-moti",
        date: d5,
        session: "Morning",
        liters: 1.3,
        fatPercent: 4.4,
      },
      {
        id: "milk-23",
        animalId: "animal-ganga",
        date: d6,
        session: "Evening",
        liters: 6.1,
        fatPercent: 4.6,
      },
      {
        id: "milk-24",
        animalId: "animal-ganga",
        date: d6,
        session: "Morning",
        liters: 6.7,
        fatPercent: 4.5,
      },
      {
        id: "milk-25",
        animalId: "animal-moti",
        date: d6,
        session: "Evening",
        liters: 1.0,
        fatPercent: 4.3,
      },
      {
        id: "milk-26",
        animalId: "animal-moti",
        date: d6,
        session: "Morning",
        liters: 1.3,
        fatPercent: 4.4,
      },
    ],
    vaccinations: [
      {
        id: "vax-1",
        animalId: "animal-ganga",
        vaccineName: "FMD (Foot-and-Mouth Disease)",
        vaccineNameHi: "खुरपका-मुंहपका (FMD) टीका",
        dueDate: formatLocalDateOffset(3),
        status: "Due Soon",
        notes: "Biannual booster due this week",
      },
      {
        id: "vax-2",
        animalId: "animal-moti",
        vaccineName: "PPR (Peste des Petits Ruminants)",
        vaccineNameHi: "पीपीआर (बकरी प्लेग) टीका",
        dueDate: formatLocalDateOffset(6),
        status: "Upcoming",
        notes: "Wait until acute bloat resolves before vaccination",
      },
      {
        id: "vax-3",
        animalId: "animal-ganga",
        vaccineName: "HS (Hemorrhagic Septicemia)",
        vaccineNameHi: "गलघोंटू (HS) टीका",
        dueDate: formatLocalDateOffset(18),
        status: "Upcoming",
        notes: "Pre-monsoon preventive dose",
      },
      {
        id: "vax-4",
        animalId: "animal-moti",
        vaccineName: "ETV (Enterotoxaemia)",
        vaccineNameHi: "फड़फड़िया (ETV) टीका",
        dueDate: formatLocalDateOffset(-12),
        status: "Completed",
        completedDate: formatLocalDateOffset(-12),
        notes: "Administered by Block Veterinary Officer",
      },
    ],
    triageHistory: [
      {
        ...createWelcomeTriageMessage("Ramesh Patel", "animal-ganga"),
        id: "msg-welcome-demo",
        timestamp: isoHoursAgo(3),
      },
    ],
  };
}

export function createDemoVetAlert(): VetAlert {
  return {
    id: "alert-moti-bloat",
    farmerId: DEMO_FARMER_ID,
    farmerName: "Ramesh Patel",
    farmerVillage: "Sehore Village",
    animalId: "animal-moti",
    createdAt: isoHoursAgo(2),
    severity: "emergency",
    source: "AI Symptom Triage",
    title: "Acute Ruminal Bloat & Appetite Loss",
    titleHi: "तीव्र पेट फूलना (आफरा) और भूख न लगना",
    suspectedCategory: "Digestive / Bloat",
    symptoms:
      "Left flank visibly distended since morning, stopped chewing cud (rumination), restless posture, and morning milk output dropped to 0.7 L.",
    symptomsHi:
      "सुबह से बायां पेट फूला हुआ है, जुगाली बंद कर दी है, बेचैनी है और सुबह दूध घटकर 0.7 लीटर रह गया।",
    aiSafeCareAdvice: [
      "Keep Moti standing and gently walk her slowly; do not allow her to lie flat on her side.",
      "Withhold all green lush fodder and grain immediately until the veterinarian arrives.",
      "Do not force-feed any liquids or home concoctions orally to avoid choking risk.",
    ],
    aiSafeCareAdviceHi: [
      "मोती को खड़ा रखें और धीरे-धीरे टहलाएं, करवट से न लेटने दें।",
      "डॉक्टर के आने तक हरा चारा और दाना बिल्कुल बंद रखें।",
      "मुंह से ज़बरदस्ती कोई काढ़ा या पानी न पिलाएं।",
    ],
    redFlags: [
      "Open-mouth breathing or tongue protrusion",
      "Sudden collapse or inability to stand",
      "Rapid swelling on the upper left flank",
    ],
    redFlagsHi: [
      "मुंह खोलकर तेज सांस लेना या जीभ बाहर निकलना",
      "अचानक गिर जाना या खड़े न हो पाना",
      "बाएं पेट में बहुत तेज़ी से सूजन बढ़ना",
    ],
    status: "Pending Vet Review",
  };
}

export function createBlankFarmerData(profile: FarmerProfile): FarmerWorkspaceData {
  return {
    profile,
    animals: [],
    milkLogs: [],
    vaccinations: [],
    triageHistory: [createWelcomeTriageMessage(profile.uniqueName, "")],
  };
}

export function createInitialMultiFarmerStore(): MultiFarmerStore {
  const demoFarmer = createDemoFarmerData();
  return {
    activeFarmerId: null, // Show welcoming Farmer Entry screen on initial load
    farmers: {
      [DEMO_FARMER_ID]: demoFarmer,
    },
    vetAlerts: [createDemoVetAlert()],
    villagePreventionAlerts: [],
  };
}
