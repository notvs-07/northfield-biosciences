import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

interface TriageAnimalContext {
  id: string;
  name: string;
  species: string;
  breed: string;
  ageLabel: string;
  weightKg: number;
  status: string;
  recentMilkSummary?: string;
}

interface TriageHistoryItem {
  role: "user" | "assistant";
  text: string;
}

interface TriageRequestBody {
  message?: string;
  language?: "en" | "hi";
  animal?: TriageAnimalContext;
  history?: TriageHistoryItem[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post("/api/triage", async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as TriageRequestBody;
      const message = typeof body.message === "string" ? body.message.trim() : "";
      const language: "en" | "hi" = body.language === "hi" ? "hi" : "en";
      const animal = body.animal;
      const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

      if (!message) {
        res.status(400).json({
          error:
            language === "hi"
              ? "कृपया पशु के लक्षण लिखें।"
              : "Please describe the animal's symptoms or question.",
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            language === "hi"
              ? "Gemini API कुंजी कॉन्फ़िगर नहीं है। कृपया Settings > Secrets में GEMINI_API_KEY जांचें।"
              : "Gemini API key is not configured. Please check GEMINI_API_KEY in Settings > Secrets.",
        });
        return;
      }

      const animalContextText = animal
        ? `Selected Animal Profile:
- Name: ${animal.name}
- Species: ${animal.species} (${animal.breed})
- Age: ${animal.ageLabel}
- Weight: ${animal.weightKg} kg
- Reproductive/Lactation Status: ${animal.status}
- Recent Milk Trend: ${animal.recentMilkSummary || "Not reported"}`
        : "Selected Animal Profile: General herd inquiry";

      const conversationHistoryText =
        history.length > 0
          ? history
              .map((h) => `${h.role === "user" ? "Farmer" : "NorthField Biosciences"}: ${h.text}`)
              .join("\n")
          : "None";

      const targetLanguageDirective =
        language === "hi"
          ? "Respond strictly in clear, respectful, easy-to-understand Hindi (Devanagari script) for an Indian livestock farmer. Keep alertTitle concise in Hindi with an English clinical phrase in parentheses if helpful."
          : "Respond strictly in clear, respectful, practical English for an Indian livestock farmer (if the user writes in Hindi/Hinglish, you may still respond in English unless they explicitly ask for Hindi, or mirror clarity concisely).";

      const systemInstruction = `You are NorthField Biosciences AI, a specialized bilingual veterinary triage assistant for Indian dairy cows, buffaloes, and goats.

STRICT SAFETY & NON-PRESCRIPTION POLICY (NON-NEGOTIABLE):
1. You must NEVER prescribe, name, recommend, or suggest dosages for ANY medication, antibiotic, anti-inflammatory, painkiller, steroid, injection, dewormer, vaccine as active treatment, or chemical home-remedy.
2. If the farmer explicitly asks for medicine names, tablet names, or injection dosages, firmly and kindly decline, stating that only a licensed veterinarian can prescribe medicines after physically examining the animal.
3. Provide ONLY safe, non-medicinal supportive first-aid and animal husbandry care (e.g., shade/ventilation, clean drinking water, isolating sick animals, keeping a bloated animal standing and withholding lush green fodder, gentle warm water cleaning of udder, recording rectal temperature or breathing rate to report to the vet).

HOME REMEDY SAFETY CHECKER:
- Carefully check if the farmer mentions ANY home remedy, desi nuskha, kitchen ingredient, oil, spice, alcohol, kerosene, tobacco, hot iron branding (daag), or human tablet.
- If NO home remedy is mentioned, set homeRemedyDetected = false, homeRemedySafety = "none", and homeRemedyAdvice = "".
- If a home remedy IS mentioned, set homeRemedyDetected = true and evaluate honestly:
  * "harmful": Dangerous or life-threatening practices (kerosene/diesel, tobacco, hot iron branding, human painkillers/antibiotics, acid/chilli on wounds, or force-feeding mustard oil / kadha / liquids orally when bloated or breathless due to aspiration pneumonia/choking risk). Clearly and politely warn the farmer NOT to use it and explain the harm.
  * "caution": Mild kitchen items (hing, ajwain, ginger, jaggery, turmeric paste, baking soda) given orally or on symptoms that require real clinical care — advise caution, warn never to force-feed drenching liquids, and do not treat it as a cure.
  * "safe_supportive": External gentle comfort only (lukewarm clean water udder wash, cool water bath for heat stress, clean dry bedding). Confirm it is safe only as comfort care.
- Whenever homeRemedyDetected = true, always remind politely in homeRemedyAdvice (and reply) that only a licensed veterinarian can prescribe medicines or treatments.

TRIAGE & ESCALATION RULES:
- Classify urgencyLevel into one of: "routine", "moderate", "urgent", "emergency".
- "routine": General nutrition, hygiene, preventive vaccination schedule questions, normal care. Set shouldEscalate = false.
- "moderate": Mild early observation without distress (e.g. slight feed selectivity < 12 hours, mild ticks, minor scrape). Set shouldEscalate = false unless signs worsen.
- "urgent": Persistent fever, sudden milk yield drop >25%, udder swelling/heat/clots (suspected mastitis), persistent diarrhea, lameness/limping, nasal discharge with cough, dullness/off-feed >12 hours. MUST set shouldEscalate = true.
- "emergency": Left flank bloating/distension (afara), severe respiratory distress/open-mouth breathing, collapse/inability to stand, high fever with shivering, bloody diarrhea, calving dystocia/prolapse, suspected poisoning/snakebite, seizures, or heavy bleeding. MUST set shouldEscalate = true.

LANGUAGE RULE:
${targetLanguageDirective}

RESPONSE BREVITY:
- Keep "reply" concise (2-4 short sentences, warm and practical).
- Provide 2 to 4 actionable non-medicinal "safeCareSteps".
- Provide 2 to 3 specific "redFlags" to watch for.`;

      const promptContents = `${animalContextText}

Recent Conversation History:
${conversationHistoryText}

Current Farmer Message:
${message}`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: promptContents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  "Farmer-friendly triage guidance in the selected language. Must never mention or prescribe any medicine, drug, or dosage.",
              },
              urgencyLevel: {
                type: Type.STRING,
                description:
                  "One of: routine, moderate, urgent, emergency.",
              },
              shouldEscalate: {
                type: Type.BOOLEAN,
                description:
                  "True whenever urgencyLevel is urgent or emergency so the case auto-escalates to the Veterinarian Dashboard.",
              },
              alertTitle: {
                type: Type.STRING,
                description:
                  "Concise clinical triage title (max 8 words) summarizing the symptom presentation.",
              },
              suspectedCategory: {
                type: Type.STRING,
                description:
                  "Clinical category such as Digestive / Bloat, Udder / Mastitis, Fever / Systemic, Respiratory, Foot & Lameness, or General Husbandry.",
              },
              safeCareSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "2 to 4 safe, non-medicinal husbandry or comfort steps the farmer can take while monitoring or waiting for a vet.",
              },
              redFlags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "2 to 3 warning signs that indicate immediate emergency veterinary attention is needed.",
              },
              homeRemedyDetected: {
                type: Type.BOOLEAN,
                description:
                  "True if the farmer mentioned or asked about any home remedy, traditional cure, oil/spice drench, or human medicine.",
              },
              homeRemedySafety: {
                type: Type.STRING,
                description:
                  "One of: none, safe_supportive, caution, harmful.",
              },
              homeRemedyAdvice: {
                type: Type.STRING,
                description:
                  "Empty string if homeRemedyDetected is false. Otherwise 1-2 polite sentences evaluating whether the home remedy is safe or harmful, warning against dangerous practices, and reminding that only a licensed vet can prescribe medicines.",
              },
            },
            required: [
              "reply",
              "urgencyLevel",
              "shouldEscalate",
              "alertTitle",
              "suspectedCategory",
              "safeCareSteps",
              "redFlags",
              "homeRemedyDetected",
              "homeRemedySafety",
              "homeRemedyAdvice",
            ],
          },
        },
      });

      const rawText = (response.text ?? "").trim();
      if (!rawText) {
        throw new Error("Empty response returned from Gemini model.");
      }

      const parsed = JSON.parse(rawText) as {
        reply: string;
        urgencyLevel: string;
        shouldEscalate: boolean;
        alertTitle: string;
        suspectedCategory: string;
        safeCareSteps: string[];
        redFlags: string[];
        homeRemedyDetected?: boolean;
        homeRemedySafety?: string;
        homeRemedyAdvice?: string;
      };

      const normalizedUrgency = ["routine", "moderate", "urgent", "emergency"].includes(
        String(parsed.urgencyLevel).toLowerCase()
      )
        ? (String(parsed.urgencyLevel).toLowerCase() as
            | "routine"
            | "moderate"
            | "urgent"
            | "emergency")
        : "moderate";

      const normalizedRemedySafety = [
        "none",
        "safe_supportive",
        "caution",
        "harmful",
      ].includes(String(parsed.homeRemedySafety).toLowerCase())
        ? (String(parsed.homeRemedySafety).toLowerCase() as
            | "none"
            | "safe_supportive"
            | "caution"
            | "harmful")
        : "none";

      const shouldEscalate =
        Boolean(parsed.shouldEscalate) ||
        normalizedUrgency === "urgent" ||
        normalizedUrgency === "emergency";

      res.json({
        reply: parsed.reply,
        urgencyLevel: normalizedUrgency,
        shouldEscalate,
        alertTitle: parsed.alertTitle || "Symptom Triage Assessment",
        suspectedCategory: parsed.suspectedCategory || "General Triage",
        safeCareSteps: Array.isArray(parsed.safeCareSteps) ? parsed.safeCareSteps : [],
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
        homeRemedyDetected: Boolean(parsed.homeRemedyDetected) && normalizedRemedySafety !== "none",
        homeRemedySafety: normalizedRemedySafety,
        homeRemedyAdvice:
          typeof parsed.homeRemedyAdvice === "string"
            ? parsed.homeRemedyAdvice.trim()
            : "",
      });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      console.error("Gemini triage error:", errorObj?.message || err);

      if (errorObj?.status === 403 || errorObj?.status === 400) {
        res.status(errorObj.status).json({
          error:
            "Unable to verify Gemini API access. Please check GEMINI_API_KEY in Settings > Secrets.",
        });
        return;
      }

      if (errorObj?.status === 429) {
        res.status(429).json({
          error: "Triage service is busy right now. Please try again in a few seconds.",
        });
        return;
      }

      res.status(500).json({
        error:
          errorObj?.message || "Failed to process veterinary symptom triage. Please try again.",
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NorthField Biosciences server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
