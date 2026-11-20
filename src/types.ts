export type WorkspaceRole = "farmer" | "vet";
export type LanguageCode = "en" | "hi";

export type AnimalSpecies = "Cow" | "Goat" | "Buffalo";
export type AnimalHealthState = "Healthy" | "Under Observation" | "Emergency";

export interface FarmerProfile {
  id: string;
  uniqueName: string;
  village: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface Animal {
  id: string;
  name: string;
  nameHi: string;
  species: AnimalSpecies;
  breed: string;
  earTag: string;
  ageYears: number;
  weightKg: number;
  status: string;
  healthState: AnimalHealthState;
  shedLocation: string;
  photoUrl?: string;
}

export interface MilkLog {
  id: string;
  animalId: string;
  date: string; // YYYY-MM-DD
  session: "Morning" | "Evening";
  liters: number;
  fatPercent?: number;
  notes?: string;
  notesHi?: string;
}

export type VaccinationStatus = "Upcoming" | "Due Soon" | "Completed";

export interface VaccinationReminder {
  id: string;
  animalId: string;
  vaccineName: string;
  vaccineNameHi: string;
  dueDate: string; // YYYY-MM-DD
  status: VaccinationStatus;
  completedDate?: string;
  notes?: string;
}

export type AlertSeverity = "urgent" | "emergency";
export type AlertWorkflowStatus = "Pending Vet Review" | "Vet Dispatched" | "Resolved";

export interface VetAlert {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerVillage: string;
  animalId: string;
  createdAt: string; // ISO string
  severity: AlertSeverity;
  source: "Farmer Report" | "AI Symptom Triage";
  title: string;
  titleHi?: string;
  suspectedCategory: string;
  symptoms: string;
  symptomsHi?: string;
  aiSafeCareAdvice: string[];
  aiSafeCareAdviceHi?: string[];
  redFlags: string[];
  redFlagsHi?: string[];
  status: AlertWorkflowStatus;
  vetNotes?: string;
  resolvedAt?: string;
}

export type TriageUrgency = "routine" | "moderate" | "urgent" | "emergency";
export type HomeRemedySafety = "none" | "safe_supportive" | "caution" | "harmful";

export interface TriageMessage {
  id: string;
  role: "user" | "assistant";
  language: LanguageCode;
  animalId: string;
  timestamp: string;
  text: string;
  textHi?: string;
  urgencyLevel?: TriageUrgency;
  shouldEscalate?: boolean;
  escalatedAlertId?: string;
  alertTitle?: string;
  suspectedCategory?: string;
  safeCareSteps?: string[];
  safeCareStepsHi?: string[];
  redFlags?: string[];
  redFlagsHi?: string[];
  homeRemedyDetected?: boolean;
  homeRemedySafety?: HomeRemedySafety;
  homeRemedyAdvice?: string;
}

export interface VillagePreventionAlert {
  id: string;
  village: string;
  category: string;
  affectedAnimalCount: number;
  messageEn: string;
  messageHi: string;
  sentAt: string;
}

export interface FarmerWorkspaceData {
  profile: FarmerProfile;
  animals: Animal[];
  milkLogs: MilkLog[];
  vaccinations: VaccinationReminder[];
  triageHistory: TriageMessage[];
}

export interface MultiFarmerStore {
  activeFarmerId: string | null;
  farmers: Record<string, FarmerWorkspaceData>;
  vetAlerts: VetAlert[];
  villagePreventionAlerts: VillagePreventionAlert[];
}
