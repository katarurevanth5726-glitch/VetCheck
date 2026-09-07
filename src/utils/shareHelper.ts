import { AnalysisResult, ScreeningRecord, AnimalProfile, FollowUpAnswer } from "../types";
import { buildSimplifiedReport } from "./simplifiedReportHelper";

export interface VeterinaryReportOptions {
  result: AnalysisResult;
  record?: ScreeningRecord;
  animalProfile?: AnimalProfile;
  selectedAnimal?: string;
  bodyArea?: string;
  symptoms?: string;
  riskFactors?: string[];
  followUpAnswers?: FollowUpAnswer[];
  completedActionSteps?: Record<string, boolean>;
  timestamp?: number;
  includeImageConsent?: boolean;
  imageSrc?: string;
}

function getAnimalName(result: AnalysisResult, selectedAnimal?: string): string {
  if (typeof result.detectedAnimal === "object" && result.detectedAnimal !== null) {
    return result.detectedAnimal.name || result.animalType || selectedAnimal || "Animal";
  }
  return (result.detectedAnimal as string) || result.animalType || selectedAnimal || "Animal";
}

export function generateVeterinaryReportText(opts: VeterinaryReportOptions): string {
  const simplified = buildSimplifiedReport({
    result: opts.result,
    record: opts.record,
    animalProfile: opts.animalProfile,
    selectedAnimal: opts.selectedAnimal,
    bodyArea: opts.bodyArea,
    symptoms: opts.symptoms,
    timestamp: opts.timestamp,
  });

  return simplified.plainText;
}

export async function shareScreeningSummary(
  result: AnalysisResult,
  selectedAnimal?: string,
  symptoms?: string,
  timestamp?: number,
  includeImage?: boolean,
  imageSrc?: string,
  record?: ScreeningRecord,
  animalProfile?: AnimalProfile
): Promise<{ success: boolean; method: "native" | "clipboard" | "download" }> {
  const text = generateVeterinaryReportText({
    result,
    record,
    animalProfile,
    selectedAnimal,
    symptoms,
    timestamp,
    includeImageConsent: includeImage,
    imageSrc,
  });

  const animal = getAnimalName(result, selectedAnimal);
  const title = `VetCheck Full Report: ${animal} (${result.severity})`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const shareData: ShareData = { title, text };

      if (includeImage && imageSrc && navigator.canShare) {
        try {
          const res = await fetch(imageSrc);
          const blob = await res.blob();
          const file = new File([blob], `vetcheck_${animal.toLowerCase().replace(/\s+/g, "_")}.jpg`, {
            type: blob.type || "image/jpeg",
          });
          if (navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        } catch (imgErr) {
          console.warn("Could not attach image to Web Share, proceeding with text:", imgErr);
        }
      }

      await navigator.share(shareData);
      return { success: true, method: "native" };
    } catch (e: any) {
      if (e.name === "AbortError") {
        return { success: false, method: "native" };
      }
      console.warn("Native share failed, falling back to clipboard:", e);
    }
  }

  // Fallback to clipboard
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true, method: "clipboard" };
    }
  } catch (err) {
    console.error("Clipboard copy failed, falling back to download:", err);
  }

  // Fallback to text file download
  downloadScreeningSummaryAsTxt(result, selectedAnimal, symptoms, timestamp, record, animalProfile);
  return { success: true, method: "download" };
}

export function downloadScreeningSummaryAsTxt(
  result: AnalysisResult,
  selectedAnimal?: string,
  symptoms?: string,
  timestamp?: number,
  record?: ScreeningRecord,
  animalProfile?: AnimalProfile
): void {
  if (typeof window === "undefined") return;
  const text = generateVeterinaryReportText({
    result,
    record,
    animalProfile,
    selectedAnimal,
    symptoms,
    timestamp,
  });
  const animal = getAnimalName(result, selectedAnimal);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `VetCheck_Full_Report_${animal.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date(timestamp || Date.now())
    .toISOString()
    .slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

