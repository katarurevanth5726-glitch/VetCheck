import React, { useState, useEffect, useRef } from "react";
import {
  X,
  QrCode,
  Download,
  Share2,
  Shield,
  Phone,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  Calendar,
  Syringe,
  Stethoscope,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  HeartHandshake,
} from "lucide-react";
import QRCode from "qrcode";
import {
  AnimalProfile,
  ScreeningRecord,
  UserSettings,
  CareReminder,
  VeterinaryPrescription,
  VetVisit,
  AnimalQRPrivacySettings,
} from "../types";
import {
  DEFAULT_QR_PRIVACY,
  getAnimalCalculatedVaccinationStatus,
  getRemindersForAnimal,
  getPrescriptionsForAnimal,
  getVetVisitsForAnimal,
  saveAnimalQRPrivacySettings,
} from "../utils/storage";
import { downloadHealthCardPdf, generateSafeAnimalQRCodeUrl } from "../utils/qrCardPdf";
import { downloadVetSharePdf, generateVetShareText } from "../utils/vetSharePdf";

interface AnimalQRHealthCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AnimalProfile;
  allRecords: ScreeningRecord[];
  settings: UserSettings;
  onOpenEmergency?: () => void;
  onProfileUpdated?: (updatedProfile: AnimalProfile) => void;
}

type TabMode = "card" | "qr_view" | "privacy" | "vet_share";

export function AnimalQRHealthCardModal({
  isOpen,
  onClose,
  profile,
  allRecords,
  settings,
  onOpenEmergency,
  onProfileUpdated,
}: AnimalQRHealthCardModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("card");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedShareText, setCopiedShareText] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Privacy Settings Local State
  const [privacy, setPrivacy] = useState<AnimalQRPrivacySettings>(() => {
    return profile.qrPrivacySettings || { ...DEFAULT_QR_PRIVACY };
  });
  const [privacySavedToast, setPrivacySavedToast] = useState<boolean>(false);

  // Vet Sharing Module Selection
  const [selectedShareModules, setSelectedShareModules] = useState({
    vaccinations: true,
    deworming: true,
    screenings: true,
    prescriptions: true,
    recoveryProgress: true,
    vetVisits: true,
  });
  const [vetNotes, setVetNotes] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Relevant data for this animal
  const animalReminders: CareReminder[] = getRemindersForAnimal(profile.id);
  const animalPrescriptions: VeterinaryPrescription[] = getPrescriptionsForAnimal(profile.id);
  const animalVetVisits: VetVisit[] = getVetVisitsForAnimal(profile.id);
  const animalRecords = allRecords.filter((r) => r.animalProfileId === profile.id);

  // Calculate actual dynamic vaccination status & next care
  const { statusText: vaxStatusText, statusType: vaxStatusType, nextCareDate, nextCareTitle } =
    getAnimalCalculatedVaccinationStatus(profile.id);

  const animalId = profile.animalId || `VC-${profile.name.slice(0, 3).toUpperCase()}-1024`;

  // Generate crisp QR code on load
  useEffect(() => {
    let isMounted = true;
    generateSafeAnimalQRCodeUrl(animalId, profile.id).then((url) => {
      if (isMounted) setQrDataUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [animalId, profile.id]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(animalId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSavePrivacy = () => {
    const updated = saveAnimalQRPrivacySettings(profile.id, privacy);
    if (updated && onProfileUpdated) {
      onProfileUpdated(updated);
    }
    setPrivacySavedToast(true);
    setTimeout(() => setPrivacySavedToast(false), 2500);
  };

  const handleDownloadCard = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      downloadHealthCardPdf({
        profile,
        vaccinationStatusText: vaxStatusText,
        vaccinationStatusType: vaxStatusType,
        nextCareDate,
        nextCareTitle,
        qrDataUrl,
      });
      setIsGeneratingPdf(false);
    }, 150);
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `VetCheck_QR_${profile.name}_${animalId}.png`;
    link.click();
  };

  const handleShareWithVetPdf = () => {
    downloadVetSharePdf({
      profile,
      screenings: animalRecords,
      reminders: animalReminders,
      prescriptions: animalPrescriptions,
      vetVisits: animalVetVisits,
      selectedModules: selectedShareModules,
      notesForVet: vetNotes,
    });
  };

  const handleCopyVetShareText = () => {
    const text = generateVetShareText({
      profile,
      screenings: animalRecords,
      reminders: animalReminders,
      prescriptions: animalPrescriptions,
      vetVisits: animalVetVisits,
      selectedModules: selectedShareModules,
      notesForVet: vetNotes,
    });
    navigator.clipboard.writeText(text);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2000);
  };

  const handleNativeShare = async () => {
    const text = generateVetShareText({
      profile,
      screenings: animalRecords,
      reminders: animalReminders,
      prescriptions: animalPrescriptions,
      vetVisits: animalVetVisits,
      selectedModules: selectedShareModules,
      notesForVet: vetNotes,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `VetCheck Clinical Summary: ${profile.name}`,
          text,
        });
      } catch (err) {
        console.log("Share cancelled or failed:", err);
      }
    } else {
      handleCopyVetShareText();
    }
  };

  const getSpeciesEmoji = (spec: string) => {
    const s = spec.toLowerCase();
    if (s.includes("cow") || s.includes("cattle")) return "🐄";
    if (s.includes("buffalo")) return "🐃";
    if (s.includes("dog")) return "🐕";
    if (s.includes("cat")) return "🐈";
    if (s.includes("goat") || s.includes("sheep")) return "🐐";
    if (s.includes("poultry") || s.includes("chicken")) return "🐓";
    if (s.includes("horse") || s.includes("donkey")) return "🐎";
    return "🐾";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-[#FAF8F5] border border-stone-300/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="bg-[#154734] px-4 sm:px-6 py-4 flex items-center justify-between text-white border-b border-[#1b553f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  🐾 Animal QR Health Card
                </h2>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  SIH Digital Identity
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 font-medium">
                {profile.name} • {animalId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-stone-200 px-3 sm:px-6 flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "card"
                ? "border-[#154734] text-[#154734] bg-stone-50/80"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Health Card</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qr_view")}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "qr_view"
                ? "border-[#154734] text-[#154734] bg-stone-50/80"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Public QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "privacy"
                ? "border-[#154734] text-[#154734] bg-stone-50/80"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy Controls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vet_share")}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "vet_share"
                ? "border-[#154734] text-[#154734] bg-stone-50/80"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Share with Vet</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: THE DIGITAL HEALTH CARD */}
          {activeTab === "card" && (
            <div className="space-y-4 animate-in fade-in">
              {/* The Physical Card Rendering */}
              <div className="bg-white border-2 border-stone-300/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-md relative overflow-hidden bg-gradient-to-b from-[#FFFDF9] to-[#FAF6EE]">
                {/* Gold Trim Corner Accent */}
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                  <div className="absolute transform rotate-45 bg-[#d4af37] text-[8px] font-black text-amber-950 text-center py-0.5 right-[-35px] top-[18px] w-[120px] shadow-xs">
                    OFFICIAL
                  </div>
                </div>

                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#154734] text-white flex items-center justify-center font-black text-xs">
                      🐾
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-stone-900 tracking-tight">
                        VetCheck Digital Health Card
                      </h3>
                      <p className="text-[10px] text-stone-500 font-medium">
                        National Animal Health Identification
                      </p>
                    </div>
                  </div>
                  <div className="text-right pr-6">
                    <span className="text-[11px] font-extrabold text-[#154734] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ID: {animalId}
                    </span>
                  </div>
                </div>

                {/* Animal Primary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Left: Photo & Basic Details */}
                  <div className="sm:col-span-7 flex items-start gap-3.5">
                    {/* Animal Photo */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-stone-100 border-2 border-stone-300 overflow-hidden shrink-0 flex items-center justify-center shadow-inner relative">
                      {profile.photoUri ? (
                        <img
                          src={profile.photoUri}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-3xl sm:text-4xl">
                            {getSpeciesEmoji(profile.species)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Animal Details */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                          {profile.name}
                        </h2>
                      </div>

                      <p className="text-xs font-bold text-[#154734] flex items-center gap-1">
                        <span>{getSpeciesEmoji(profile.species)}</span>
                        <span>{profile.species}</span>
                        {profile.breed && (
                          <span className="text-stone-500 font-normal">
                            • {profile.breed}
                          </span>
                        )}
                      </p>

                      <div className="text-[11px] text-stone-600 space-y-0.5 pt-0.5">
                        <p>
                          <span className="font-semibold text-stone-700">Sex:</span>{" "}
                          {profile.sex || "Not specified"}
                          {(profile.age || profile.approxAge) && (
                            <>
                              {" "}•{" "}
                              <span className="font-semibold text-stone-700">Age:</span>{" "}
                              {profile.age || profile.approxAge}
                            </>
                          )}
                        </p>
                        {profile.tagNumber && (
                          <p>
                            <span className="font-semibold text-stone-700">Tag / Ear ID:</span>{" "}
                            {profile.tagNumber}
                          </p>
                        )}
                      </div>

                      {/* Unique Animal ID Box */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border border-stone-300 transition-colors cursor-pointer"
                          title="Click to copy Animal ID"
                        >
                          <span>{animalId}</span>
                          {copiedId ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-stone-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Embedded QR Code */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white border border-stone-200 rounded-2xl shadow-2xs">
                    {qrDataUrl ? (
                      <div className="relative group cursor-pointer" onClick={() => setActiveTab("qr_view")}>
                        <img
                          src={qrDataUrl}
                          alt="Animal Health QR"
                          className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-stone-900/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-stone-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                            Enlarge QR
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-28 h-28 flex items-center justify-center text-stone-400 text-xs">
                        Generating QR...
                      </div>
                    )}
                    <span className="text-[10px] text-stone-500 font-semibold mt-1">
                      Scan with any camera
                    </span>
                  </div>
                </div>

                {/* Status Badges Row */}
                <div className="mt-4 pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-stone-600">
                      💉 Vaccination Status:
                    </span>
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        vaxStatusType === "up_to_date"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : vaxStatusType === "due_soon"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : vaxStatusType === "overdue"
                          ? "bg-rose-50 text-rose-800 border-rose-300"
                          : "bg-stone-100 text-stone-700 border-stone-300"
                      }`}
                    >
                      {vaxStatusText}
                    </span>
                  </div>

                  <div className="text-[11px] font-medium text-stone-600">
                    <span className="font-bold text-stone-700">📅 Next Care:</span>{" "}
                    {nextCareDate ? (
                      <span className="font-bold text-[#154734]">
                        {new Date(nextCareDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {nextCareTitle ? `(${nextCareTitle})` : ""}
                      </span>
                    ) : (
                      <span className="text-stone-400">All routines logged</span>
                    )}
                  </div>
                </div>

                {/* Lost Pet Contact (If enabled) */}
                {privacy.enableLostPetContact && privacy.lostPetContactPhone && (
                  <div className="mt-3 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-950">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <span className="font-bold">Lost Pet Contact:</span>{" "}
                        <span>{privacy.lostPetContactName ? `${privacy.lostPetContactName} • ` : ""}{privacy.lostPetContactPhone}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                      Publicly Visible
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("qr_view")}
                  className="bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#154734]" />
                  <span>View Public QR</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={isGeneratingPdf}
                  className="bg-[#154734] hover:bg-[#1b553f] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  <span>{isGeneratingPdf ? "Generating..." : "Download Card (PDF)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("vet_share")}
                  className="bg-emerald-50 hover:bg-emerald-100 text-[#154734] border border-emerald-300 font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Stethoscope className="w-4 h-4 text-emerald-700" />
                  <span>Share with Vet</span>
                </button>
              </div>

              {/* Emergency Banner */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-950">
                      🚨 Emergency Veterinary Help (1962)
                    </h4>
                    <p className="text-[11px] text-rose-700">
                      Toll-free 24/7 Mobile Veterinary Clinic & Rescue
                    </p>
                  </div>
                </div>

                <a
                  href="tel:1962"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-transform active:scale-95 shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call 1962</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: QR CODE & PUBLIC SCANNED VIEW SIMULATION */}
          {activeTab === "qr_view" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-white border border-stone-200 rounded-2xl p-5 text-center space-y-4 shadow-2xs">
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    🐾 Live QR Code for {profile.name}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium max-w-md mx-auto mt-0.5">
                    Safe reference identifier. Does not contain raw medical history or sensitive owner data inside the barcode.
                  </p>
                </div>

                {/* Big Scannable QR Container */}
                <div className="p-4 bg-white border-2 border-stone-200 rounded-3xl inline-block shadow-md">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Scannable QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-stone-400 text-xs">
                      Loading QR...
                    </div>
                  )}
                  <div className="mt-2 text-xs font-mono font-bold text-[#154734] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
                    {animalId}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-stone-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download QR Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    className="bg-[#154734] hover:bg-[#1b553f] text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Download Full Card (PDF)</span>
                  </button>
                </div>
              </div>

              {/* What a Scanned Bystander or Vet Sees */}
              <div className="bg-stone-100/90 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-700" />
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Public View Simulation (When Scanned)
                    </h4>
                  </div>
                  <span className="text-[10px] text-stone-500 font-semibold">
                    Controlled by Privacy Settings
                  </span>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {privacy.showPhoto && profile.photoUri ? (
                      <img
                        src={profile.photoUri}
                        alt="Photo"
                        className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-xl border border-stone-200">
                        {getSpeciesEmoji(profile.species)}
                      </div>
                    )}

                    <div>
                      <h5 className="text-sm font-black text-stone-900">
                        {privacy.showName ? profile.name : "Protected Animal Name"}
                      </h5>
                      <p className="text-xs text-stone-600">
                        {privacy.showSpecies ? `${profile.species}${profile.breed ? ` • ${profile.breed}` : ""}` : "Species Protected"}
                      </p>
                      <p className="text-[11px] font-mono text-stone-400">
                        ID: {animalId}
                      </p>
                    </div>
                  </div>

                  {privacy.showVaccinationStatus && (
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-600">Vaccination Status:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {vaxStatusText}
                      </span>
                    </div>
                  )}

                  {privacy.showEmergencyNote && privacy.emergencyNote && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                      <span className="font-bold">⚠️ Care Note: </span>
                      <span>{privacy.emergencyNote}</span>
                    </div>
                  )}

                  {privacy.enableLostPetContact && privacy.lostPetContactPhone && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-center justify-between">
                      <div>
                        <span className="font-bold">Owner Contact: </span>
                        <span>{privacy.lostPetContactName ? `${privacy.lostPetContactName} ` : ""}({privacy.lostPetContactPhone})</span>
                      </div>
                      <a
                        href={`tel:${privacy.lostPetContactPhone}`}
                        className="bg-emerald-700 text-white font-bold text-[11px] px-2 py-1 rounded-md flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    </div>
                  )}

                  {!privacy.showDetailedVaccination && !privacy.showHealthTimeline && !privacy.showPrescriptions && (
                    <p className="text-[10px] text-stone-400 italic text-center pt-1">
                      🔒 Complete clinical history and private records are protected.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OWNER PRIVACY CONTROLS */}
          {activeTab === "privacy" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-700" />
                      <span>Information Visible Through QR</span>
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                      Sensitive medical and private records are OFF by default.
                    </p>
                  </div>

                  {privacySavedToast && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full animate-in fade-in flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 pt-1">
                  {/* Basic Public Details */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Animal Name</span>
                      <p className="text-[11px] text-stone-500">Show "{profile.name}" on public scan</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.showName}
                      onChange={(e) => setPrivacy({ ...privacy, showName: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Animal Photo</span>
                      <p className="text-[11px] text-stone-500">Display photo in public preview</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.showPhoto}
                      onChange={(e) => setPrivacy({ ...privacy, showPhoto: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Animal Type & Species</span>
                      <p className="text-[11px] text-stone-500">{profile.species}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.showSpecies}
                      onChange={(e) => setPrivacy({ ...privacy, showSpecies: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Vaccination Status Badge</span>
                      <p className="text-[11px] text-stone-500">Shows current status ({vaxStatusText})</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.showVaccinationStatus}
                      onChange={(e) => setPrivacy({ ...privacy, showVaccinationStatus: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </label>

                  {/* Sensitive Items (OFF by default) */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Advanced / Sensitive Records (Protected)
                    </span>
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Detailed Vaccination Records</span>
                      <p className="text-[11px] text-stone-500">Specific dates, vaccine brands, and vet names</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.showDetailedVaccination}
                      onChange={(e) => setPrivacy({ ...privacy, showDetailedVaccination: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Health Timeline & Scans</span>
                      <p className="text-[11px] text-stone-500">Historical screening logs and AI reports</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.showHealthTimeline}
                      onChange={(e) => setPrivacy({ ...privacy, showHealthTimeline: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Veterinary Prescriptions</span>
                      <p className="text-[11px] text-stone-500">Dosages and clinical treatment orders</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.showPrescriptions}
                      onChange={(e) => setPrivacy({ ...privacy, showPrescriptions: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-800">Emergency Care Note</span>
                      <p className="text-[11px] text-stone-500">Allergies, chronic conditions or handling warnings</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.showEmergencyNote}
                      onChange={(e) => setPrivacy({ ...privacy, showEmergencyNote: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </label>

                  {privacy.showEmergencyNote && (
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                      <label className="text-[11px] font-bold text-stone-700">
                        Emergency Note Content:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Deaf in right ear, allergic to penicillin, gentle with children"
                        value={privacy.emergencyNote || ""}
                        onChange={(e) => setPrivacy({ ...privacy, emergencyNote: e.target.value })}
                        className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#154734]"
                      />
                    </div>
                  )}
                </div>

                {/* Section: Optional Lost Pet Contact */}
                <div className="pt-3 border-t border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <HeartHandshake className="w-4 h-4 text-amber-700" />
                        <span>Lost Pet Contact (Optional)</span>
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Off by default. Only enabled if you want rescuers to contact you directly.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privacy.enableLostPetContact}
                      onChange={(e) => setPrivacy({ ...privacy, enableLostPetContact: e.target.checked })}
                      className="w-4 h-4 accent-[#154734] cursor-pointer"
                    />
                  </div>

                  {privacy.enableLostPetContact && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 block mb-0.5">
                            Contact Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Ramesh (Owner)"
                            value={privacy.lostPetContactName || ""}
                            onChange={(e) => setPrivacy({ ...privacy, lostPetContactName: e.target.value })}
                            className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-stone-700 block mb-0.5">
                            Primary Phone *
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g. +91 98765 43210"
                            value={privacy.lostPetContactPhone || ""}
                            onChange={(e) => setPrivacy({ ...privacy, lostPetContactPhone: e.target.value })}
                            className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-0.5">
                          City / Locality (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Pune, Kothrud"
                          value={privacy.lostPetContactCity || ""}
                          onChange={(e) => setPrivacy({ ...privacy, lostPetContactCity: e.target.value })}
                          className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePrivacy}
                    className="bg-[#154734] hover:bg-[#1b553f] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Save Privacy Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VETERINARY CLINICAL SHARING */}
          {activeTab === "vet_share" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div>
                  <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-700" />
                    <span>Share Health Record with Vet</span>
                  </h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Select exactly what clinical history to include in a summary report for your veterinarian.
                  </p>
                </div>

                {/* Module Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedShareModules.vaccinations}
                      onChange={(e) =>
                        setSelectedShareModules({ ...selectedShareModules, vaccinations: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#154734]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-stone-800">Vaccination History</span>
                      <p className="text-[10px] text-stone-500">
                        {animalReminders.filter((r) => r.reminderType === "vaccination" || r.type === "vaccination").length} records
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedShareModules.deworming}
                      onChange={(e) =>
                        setSelectedShareModules({ ...selectedShareModules, deworming: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#154734]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-stone-800">Deworming History</span>
                      <p className="text-[10px] text-stone-500">
                        {animalReminders.filter((r) => r.reminderType === "deworming" || r.type === "deworming").length} records
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedShareModules.prescriptions}
                      onChange={(e) =>
                        setSelectedShareModules({ ...selectedShareModules, prescriptions: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#154734]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-stone-800">Prescriptions & Rx</span>
                      <p className="text-[10px] text-stone-500">
                        {animalPrescriptions.length} prescriptions on file
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedShareModules.vetVisits}
                      onChange={(e) =>
                        setSelectedShareModules({ ...selectedShareModules, vetVisits: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#154734]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-stone-800">Prior Vet Visits</span>
                      <p className="text-[10px] text-stone-500">
                        {animalVetVisits.length} recorded visits
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedShareModules.screenings}
                      onChange={(e) =>
                        setSelectedShareModules({ ...selectedShareModules, screenings: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#154734]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-stone-800">Health Reports</span>
                      <p className="text-[10px] text-stone-500">
                        {animalRecords.length} screenings
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedShareModules.recoveryProgress}
                      onChange={(e) =>
                        setSelectedShareModules({ ...selectedShareModules, recoveryProgress: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#154734]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-stone-800">Recovery Progress</span>
                      <p className="text-[10px] text-stone-500">Observations & healing comparisons</p>
                    </div>
                  </label>
                </div>

                {/* Optional Custom Note for Vet */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-stone-700">
                    Add Note for Doctor (Optional):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please check recurring ear itch since last Tuesday. Diet has been normal."
                    value={vetNotes}
                    onChange={(e) => setVetNotes(e.target.value)}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#154734]"
                  />
                </div>

                {/* Export / Share Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleCopyVetShareText}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedShareText ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-stone-500" />
                    )}
                    <span>{copiedShareText ? "Copied to Clipboard!" : "Copy Summary Text"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="bg-emerald-50 hover:bg-emerald-100 text-[#154734] border border-emerald-300 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Share2 className="w-4 h-4 text-emerald-700" />
                      <span>Share (WhatsApp/Apps)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareWithVetPdf}
                      className="bg-[#154734] hover:bg-[#1b553f] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-4 h-4 text-emerald-300" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 border-t border-stone-200 px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-stone-500">
          <span className="font-mono font-medium">
            Permanently linked to {profile.name} ({animalId})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-stone-700 hover:text-stone-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
