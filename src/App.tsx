import { useEffect, useState } from "react";
import { RotateCcw, ShieldPlus } from "lucide-react";
import { FarmerEntryScreen } from "./components/FarmerEntryScreen";
import { FarmerView } from "./components/FarmerView";
import { VetDashboard } from "./components/VetDashboard";
import {
  createBlankFarmerData,
  createWelcomeTriageMessage,
  DEMO_FARMER_ID,
} from "./data/seedData";
import type {
  AlertWorkflowStatus,
  Animal,
  FarmerProfile,
  FarmerWorkspaceData,
  LanguageCode,
  MilkLog,
  MultiFarmerStore,
  TriageMessage,
  VaccinationReminder,
  VetAlert,
  VillagePreventionAlert,
  WorkspaceRole,
} from "./types";
import {
  loadMultiFarmerStore,
  resetMultiFarmerStore,
  saveMultiFarmerStore,
} from "./utils/storage";

export default function App() {
  const [store, setStore] = useState<MultiFarmerStore>(() =>
    loadMultiFarmerStore()
  );
  const [activeRole, setActiveRole] = useState<WorkspaceRole>("farmer");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(() => {
    const initial = loadMultiFarmerStore();
    const active = initial.activeFarmerId
      ? initial.farmers[initial.activeFarmerId]
      : undefined;
    return active?.animals[0]?.id || "";
  });

  useEffect(() => {
    saveMultiFarmerStore(store);
  }, [store]);

  const activeFarmer: FarmerWorkspaceData | null = store.activeFarmerId
    ? store.farmers[store.activeFarmerId] || null
    : null;

  const activeAlertsCount = store.vetAlerts.filter(
    (a) => a.status !== "Resolved"
  ).length;

  const isHi = language === "hi";

  const updateActiveFarmerData = (
    updater: (current: FarmerWorkspaceData) => FarmerWorkspaceData
  ) => {
    setStore((prev) => {
      if (!prev.activeFarmerId || !prev.farmers[prev.activeFarmerId]) {
        return prev;
      }
      const current = prev.farmers[prev.activeFarmerId];
      return {
        ...prev,
        farmers: {
          ...prev.farmers,
          [prev.activeFarmerId]: updater(current),
        },
      };
    });
  };

  const handleSelectExistingFarmer = (farmerId: string) => {
    const target = store.farmers[farmerId];
    if (!target) return;
    setStore((prev) => ({
      ...prev,
      activeFarmerId: farmerId,
    }));
    setSelectedAnimalId(target.animals[0]?.id || "");
  };

  const handleRegisterNewFarmer = (uniqueName: string, village: string) => {
    const slug = uniqueName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const id = `farmer-${slug || "user"}-${Date.now()}`;
    const newProfile: FarmerProfile = {
      id,
      uniqueName,
      village,
      createdAt: new Date().toISOString(),
    };
    const blankData = createBlankFarmerData(newProfile);

    setStore((prev) => ({
      ...prev,
      activeFarmerId: id,
      farmers: {
        ...prev.farmers,
        [id]: blankData,
      },
    }));
    setSelectedAnimalId("");
  };

  const handleSwitchFarmer = () => {
    setStore((prev) => ({
      ...prev,
      activeFarmerId: null,
    }));
    setSelectedAnimalId("");
  };

  const handleAddAnimal = (animalInput: Omit<Animal, "id">) => {
    const newAnimal: Animal = {
      ...animalInput,
      id: `animal-${Date.now()}`,
    };
    updateActiveFarmerData((curr) => ({
      ...curr,
      animals: [...curr.animals, newAnimal],
    }));
    setSelectedAnimalId(newAnimal.id);
  };

  const handleAddMilkLog = (entry: Omit<MilkLog, "id">) => {
    const newLog: MilkLog = {
      ...entry,
      id: `milk-${Date.now()}`,
    };
    updateActiveFarmerData((curr) => ({
      ...curr,
      milkLogs: [newLog, ...curr.milkLogs],
    }));
  };

  const handleDeleteMilkLog = (id: string) => {
    updateActiveFarmerData((curr) => ({
      ...curr,
      milkLogs: curr.milkLogs.filter((l) => l.id !== id),
    }));
  };

  const handleToggleVaccinationStatusForFarmer = (
    farmerId: string,
    vaccinationId: string
  ) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    setStore((prev) => {
      const targetFarmer = prev.farmers[farmerId];
      if (!targetFarmer) return prev;
      return {
        ...prev,
        farmers: {
          ...prev.farmers,
          [farmerId]: {
            ...targetFarmer,
            vaccinations: targetFarmer.vaccinations.map((v) => {
              if (v.id !== vaccinationId) return v;
              if (v.status === "Completed") {
                return {
                  ...v,
                  status: "Upcoming",
                  completedDate: undefined,
                };
              }
              return {
                ...v,
                status: "Completed",
                completedDate: todayStr,
              };
            }),
          },
        },
      };
    });
  };

  const handleAddVaccination = (
    reminder: Omit<VaccinationReminder, "id" | "status">
  ) => {
    const dueMs = new Date(reminder.dueDate).getTime();
    const diffDays = Math.ceil((dueMs - Date.now()) / (1000 * 60 * 60 * 24));
    const newVax: VaccinationReminder = {
      ...reminder,
      id: `vax-${Date.now()}`,
      status: diffDays <= 5 ? "Due Soon" : "Upcoming",
    };
    updateActiveFarmerData((curr) => ({
      ...curr,
      vaccinations: [...curr.vaccinations, newVax],
    }));
  };

  const handleAddTriageMessages = (messages: TriageMessage[]) => {
    updateActiveFarmerData((curr) => ({
      ...curr,
      triageHistory: [...curr.triageHistory, ...messages],
    }));
  };

  const handleClearTriageHistory = () => {
    updateActiveFarmerData((curr) => ({
      ...curr,
      triageHistory: [
        createWelcomeTriageMessage(
          curr.profile.uniqueName,
          curr.animals[0]?.id || ""
        ),
      ],
    }));
  };

  const handleEscalateToVet = (
    alertInput: Omit<
      VetAlert,
      "id" | "createdAt" | "status" | "farmerId" | "farmerName" | "farmerVillage"
    >
  ): VetAlert => {
    const farmerProfile = activeFarmer?.profile || {
      id: DEMO_FARMER_ID,
      uniqueName: "Ramesh Patel",
      village: "Sehore Village",
    };

    const created: VetAlert = {
      ...alertInput,
      id: `alert-${Date.now()}`,
      farmerId: farmerProfile.id,
      farmerName: farmerProfile.uniqueName,
      farmerVillage: farmerProfile.village,
      createdAt: new Date().toISOString(),
      status: "Pending Vet Review",
    };

    setStore((prev) => {
      const targetFarmer = prev.farmers[farmerProfile.id];
      const updatedFarmer = targetFarmer
        ? {
            ...targetFarmer,
            animals: targetFarmer.animals.map((a) =>
              a.id === alertInput.animalId
                ? {
                    ...a,
                    healthState:
                      alertInput.severity === "emergency"
                        ? ("Emergency" as const)
                        : ("Under Observation" as const),
                  }
                : a
            ),
          }
        : undefined;

      return {
        ...prev,
        vetAlerts: [created, ...prev.vetAlerts],
        farmers: updatedFarmer
          ? {
              ...prev.farmers,
              [farmerProfile.id]: updatedFarmer,
            }
          : prev.farmers,
      };
    });

    return created;
  };

  const handleUpdateAlertStatus = (
    alertId: string,
    status: AlertWorkflowStatus
  ) => {
    setStore((prev) => {
      const updatedAlerts = prev.vetAlerts.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status,
              resolvedAt:
                status === "Resolved" ? new Date().toISOString() : undefined,
            }
          : a
      );

      const targetAlert = prev.vetAlerts.find((a) => a.id === alertId);
      if (!targetAlert) {
        return { ...prev, vetAlerts: updatedAlerts };
      }

      const targetFarmer = prev.farmers[targetAlert.farmerId];
      if (!targetFarmer) {
        return { ...prev, vetAlerts: updatedAlerts };
      }

      const updatedAnimals = targetFarmer.animals.map((animal) => {
        if (animal.id !== targetAlert.animalId) return animal;
        const remainingOpen = updatedAlerts.filter(
          (al) =>
            al.farmerId === targetAlert.farmerId &&
            al.animalId === animal.id &&
            al.status !== "Resolved"
        );
        if (remainingOpen.length === 0) {
          return { ...animal, healthState: "Healthy" as const };
        }
        const hasEmergency = remainingOpen.some(
          (al) => al.severity === "emergency"
        );
        return {
          ...animal,
          healthState: hasEmergency
            ? ("Emergency" as const)
            : ("Under Observation" as const),
        };
      });

      return {
        ...prev,
        vetAlerts: updatedAlerts,
        farmers: {
          ...prev.farmers,
          [targetAlert.farmerId]: {
            ...targetFarmer,
            animals: updatedAnimals,
          },
        },
      };
    });
  };

  const handleSaveVetNotes = (alertId: string, notes: string) => {
    setStore((prev) => ({
      ...prev,
      vetAlerts: prev.vetAlerts.map((a) =>
        a.id === alertId ? { ...a, vetNotes: notes } : a
      ),
    }));
  };

  const handleSendVillagePreventionAlert = (
    payload: Omit<VillagePreventionAlert, "id" | "sentAt">
  ) => {
    const newAdvisory: VillagePreventionAlert = {
      ...payload,
      id: `vpa-${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
    setStore((prev) => {
      const filtered = prev.villagePreventionAlerts.filter(
        (existing) =>
          !(
            existing.village.trim().toLowerCase() ===
              payload.village.trim().toLowerCase() &&
            existing.category === payload.category
          )
      );
      return {
        ...prev,
        villagePreventionAlerts: [newAdvisory, ...filtered],
      };
    });
  };

  const handleResetDemo = () => {
    const fresh = resetMultiFarmerStore();
    setStore(fresh);
    setSelectedAnimalId("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF5F7] text-[#2A1720]">
      {/* Top Bar: Single-Row Responsive Navigation with Role Toggle */}
      <header className="sticky top-0 z-30 h-14 bg-[#FFFCFC]/95 backdrop-blur-md border-b border-[#ECD8DE]">
        <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <ShieldPlus className="w-5 h-5 text-[#9D174D] shrink-0" />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#2A1720] whitespace-nowrap">
              {isHi ? "नॉर्थफ़ील्ड बायोसाइंसेज़" : "NorthField Biosciences"}
            </span>
          </div>

          {/* Primary Role Toggle: Farmer View | Veterinarian Dashboard */}
          <div
            role="tablist"
            aria-label="Workspace role toggle"
            className="flex items-center p-1 bg-[#F5E4EA] rounded-xl shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeRole === "farmer"}
              onClick={() => setActiveRole("farmer")}
              className={`min-h-[34px] px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeRole === "farmer"
                  ? "bg-white text-[#2A1720] shadow-xs"
                  : "text-[#634853] hover:text-[#2A1720]"
              }`}
            >
              {isHi ? "किसान भाग" : "Farmer View"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeRole === "vet"}
              onClick={() => setActiveRole("vet")}
              className={`min-h-[34px] px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                activeRole === "vet"
                  ? "bg-white text-[#9D174D] shadow-xs"
                  : "text-[#634853] hover:text-[#2A1720]"
              }`}
            >
              <span className="hidden sm:inline">
                {isHi ? "पशु डॉक्टर डैशबोर्ड" : "Veterinarian Dashboard"}
              </span>
              <span className="sm:hidden">{isHi ? "डॉक्टर" : "Vet Dash"}</span>
              {activeAlertsCount > 0 && (
                <span className="font-mono tabular-nums text-[11px] font-semibold text-[#B91C1C]">
                  ({activeAlertsCount})
                </span>
              )}
            </button>
          </div>

          {/* Global Language Toggle */}
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            aria-label="Toggle English or Hindi language"
            className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#E4CDD4] bg-white text-xs font-medium text-[#3B212C] hover:bg-[#FDF5F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {language === "en" ? "हिंदी" : "EN"}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-5">
        {activeRole === "farmer" ? (
          activeFarmer ? (
            <FarmerView
              farmerProfile={activeFarmer.profile}
              animals={activeFarmer.animals}
              milkLogs={activeFarmer.milkLogs}
              vaccinations={activeFarmer.vaccinations}
              vetAlerts={store.vetAlerts}
              villagePreventionAlerts={store.villagePreventionAlerts}
              triageHistory={activeFarmer.triageHistory}
              selectedAnimalId={
                activeFarmer.animals.some((a) => a.id === selectedAnimalId)
                  ? selectedAnimalId
                  : activeFarmer.animals[0]?.id || ""
              }
              language={language}
              onSelectAnimal={setSelectedAnimalId}
              onChangeLanguage={setLanguage}
              onSwitchFarmer={handleSwitchFarmer}
              onAddAnimal={handleAddAnimal}
              onAddMilkLog={handleAddMilkLog}
              onDeleteMilkLog={handleDeleteMilkLog}
              onToggleVaccinationStatus={(vaxId) =>
                handleToggleVaccinationStatusForFarmer(
                  activeFarmer.profile.id,
                  vaxId
                )
              }
              onAddVaccination={handleAddVaccination}
              onAddTriageMessages={handleAddTriageMessages}
              onClearTriageHistory={handleClearTriageHistory}
              onEscalateToVet={handleEscalateToVet}
              onOpenVetDashboard={() => setActiveRole("vet")}
            />
          ) : (
            <FarmerEntryScreen
              farmers={store.farmers}
              language={language}
              onSelectExistingFarmer={handleSelectExistingFarmer}
              onRegisterNewFarmer={handleRegisterNewFarmer}
            />
          )
        ) : (
          <VetDashboard
            farmers={store.farmers}
            vetAlerts={store.vetAlerts}
            villagePreventionAlerts={store.villagePreventionAlerts}
            language={language}
            onUpdateAlertStatus={handleUpdateAlertStatus}
            onSaveVetNotes={handleSaveVetNotes}
            onToggleVaccinationStatus={handleToggleVaccinationStatusForFarmer}
            onSendVillagePreventionAlert={handleSendVillagePreventionAlert}
          />
        )}
      </main>

      {/* Quiet Footer with Local Storage Notice & Reset Demo Action */}
      <footer className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 border-t border-[#ECD8DE] flex flex-wrap items-center justify-between gap-2 text-xs text-[#634853]">
        <span>
          {isHi
            ? "नॉर्थफ़ील्ड बायोसाइंसेज़ · सारा डेटा आपके फ़ोन या कंप्यूटर में सुरक्षित है"
            : "NorthField Biosciences · All farm & cattle records saved locally"}
        </span>
        <button
          type="button"
          onClick={handleResetDemo}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A2E3A] hover:text-[#2A1720] transition-colors cursor-pointer py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isHi ? "नया रीसेट करें" : "Reset Sample Data"}</span>
        </button>
      </footer>
    </div>
  );
}
