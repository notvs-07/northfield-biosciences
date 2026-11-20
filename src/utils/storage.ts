import {
  createInitialMultiFarmerStore,
  DEMO_FARMER_ID,
} from "../data/seedData";
import type { FarmerWorkspaceData, MultiFarmerStore } from "../types";

const MULTI_STORAGE_KEY = "pashuraksha_ai_store_v2";

export function loadMultiFarmerStore(): MultiFarmerStore {
  if (typeof window === "undefined") {
    return createInitialMultiFarmerStore();
  }
  try {
    const raw = window.localStorage.getItem(MULTI_STORAGE_KEY);
    if (!raw) {
      const seed = createInitialMultiFarmerStore();
      window.localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }

    const parsed = JSON.parse(raw) as Partial<MultiFarmerStore>;
    const seed = createInitialMultiFarmerStore();

    const farmers: Record<string, FarmerWorkspaceData> =
      parsed.farmers && typeof parsed.farmers === "object"
        ? parsed.farmers
        : seed.farmers;

    if (!farmers[DEMO_FARMER_ID]) {
      farmers[DEMO_FARMER_ID] = seed.farmers[DEMO_FARMER_ID];
    }

    const activeFarmerId =
      typeof parsed.activeFarmerId === "string" && farmers[parsed.activeFarmerId]
        ? parsed.activeFarmerId
        : null;

    const vetAlerts = Array.isArray(parsed.vetAlerts)
      ? parsed.vetAlerts.map((alert) => ({
          ...alert,
          farmerId: alert.farmerId || DEMO_FARMER_ID,
          farmerName: alert.farmerName || "Ramesh Patel",
          farmerVillage: alert.farmerVillage || "Sehore Village",
        }))
      : seed.vetAlerts;

    const villagePreventionAlerts = Array.isArray(parsed.villagePreventionAlerts)
      ? parsed.villagePreventionAlerts
      : [];

    return {
      activeFarmerId,
      farmers,
      vetAlerts,
      villagePreventionAlerts,
    };
  } catch {
    return createInitialMultiFarmerStore();
  }
}

export function saveMultiFarmerStore(store: MultiFarmerStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetMultiFarmerStore(): MultiFarmerStore {
  const seed = createInitialMultiFarmerStore();
  saveMultiFarmerStore(seed);
  return seed;
}

export function normalizeFarmerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function findDuplicateFarmer(
  candidateName: string,
  farmers: Record<string, FarmerWorkspaceData>
): FarmerWorkspaceData | undefined {
  const target = normalizeFarmerName(candidateName);
  if (!target) return undefined;
  return Object.values(farmers).find(
    (f) => normalizeFarmerName(f.profile.uniqueName) === target
  );
}

export function suggestUniqueFarmerNames(
  baseName: string,
  village: string,
  farmers: Record<string, FarmerWorkspaceData>
): string[] {
  const cleanBase = baseName.trim().replace(/\s+/g, " ").replace(/_\d+$/, "");
  const existingSet = new Set(
    Object.values(farmers).map((f) => normalizeFarmerName(f.profile.uniqueName))
  );

  const suggestions: string[] = [];

  // 1. Numeric suffix suggestion (_02, _03, ...)
  for (let i = 2; i <= 99; i++) {
    const suffix = String(i).padStart(2, "0");
    const candidate = `${cleanBase}_${suffix}`;
    if (!existingSet.has(normalizeFarmerName(candidate))) {
      suggestions.push(candidate);
      break;
    }
  }

  // 2. Village initial or _K suffix suggestion
  const villageInitial = village
    .trim()
    .replace(/[^a-zA-Z]/g, "")
    .charAt(0)
    .toUpperCase();
  const initialCandidate = `${cleanBase}_${villageInitial || "K"}`;
  if (
    !existingSet.has(normalizeFarmerName(initialCandidate)) &&
    !suggestions.includes(initialCandidate)
  ) {
    suggestions.push(initialCandidate);
  }

  return suggestions;
}
