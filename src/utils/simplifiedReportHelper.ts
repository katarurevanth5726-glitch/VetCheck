import { AnalysisResult, ScreeningRecord, AnimalProfile, SeverityLevel } from "../types";
import { getTranslation } from "../data/translations";

export interface SimplifiedReportData {
  animalName: string;
  breedOrCategory?: string;
  affectedArea?: string;
  timestamp: number;
  dateFormatted: string;

  // 1. What We Noticed (1-2 short sentences)
  notice: string;

  // 2. How Serious Does It Look? (Label + 1 short sentence reason)
  severityLevel: SeverityLevel;
  severityEmoji: string;
  severityLabel: string;
  severityColor: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
  };
  severityReason: string;

  // 3. What You Should Do Now (3-5 short action points)
  actionPoints: string[];

  // 4. Watch for These Warning Signs (important red flags)
  warningSigns: string[];

  // 5. Vet Recommendation (one clear recommendation)
  vetRecommendation: string;

  // Small footer
  footerDisclaimer: string;

  // Read Aloud Text (audio-optimized, concise, no UI boilerplate)
  speechText: string;

  // Plain Text formatted (120-180 words, ready for Copy/Download/WhatsApp)
  plainText: string;

  // Technical details for optional "More details" button
  technicalDetails?: {
    possibleConditions?: { name: string; likelihood?: string; description?: string }[];
    affectedArea?: string;
    confidence?: string;
    symptomsLogged?: string;
  };
}

export interface ReportOptions {
  result: AnalysisResult;
  record?: ScreeningRecord;
  animalProfile?: AnimalProfile;
  selectedAnimal?: string;
  bodyArea?: string;
  symptoms?: string;
  lang?: string;
  timestamp?: number;
}

/**
 * Replaces complex veterinary jargon with everyday conversational terms.
 */
export function simplifyMedicalJargon(text: string): string {
  if (!text) return "";
  let s = text;

  const replacements: [RegExp, string][] = [
    [/\berythematous\b/gi, "red and irritated"],
    [/\berythema\b/gi, "redness"],
    [/\blesion morphology\b/gi, "wound appearance"],
    [/\blesions?\b/gi, "irritated spot(s)"],
    [/\bdermatological pathology\b/gi, "skin problem"],
    [/\binflammatory response\b/gi, "swelling and redness"],
    [/\bdifferential diagnosis\b/gi, "possible causes"],
    [/\bpurulent exudate\b/gi, "pus discharge"],
    [/\bexudate\b/gi, "discharge"],
    [/\bpruritus\b/gi, "itching"],
    [/\balopecia\b/gi, "hair loss"],
    [/\bedema\b/gi, "swelling"],
    [/\bulceration\b/gi, "open sore"],
    [/\bulcers?\b/gi, "open sore(s)"],
    [/\bexcoriations?\b/gi, "scratch mark(s)"],
    [/\blacerations?\b/gi, "cut(s)"],
    [/\bconjunctivitis\b/gi, "eye irritation"],
    [/\bpyoderma\b/gi, "skin infection"],
    [/\bhematoma\b/gi, "blood swelling"],
    [/\bdefinitely has\b/gi, "may show signs of"],
    [/\bdiagnosed with\b/gi, "may be consistent with"],
    [/\bconfirmed diagnosis of\b/gi, "possible signs of"],
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }

  return s;
}

function extractAnimalDisplayName(result: AnalysisResult, animalProfile?: AnimalProfile, selectedAnimal?: string): string {
  if (animalProfile?.name) {
    const species = animalProfile.species ? ` (${animalProfile.species})` : "";
    return `${animalProfile.name}${species}`;
  }
  if (typeof result.detectedAnimal === "object" && result.detectedAnimal !== null) {
    return result.detectedAnimal.name || result.animalType || selectedAnimal || "Animal";
  }
  return (result.detectedAnimal as string) || result.animalType || selectedAnimal || "Animal";
}

/**
 * Builds the simplified Full Report structure strictly conforming to the 15-30 second reading standard.
 */
export function buildSimplifiedReport(opts: ReportOptions): SimplifiedReportData {
  const {
    result,
    record,
    animalProfile,
    selectedAnimal,
    bodyArea,
    symptoms,
    lang = "en",
    timestamp = record?.timestamp || Date.now(),
  } = opts;

  const animalName = extractAnimalDisplayName(result, animalProfile, selectedAnimal);
  const breedOrCategory = animalProfile?.breed || result.breedOrCategory;
  const area = bodyArea || result.affectedBodyArea || "visible area";

  // --- 1. WHAT WE NOTICED (1-2 Short Sentences) ---
  const rawSev = String(result.severity || "Mild");
  const sevLower = rawSev.toLowerCase();

  let notice = "";
  const isHealthyOrClean =
    (sevLower === "mild") &&
    (result.noVisibleAbnormality ||
      result.isNoAbnormalityDetected ||
      !result.visibleSigns ||
      result.visibleSigns.length === 0 ||
      /no obvious|healthy|normal/i.test(result.simpleExplanation || ""));

  if (isHealthyOrClean) {
    notice = `VetCheck did not detect any obvious visible wounds, swelling, or skin irritation in this photo. The animal appears comfortable.`;
  } else if (result.simpleExplanation && result.simpleExplanation.trim()) {
    // Keep to max 1-2 concise sentences
    const cleanExpl = simplifyMedicalJargon(result.simpleExplanation.trim());
    const sentences = cleanExpl.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length > 0) {
      notice = sentences.slice(0, 2).join(" ");
    } else {
      notice = cleanExpl;
    }
  } else if (result.visibleSigns && result.visibleSigns.length > 0) {
    const cleanedSigns = result.visibleSigns.map((s) => simplifyMedicalJargon(s).toLowerCase()).join(", ");
    notice = `VetCheck noticed visible signs of ${cleanedSigns} around the ${area.toLowerCase()}.`;
  } else {
    notice = `VetCheck noticed visible irritation around the ${area.toLowerCase()}.`;
  }

  // Ensure safe, non-definitive language
  notice = notice
    .replace(/has /gi, "shows visible signs of ")
    .replace(/is suffering from/gi, "may have")
    .replace(/diagnosed with/gi, "showing signs of");

  // --- 2. HOW SERIOUS DOES IT LOOK? ---
  let severityLevel: SeverityLevel = "Mild";
  let severityEmoji = "🟢";
  let severityLabel = "Mild";
  let severityColor = {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    badgeBg: "bg-emerald-100 text-emerald-800",
  };

  if (sevLower === "emergency" || sevLower === "critical") {
    severityLevel = "Emergency";
    severityEmoji = "🔴";
    severityLabel = "Emergency";
    severityColor = {
      bg: "bg-rose-50",
      border: "border-rose-300",
      text: "text-rose-950",
      badgeBg: "bg-rose-100 text-rose-800",
    };
  } else if (sevLower === "serious" || sevLower === "high") {
    severityLevel = "Serious";
    severityEmoji = "🟠";
    severityLabel = "Serious";
    severityColor = {
      bg: "bg-amber-50",
      border: "border-amber-300",
      text: "text-amber-950",
      badgeBg: "bg-amber-100 text-amber-900",
    };
  } else if (sevLower === "moderate") {
    severityLevel = "Moderate";
    severityEmoji = "🟡";
    severityLabel = "Moderate";
    severityColor = {
      bg: "bg-amber-50/70",
      border: "border-amber-200",
      text: "text-amber-900",
      badgeBg: "bg-amber-100 text-amber-800",
    };
  }

  // 1 short sentence reason
  let severityReason = "";
  if (result.severityReason && result.severityReason.trim()) {
    const cleanReason = simplifyMedicalJargon(result.severityReason.trim());
    const sentences = cleanReason.split(/(?<=[.!?])\s+/).filter(Boolean);
    severityReason = sentences[0] || cleanReason;
  } else {
    if (sevLower === "emergency" || sevLower === "critical") {
      severityReason = "Urgent attention is needed to prevent rapid worsening or distress.";
    } else if (sevLower === "serious" || sevLower === "high") {
      severityReason = "The visible signs look pronounced and require timely veterinary attention.";
    } else if (sevLower === "moderate") {
      severityReason = "The area looks irritated, but no critical bleeding or emergency distress is visible.";
    } else {
      severityReason = "No acute visible distress or deep wounds are detected in this photo.";
    }
  }

  // --- 3. WHAT YOU SHOULD DO NOW (3 to 5 Short Action Points) ---
  const rawActions = [
    ...(result.actionPlan?.doNow || []),
    ...(result.immediateCare || []),
    ...(result.safeImmediateCareSteps || []),
  ];

  const defaultActionsBySeverity: Record<string, string[]> = {
    emergency: [
      "Contact an emergency veterinarian or animal helpline immediately.",
      "Keep the animal warm, calm, and gently restrained.",
      "Avoid giving food, human painkillers, or unprescribed medicines.",
      "Transport safely in a secure, well-ventilated carrier.",
    ],
    serious: [
      "Schedule a veterinary visit within 24 hours.",
      "Keep the affected area clean and dry.",
      "Prevent the animal from licking, scratching, or rubbing the area.",
      "Avoid applying unknown ointments, human creams, or harsh chemicals.",
      "Monitor closely for any spreading, swelling, or changes in energy.",
    ],
    moderate: [
      "Keep the area clean and gently dry.",
      "Prevent the animal from licking or scratching the irritated spot.",
      "Avoid applying human creams, dettol, or unknown home remedies.",
      "Monitor daily for swelling, redness, or discharge.",
      "Contact a veterinarian if symptoms do not improve within 1–2 days.",
    ],
    mild: [
      "Keep the area clean and monitor over the next 2–3 days.",
      "Prevent excessive licking, scratching, or rubbing.",
      "Ensure fresh drinking water and normal nutritious feed.",
      "Avoid applying unverified home remedies or chemicals.",
      "Consult a veterinarian if new swelling or behavior changes appear.",
    ],
  };

  const actionPool: string[] = [];
  if (rawActions.length > 0) {
    for (const act of rawActions) {
      const cleanAct = simplifyMedicalJargon(act.trim());
      if (cleanAct && !actionPool.some((a) => a.toLowerCase() === cleanAct.toLowerCase())) {
        // Ensure concise single-sentence length
        const shortSentence = cleanAct.split(/(?<=[.!?])\s+/)[0] || cleanAct;
        actionPool.push(shortSentence.replace(/\.$/, "") + ".");
      }
    }
  }

  // If we have fewer than 3 actions, fill from curated safety defaults
  const curatedFallback = defaultActionsBySeverity[sevLower] || defaultActionsBySeverity.moderate;
  for (const defAction of curatedFallback) {
    if (actionPool.length >= 4) break;
    if (!actionPool.some((a) => a.toLowerCase().includes(defAction.slice(0, 15).toLowerCase()))) {
      actionPool.push(defAction);
    }
  }

  // Cap strictly at 3 to 5 action points
  const actionPoints = actionPool.slice(0, 5);

  // --- 4. WATCH FOR THESE WARNING SIGNS ---
  const defaultWarningsBySeverity: Record<string, string[]> = {
    emergency: [
      "Heavy or uncontrolled bleeding",
      "Severe swelling or rapid spreading",
      "Difficulty breathing or extreme lethargy",
      "Inability to stand or severe vocalizing from pain",
    ],
    serious: [
      "Heavy bleeding or open wounds",
      "Severe swelling or heat in the area",
      "Pus, foul smell, or yellowish discharge",
      "Animal stops eating, drinking, or standing",
    ],
    moderate: [
      "Sudden increase in swelling or redness",
      "Pus, sticky discharge, or foul odor",
      "Animal stops eating or becomes lethargic",
      "Persistent scratching or biting causing bleeding",
    ],
    mild: [
      "New swelling, redness, or heat",
      "Pus or yellowish discharge",
      "Loss of appetite or reluctance to move",
      "Rapid spreading over 24–48 hours",
    ],
  };

  const watchPool: string[] = [];
  if (result.actionPlan?.watchFor && result.actionPlan.watchFor.length > 0) {
    for (const w of result.actionPlan.watchFor) {
      const cleanW = simplifyMedicalJargon(w.trim());
      if (cleanW && !watchPool.some((x) => x.toLowerCase() === cleanW.toLowerCase())) {
        const shortW = cleanW.split(/(?<=[.!?])\s+/)[0] || cleanW;
        watchPool.push(shortW.replace(/\.$/, ""));
      }
    }
  }

  const fallbackWarnings = defaultWarningsBySeverity[sevLower] || defaultWarningsBySeverity.moderate;
  for (const fw of fallbackWarnings) {
    if (watchPool.length >= 4) break;
    if (!watchPool.some((x) => x.toLowerCase().includes(fw.slice(0, 10).toLowerCase()))) {
      watchPool.push(fw);
    }
  }

  const warningSigns = watchPool.slice(0, 4);

  // --- 5. VET RECOMMENDATION (One clear recommendation) ---
  let vetRecommendation = "";
  if (sevLower === "emergency" || sevLower === "critical") {
    vetRecommendation = "Seek veterinary help immediately or call the emergency animal helpline.";
  } else if (sevLower === "serious" || sevLower === "high") {
    vetRecommendation = "Vet visit recommended within 24 hours for in-person evaluation.";
  } else if (sevLower === "moderate") {
    vetRecommendation = "Schedule a veterinary checkup within 1–2 days, or sooner if signs worsen.";
  } else {
    vetRecommendation = "Monitor at home and contact a veterinarian if symptoms or behavior change.";
  }

  if (result.veterinaryHelp && result.veterinaryHelp.trim() && result.veterinaryHelp.length < 100) {
    const cleanHelp = simplifyMedicalJargon(result.veterinaryHelp.trim());
    if (!/diagnosis|prognosis/i.test(cleanHelp)) {
      vetRecommendation = cleanHelp.replace(/\.$/, "") + ".";
    }
  }

  const footerDisclaimer = "VetCheck provides preliminary visual guidance and does not replace a veterinarian.";

  const dateFormatted = new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // --- READ ALOUD SCRIPT (Audio-Friendly, concise ~60-80 words) ---
  const speechText = [
    `Full Report for ${animalName}.`,
    `What we noticed: ${notice}`,
    `Severity level: ${severityLabel}. ${severityReason}`,
    `What you should do now: ${actionPoints.slice(0, 3).join(". ")}.`,
    `Warning signs to watch: ${warningSigns.slice(0, 3).join(", ")}.`,
    `Vet recommendation: ${vetRecommendation}`,
  ].join(" ");

  // --- PLAIN TEXT FORMAT (120-180 words, WhatsApp / TXT / Print ready) ---
  const plainTextLines: string[] = [
    `🐾 VETCHECK FULL REPORT`,
    `Subject: ${animalName} | Date: ${dateFormatted}`,
    ``,
    `1. WHAT WE NOTICED`,
    `${notice}`,
    ``,
    `2. HOW SERIOUS DOES IT LOOK?`,
    `${severityEmoji} ${severityLabel.toUpperCase()} — ${severityReason}`,
    ``,
    `3. WHAT YOU SHOULD DO NOW`,
    ...actionPoints.map((act) => `• ${act}`),
    ``,
    `4. WATCH FOR THESE WARNING SIGNS`,
    ...warningSigns.map((w) => `• ${w}`),
    ``,
    `5. VET RECOMMENDATION`,
    `👉 ${vetRecommendation}`,
    ``,
    `----------------------------------------`,
    `⚠️ ${footerDisclaimer}`,
    `📞 Emergency Helpline: 1962 (Pashu Sanjeevani)`,
  ];

  const plainText = plainTextLines.join("\n");

  // Technical details for optional "More details" dropdown
  const technicalDetails = {
    possibleConditions: result.possibleConditions?.map((c) => ({
      name: c.name,
      likelihood: c.likelihood || c.confidence || "Possible",
      description: c.description || c.reason,
    })),
    affectedArea: area,
    confidence:
      typeof result.detectedAnimal === "object" && result.detectedAnimal !== null
        ? result.detectedAnimal.confidence
        : result.animalConfidence || "Medium",
    symptomsLogged: symptoms?.trim() || record?.symptomsInput || undefined,
  };

  return {
    animalName,
    breedOrCategory,
    affectedArea: area,
    timestamp,
    dateFormatted,
    notice,
    severityLevel,
    severityEmoji,
    severityLabel,
    severityColor,
    severityReason,
    actionPoints,
    warningSigns,
    vetRecommendation,
    footerDisclaimer,
    speechText,
    plainText,
    technicalDetails,
  };
}
