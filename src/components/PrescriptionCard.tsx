import React, { useState } from "react";
import {
  Stethoscope,
  Plus,
  Edit2,
  Download,
  Share2,
  Check,
  Calendar,
  Building2,
  Pill,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  CalendarCheck,
  CalendarPlus,
} from "lucide-react";
import { VeterinaryPrescription, UserSettings, CareReminder } from "../types";
import { PrescriptionModal } from "./PrescriptionModal";
import { SetFollowUpModal } from "./SetFollowUpModal";
import { downloadPrescriptionPdf, sharePrescription } from "../utils/prescriptionPdf";
import { saveVeterinaryPrescription } from "../utils/storage";

interface PrescriptionCardProps {
  prescription?: VeterinaryPrescription;
  defaultAnimalName?: string;
  defaultDiagnosis?: string;
  screeningId?: string;
  animalProfileId?: string;
  settings: UserSettings;
  onSavePrescription: (prescription: VeterinaryPrescription) => void;
  onDeletePrescription?: (prescriptionId: string) => void;
}

export const PrescriptionCard: React.FC<PrescriptionCardProps> = ({
  prescription,
  defaultAnimalName,
  defaultDiagnosis,
  screeningId,
  animalProfileId,
  settings,
  onSavePrescription,
  onDeletePrescription,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownload = () => {
    if (!prescription) return;
    downloadPrescriptionPdf(prescription);
    showToast("Prescription PDF downloaded!");
  };

  const handleShare = async () => {
    if (!prescription) return;
    const res = await sharePrescription(prescription);
    if (res.method === "clipboard") {
      showToast("Prescription copied to clipboard!");
    } else if (res.success) {
      showToast("Prescription shared successfully!");
    }
  };

  const handleFollowUpSaved = (reminder: CareReminder) => {
    if (prescription) {
      const updatedPrescription: VeterinaryPrescription = {
        ...prescription,
        followUpDate: reminder.dueDate,
        followUpReason: reminder.reason || reminder.title?.replace(/^Follow-Up: /, ""),
        followUpReminderId: reminder.id,
      };
      saveVeterinaryPrescription(updatedPrescription, screeningId);
      onSavePrescription(updatedPrescription);
      showToast("Follow-up reminder set for " + reminder.dueDate);
    }
  };

  return (
    <div
      id="veterinary-prescription-card"
      className="bg-white border border-[#E8E2D5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3.5 relative"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-2 right-4 z-20 bg-[#154734] text-white px-3 py-1.5 rounded-xl shadow-lg text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl text-[#154734]">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-[#154734]">
              Veterinary Prescription
            </h2>
            <p className="text-[10px] text-stone-400 font-medium">
              Registered Doctor Consultation & Treatment
            </p>
          </div>
        </div>

        {prescription ? (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1 bg-stone-50 hover:bg-stone-100 border border-[#E8E2D5] text-[#154734] text-[11px] font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        ) : (
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Manual Entry
          </span>
        )}
      </div>

      {/* Content */}
      {!prescription ? (
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D5] text-center space-y-2.5">
          <div className="w-10 h-10 mx-auto rounded-full bg-white border border-[#E8E2D5] flex items-center justify-center text-[#154734]">
            <FileText className="w-5 h-5 opacity-70" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              No veterinary prescription has been added yet.
            </p>
            <p className="text-[11px] text-stone-500 max-w-sm mx-auto mt-0.5 font-medium">
              Store genuine medical prescriptions, dosages, and instructions from your visiting veterinarian for easy access and PDF export.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#154734] hover:bg-[#103828] text-white font-black text-xs rounded-xl inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Veterinary Prescription</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Metadata banner */}
          <div className="p-3 bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase block">
                Doctor & Clinic
              </span>
              <span className="font-extrabold text-slate-900 block">
                Dr. {prescription.doctorName}
              </span>
              <span className="text-[11px] text-stone-600 font-medium">
                {prescription.hospitalClinic}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase block">
                Date & Diagnosis
              </span>
              <span className="font-extrabold text-[#154734] block">
                {prescription.diagnosisCondition || "Clinical Checkup"}
              </span>
              <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                <span>{prescription.date}</span>
              </span>
            </div>
          </div>

          {/* Medicines List */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-[#154734] flex items-center gap-1">
              <Pill className="w-3.5 h-3.5" />
              <span>Prescribed Medicines ({prescription.medicines?.length || 0})</span>
            </div>

            <div className="space-y-1.5">
              {prescription.medicines?.map((med, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white border border-[#E8E2D5] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-black text-slate-900">
                      {idx + 1}. {med.name}
                    </span>
                    {med.specialInstructions && (
                      <p className="text-[10px] text-stone-500 italic">
                        Note: {med.specialInstructions}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] shrink-0 font-bold">
                    <span className="px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#E8E2D5] text-[#154734]">
                      {med.dosage}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#E8E2D5] text-slate-700">
                      {med.frequency}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                      {med.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special instructions */}
          {prescription.specialInstructions && (
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl text-xs">
              <span className="font-bold text-[#154734] block mb-0.5">
                Special Instructions / Advice:
              </span>
              <p className="text-slate-700 font-medium leading-relaxed">
                {prescription.specialInstructions}
              </p>
            </div>
          )}

          {/* Follow-Up Reminder Banner */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#154734] text-amber-300 rounded-xl shrink-0">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-black text-[#154734] uppercase tracking-wide block">
                  {prescription.followUpDate ? "Follow-Up Scheduled" : "Veterinary Follow-Up"}
                </span>
                {prescription.followUpDate ? (
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>📅 {prescription.followUpDate}</span>
                    {prescription.followUpReason && (
                      <span className="text-stone-500 font-medium">
                        • {prescription.followUpReason}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-500 font-medium">
                    Set a reminder for the next checkup, suture removal or review.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFollowUpModalOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-emerald-100/50 border border-emerald-300 text-[#154734] font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs self-start sm:self-auto"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-[#154734]" />
              <span>{prescription.followUpDate ? "Change Date" : "Set Follow-Up"}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 py-2 px-3 bg-[#154734] hover:bg-[#103828] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-transform active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="py-2 px-3 bg-white hover:bg-[#FAF8F5] text-[#154734] font-bold text-xs rounded-xl border border-[#E8E2D5] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-transform active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {onDeletePrescription && (
              <button
                type="button"
                onClick={() => onDeletePrescription(prescription.id)}
                className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Delete Prescription"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={isModalOpen}
        initialPrescription={prescription}
        defaultAnimalName={defaultAnimalName}
        defaultDiagnosis={defaultDiagnosis}
        screeningId={screeningId}
        animalProfileId={animalProfileId}
        settings={settings}
        onClose={() => setIsModalOpen(false)}
        onSave={(updated) => {
          onSavePrescription(updated);
          showToast("Prescription saved successfully!");
        }}
      />

      {/* Set Follow-Up Modal */}
      {isFollowUpModalOpen && (
        <SetFollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          onSaved={handleFollowUpSaved}
          defaultAnimalName={prescription?.animalName || defaultAnimalName}
          defaultAnimalProfileId={prescription?.animalProfileId || animalProfileId}
          defaultDate={prescription?.followUpDate}
          defaultReason={prescription?.followUpReason || prescription?.diagnosisCondition || "Post-treatment review"}
          prescriptionId={prescription?.id}
          screeningId={screeningId}
          settings={settings}
        />
      )}
    </div>
  );
};
