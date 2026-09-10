import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Copy,
  Download,
  Share2,
  Check,
  ShieldCheck,
  Printer,
  Send,
  Eye,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  PhoneCall,
  Info,
} from "lucide-react";
import { AnalysisResult, ScreeningRecord, AnimalProfile, UserSettings } from "../types";
import { buildSimplifiedReport } from "../utils/simplifiedReportHelper";
import {
  downloadScreeningSummaryAsTxt,
  shareScreeningSummary,
} from "../utils/shareHelper";
import { ttsManager } from "../utils/speechHelper";
import { getTranslation } from "../data/translations";
import { useModalHistory } from "../utils/useModalHistory";

interface VeterinaryReportModalProps {
  result?: AnalysisResult;
  record?: ScreeningRecord;
  animalProfile?: AnimalProfile;
  selectedAnimal?: string;
  bodyArea?: string;
  symptoms?: string;
  settings?: UserSettings;
  onClose: () => void;
}

export const VeterinaryReportModal: React.FC<VeterinaryReportModalProps> = ({
  result: propResult,
  record,
  animalProfile,
  selectedAnimal,
  bodyArea,
  symptoms,
  settings,
  onClose,
}) => {
  useModalHistory({
    isOpen: true,
    onClose,
    modalKey: "full_report",
  });

  const result = propResult || record?.result;
  const lang = settings?.language || "en";

  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Cancel any speech synthesis and handle escape key when modal is open / unmounted
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      ttsManager.stop();
    };
  }, [onClose]);

  if (!result) {
    return null;
  }

  const report = buildSimplifiedReport({
    result,
    record,
    animalProfile,
    selectedAnimal: selectedAnimal || record?.selectedAnimal,
    bodyArea: bodyArea || record?.bodyArea,
    symptoms: symptoms || record?.symptomsInput,
    lang,
    timestamp: record?.timestamp || Date.now(),
  });

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(report.plainText);
        setCopied(true);
        setStatusMessage("Report copied to clipboard!");
        setTimeout(() => {
          setCopied(false);
          setStatusMessage(null);
        }, 3000);
      }
    } catch (e) {
      console.warn("Clipboard failed:", e);
    }
  };

  const handleDownload = () => {
    downloadScreeningSummaryAsTxt(
      result,
      selectedAnimal,
      symptoms,
      record?.timestamp || Date.now(),
      record,
      animalProfile
    );
    setStatusMessage("Report downloaded as .TXT file!");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleShare = async () => {
    const outcome = await shareScreeningSummary(
      result,
      selectedAnimal,
      symptoms,
      record?.timestamp || Date.now(),
      false,
      record?.imageThumbnail,
      record,
      animalProfile
    );
    if (outcome.success) {
      setStatusMessage("Shared successfully!");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(report.plainText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const handleToggleAudio = () => {
    if (isSpeaking) {
      ttsManager.stop();
      setIsSpeaking(false);
    } else {
      ttsManager.stop();
      const success = ttsManager.speak(
        report.speechText,
        lang,
        settings?.ttsVoiceSpeed || 1.0,
        settings?.ttsPitch || 1.0,
        () => setIsSpeaking(false)
      );
      if (success) {
        setIsSpeaking(true);
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VetCheck Full Report - ${report.animalName}</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 32px;
              color: #1e293b;
              max-width: 680px;
              margin: 0 auto;
              line-height: 1.5;
            }
            h1 { font-size: 20px; color: #0f766e; margin-bottom: 4px; }
            .meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            .section { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0; }
            .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-weight: bold; font-size: 13px; margin-bottom: 6px; }
            ul { margin: 4px 0 0 18px; padding: 0; }
            li { margin-bottom: 4px; font-size: 13px; }
            .footer { margin-top: 24px; font-size: 11px; color: #64748b; font-style: italic; }
          </style>
        </head>
        <body>
          <h1>🐾 VetCheck Full Report</h1>
          <div class="meta"><strong>Animal:</strong> ${report.animalName} | <strong>Date:</strong> ${report.dateFormatted}</div>

          <div class="section">
            <div class="section-title">1. What We Noticed</div>
            <div>${report.notice}</div>
          </div>

          <div class="section">
            <div class="section-title">2. How Serious Does It Look?</div>
            <div class="badge">${report.severityEmoji} ${report.severityLabel.toUpperCase()}</div>
            <div>${report.severityReason}</div>
          </div>

          <div class="section">
            <div class="section-title">3. What You Should Do Now</div>
            <ul>
              ${report.actionPoints.map((a) => `<li>${a}</li>`).join("")}
            </ul>
          </div>

          <div class="section">
            <div class="section-title">4. Watch for These Warning Signs</div>
            <ul>
              ${report.warningSigns.map((w) => `<li>${w}</li>`).join("")}
            </ul>
          </div>

          <div class="section">
            <div class="section-title">5. Vet Recommendation</div>
            <div><strong>${report.vetRecommendation}</strong></div>
          </div>

          <div class="footer">
            ${report.footerDisclaimer}<br/>
            National Emergency Animal Helpline: 1962 (Pashu Sanjeevani)
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div
      id="full-report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in"
    >
      <div
        id="full-report-modal-container"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#134E4A] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-800/80 flex items-center justify-center text-teal-200 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>{getTranslation(lang, "fullReportTitle") || "Full Report"}</span>
              </h2>
              <p className="text-xs text-teal-200/90 font-medium">
                {getTranslation(lang, "fullReportSubtitle") || "Quick 15–30 second overview"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-teal-200 hover:text-white rounded-full hover:bg-teal-800/60 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Read Aloud Button */}
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 border ${
                isSpeaking
                  ? "bg-teal-700 text-white border-teal-800 animate-pulse"
                  : "bg-white text-slate-700 border-slate-200 hover:border-teal-600"
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-white" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                  <span>Read Aloud</span>
                </>
              )}
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-teal-600 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Download TXT */}
            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-teal-600 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
              title="Download as text file"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-teal-600 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
              title="Print report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500">
            {report.animalName}
          </div>
        </div>

        {statusMessage && (
          <div className="bg-emerald-50 text-emerald-800 text-xs font-bold px-4 py-2 text-center border-b border-emerald-200 animate-in fade-in">
            ✓ {statusMessage}
          </div>
        )}

        {/* Scrollable Report Content (5 Simple, Readable Sections) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#FAF9F5] text-slate-800">
          {/* SECTION 1: WHAT WE NOTICED */}
          <div
            id="report-section-noticed"
            className="p-4 rounded-2xl bg-white border border-[#E5E3DC] shadow-2xs"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {getTranslation(lang, "whatWeNoticedTitle") || "1. What We Noticed"}
              </h3>
            </div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-slate-800 font-medium">
              {report.notice}
            </p>
          </div>

          {/* SECTION 2: HOW SERIOUS DOES IT LOOK? */}
          <div
            id="report-section-severity"
            className={`p-4 rounded-2xl border shadow-2xs transition-colors ${report.severityColor.bg} ${report.severityColor.border}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-700" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {getTranslation(lang, "howSeriousTitle") || "2. How Serious Does It Look?"}
                </h3>
              </div>

              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-2xs ${report.severityColor.badgeBg}`}
              >
                <span>{report.severityEmoji}</span>
                <span>{report.severityLabel}</span>
              </div>
            </div>

            <p className="text-sm sm:text-[15px] leading-relaxed font-semibold text-slate-800">
              {report.severityReason}
            </p>
          </div>

          {/* SECTION 3: WHAT YOU SHOULD DO NOW */}
          <div
            id="report-section-actions"
            className="p-4 rounded-2xl bg-white border border-[#E5E3DC] shadow-2xs"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {getTranslation(lang, "whatToDoNowTitle") || "3. What You Should Do Now"}
              </h3>
            </div>

            <ul className="space-y-2">
              {report.actionPoints.map((action, idx) => (
                <li
                  key={`action-${idx}`}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-snug"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="font-medium">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION 4: WATCH FOR THESE WARNING SIGNS */}
          <div
            id="report-section-warnings"
            className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                {getTranslation(lang, "warningSignsTitle") || "4. Watch for These Warning Signs"}
              </h3>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {report.warningSigns.map((warning, idx) => (
                <li
                  key={`warn-${idx}`}
                  className="p-2 rounded-xl bg-white/90 border border-amber-200/80 text-xs font-semibold text-slate-800 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION 5: VET RECOMMENDATION */}
          <div
            id="report-section-vet-advice"
            className="p-4 rounded-2xl bg-teal-50 border border-teal-200 shadow-2xs"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                {getTranslation(lang, "vetRecommendationTitle") || "5. Vet Recommendation"}
              </h3>
            </div>

            <p className="text-sm sm:text-[15px] font-bold text-teal-950 leading-relaxed">
              {report.vetRecommendation}
            </p>

            <div className="mt-3 pt-2.5 border-t border-teal-200/70 flex items-center justify-between text-xs text-teal-800 font-semibold">
              <span className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-teal-700" />
                <span>National Helpline: 1962 (Pashu Sanjeevani)</span>
              </span>
            </div>
          </div>

          {/* OPTIONAL TECHNICAL "MORE DETAILS" BUTTON */}
          {report.technicalDetails && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowMoreDetails((prev) => !prev)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {showMoreDetails
                    ? getTranslation(lang, "lessDetailsBtn") || "Less details"
                    : getTranslation(lang, "moreDetailsBtn") || "More details (Technical observations)"}
                </span>
                {showMoreDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showMoreDetails && (
                <div className="mt-2 p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2.5 animate-in fade-in">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Additional Screening Observations
                  </div>
                  {report.technicalDetails.affectedArea && (
                    <div>
                      <span className="font-bold text-slate-700">Examined Area:</span>{" "}
                      {report.technicalDetails.affectedArea}
                    </div>
                  )}
                  {report.technicalDetails.confidence && (
                    <div>
                      <span className="font-bold text-slate-700">AI Confidence:</span>{" "}
                      {report.technicalDetails.confidence}
                    </div>
                  )}
                  {report.technicalDetails.possibleConditions &&
                    report.technicalDetails.possibleConditions.length > 0 && (
                      <div>
                        <div className="font-bold text-slate-700 mb-1">
                          Possible visible signs consistent with:
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                          {report.technicalDetails.possibleConditions.map((cond, i) => (
                            <li key={i}>
                              <span className="font-semibold text-slate-800">{cond.name}</span>
                              {cond.description ? ` — ${cond.description}` : ""}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1 text-[11px] italic text-slate-500">
                          Note: A licensed veterinarian must confirm the actual cause.
                        </p>
                      </div>
                    )}
                  {report.technicalDetails.symptomsLogged && (
                    <div>
                      <span className="font-bold text-slate-700">Caregiver Notes:</span>{" "}
                      {report.technicalDetails.symptomsLogged}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{report.footerDisclaimer}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
