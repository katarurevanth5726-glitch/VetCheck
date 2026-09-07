import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  FileText,
  Stethoscope,
  Building2,
  Calendar,
  Pill,
  Clock,
  AlertCircle,
  Check,
  CalendarPlus,
} from "lucide-react";
import { VeterinaryPrescription, PrescriptionMedicine, UserSettings } from "../types";
import { saveReminder } from "../utils/storage";

interface PrescriptionModalProps {
  initialPrescription?: VeterinaryPrescription;
  defaultAnimalName?: string;
  defaultDiagnosis?: string;
  screeningId?: string;
  animalProfileId?: string;
  settings: UserSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (prescription: VeterinaryPrescription) => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  initialPrescription,
  defaultAnimalName = "",
  defaultDiagnosis = "",
  screeningId,
  animalProfileId,
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  const [animalName, setAnimalName] = useState(
    initialPrescription?.animalName || defaultAnimalName || "Patient Animal"
  );
  const [date, setDate] = useState(initialPrescription?.date || todayStr);
  const [doctorName, setDoctorName] = useState(initialPrescription?.doctorName || "");
  const [hospitalClinic, setHospitalClinic] = useState(initialPrescription?.hospitalClinic || "");
  const [diagnosisCondition, setDiagnosisCondition] = useState(
    initialPrescription?.diagnosisCondition || defaultDiagnosis || ""
  );
  const [specialInstructions, setSpecialInstructions] = useState(
    initialPrescription?.specialInstructions || ""
  );

  // Follow-up reminder fields
  const [enableFollowUp, setEnableFollowUp] = useState(
    Boolean(initialPrescription?.followUpDate)
  );
  const [followUpDate, setFollowUpDate] = useState(
    initialPrescription?.followUpDate || ""
  );
  const [followUpReason, setFollowUpReason] = useState(
    initialPrescription?.followUpReason || "Post-treatment review"
  );

  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>(() => {
    if (initialPrescription?.medicines && initialPrescription.medicines.length > 0) {
      return initialPrescription.medicines;
    }
    return [
      {
        id: "med-" + Date.now(),
        name: "",
        dosage: "",
        frequency: "Twice daily",
        duration: "5 days",
        specialInstructions: "",
      },
    ];
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().split("T")[0]);
    setEnableFollowUp(true);
  };

  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        id: "med-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        name: "",
        dosage: "",
        frequency: "Twice daily",
        duration: "5 days",
        specialInstructions: "",
      },
    ]);
  };

  const handleRemoveMedicine = (idx: number) => {
    if (medicines.length <= 1) {
      setMedicines([
        {
          id: "med-" + Date.now(),
          name: "",
          dosage: "",
          frequency: "Twice daily",
          duration: "5 days",
          specialInstructions: "",
        },
      ]);
      return;
    }
    setMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMedicine = (
    idx: number,
    field: keyof PrescriptionMedicine,
    value: string
  ) => {
    setMedicines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalName.trim()) {
      setErrorMsg("Please provide an animal name.");
      return;
    }

    // Filter out empty medicines if more than 1
    const validMeds = medicines.filter((m) => m.name.trim().length > 0);

    const prescriptionId = initialPrescription?.id || "rx-" + Date.now();

    const prescriptionData: VeterinaryPrescription = {
      id: prescriptionId,
      screeningId: screeningId || initialPrescription?.screeningId,
      animalProfileId: animalProfileId || initialPrescription?.animalProfileId,
      animalName: animalName.trim(),
      date: date || todayStr,
      doctorName: doctorName.trim() || "Treating Veterinarian",
      hospitalClinic: hospitalClinic.trim() || "Veterinary Clinic",
      diagnosisCondition: diagnosisCondition.trim() || "Clinical Examination",
      medicines: validMeds.length > 0 ? validMeds : medicines,
      specialInstructions: specialInstructions.trim() || undefined,
      followUpDate: enableFollowUp && followUpDate ? followUpDate : undefined,
      followUpReason: enableFollowUp && followUpDate ? (followUpReason.trim() || "Post-treatment review") : undefined,
      createdAt: initialPrescription?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // If follow-up date specified, automatically create/sync the CareReminder
    if (enableFollowUp && followUpDate) {
      const cleanReason = followUpReason.trim() || "Post-treatment review";
      saveReminder({
        id: initialPrescription?.followUpReminderId,
        animalProfileId: animalProfileId || initialPrescription?.animalProfileId,
        animalName: animalName.trim(),
        reminderType: "follow_up",
        title: `Follow-Up: ${cleanReason}`,
        reason: cleanReason,
        dueDate: followUpDate,
        notes: `Follow-up prescribed by ${doctorName.trim() || "Veterinarian"}. Condition: ${diagnosisCondition.trim() || "Treatment check"}.`,
        prescriptionId: prescriptionId,
        screeningId: screeningId || initialPrescription?.screeningId,
        completed: false,
      });
    }

    onSave(prescriptionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E8E2D5] shadow-2xl max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E2D5] flex items-center justify-between bg-[#154734] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Stethoscope className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {initialPrescription ? "Edit Veterinary Prescription" : "Add Veterinary Prescription"}
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                Record genuine veterinary consultation, diagnosis & prescribed medicines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Clinical Details */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8E2D5] space-y-3 shadow-2xs">
            <div className="text-[11px] font-black uppercase text-[#154734] tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Clinic & Patient Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Animal / Patient Name *
                </label>
                <input
                  type="text"
                  required
                  value={animalName}
                  onChange={(e) => setAnimalName(e.target.value)}
                  placeholder="e.g. Lakshmi (Cow), Bruno (Dog)"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium focus:bg-white focus:outline-[#154734]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  <span>Prescription Date</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium focus:bg-white focus:outline-[#154734]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Veterinary Doctor Name
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. K. Ramesh (B.V.Sc)"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium focus:bg-white focus:outline-[#154734]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Hospital / Clinic Name
                </label>
                <input
                  type="text"
                  value={hospitalClinic}
                  onChange={(e) => setHospitalClinic(e.target.value)}
                  placeholder="e.g. Govt. Veterinary Dispensary, Ongole"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium focus:bg-white focus:outline-[#154734]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Diagnosis / Clinical Condition
                </label>
                <input
                  type="text"
                  value={diagnosisCondition}
                  onChange={(e) => setDiagnosisCondition(e.target.value)}
                  placeholder="e.g. Corneal Opacity / Allergic Dermatitis"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl font-medium focus:bg-white focus:outline-[#154734]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Prescribed Medicines */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8E2D5] space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-black uppercase text-[#154734] tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" />
                <span>Prescribed Medications (Rx)</span>
              </div>
              <button
                type="button"
                onClick={handleAddMedicine}
                className="px-2.5 py-1 bg-[#154734] hover:bg-[#103828] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>Add Medicine</span>
              </button>
            </div>

            <div className="space-y-3">
              {medicines.map((med, idx) => (
                <div
                  key={med.id || idx}
                  className="p-3 bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#154734]">
                      Medicine #{idx + 1}
                    </span>
                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => handleUpdateMedicine(idx, "name", e.target.value)}
                        placeholder="Medicine Name (e.g., Vet Clavam 250mg, Ointment, Spray)"
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold focus:outline-[#154734]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                        Dosage / Quantity
                      </label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => handleUpdateMedicine(idx, "dosage", e.target.value)}
                        placeholder="e.g. 1 Tablet / 5 ml / Apply thin layer"
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs focus:outline-[#154734]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                        Frequency
                      </label>
                      <select
                        value={med.frequency}
                        onChange={(e) => handleUpdateMedicine(idx, "frequency", e.target.value)}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-[#154734]"
                      >
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily (Morning & Evening)</option>
                        <option value="3 times daily">3 times daily (Every 8 hours)</option>
                        <option value="Once every 2 days">Once every 2 days</option>
                        <option value="Weekly">Weekly</option>
                        <option value="As needed for pain/itch">As needed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => handleUpdateMedicine(idx, "duration", e.target.value)}
                        placeholder="e.g. 5 days, 7 days, 2 weeks"
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs focus:outline-[#154734]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                        Specific Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={med.specialInstructions || ""}
                        onChange={(e) => handleUpdateMedicine(idx, "specialInstructions", e.target.value)}
                        placeholder="e.g. After food / Keep wound dry"
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs focus:outline-[#154734]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: General Vet Instructions */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8E2D5] space-y-2 shadow-2xs">
            <label className="block text-[11px] font-black uppercase text-[#154734] tracking-wider">
              General Doctor Instructions & Clinical Notes
            </label>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g., Keep wound clean and dry. Avoid cold water baths."
              className="w-full p-2.5 bg-[#FAF8F5] border border-stone-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-[#154734]"
            />
          </div>

          {/* Section 4: Set Follow-Up Reminder (Requested Feature) */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#154734] text-amber-300 rounded-lg">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-[#154734] block">
                    📅 Set Follow-Up Reminder
                  </span>
                  <span className="text-[10px] text-emerald-800 font-medium">
                    Remind me for the next checkup, wound check or re-examination
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableFollowUp}
                  onChange={(e) => {
                    setEnableFollowUp(e.target.checked);
                    if (e.target.checked && !followUpDate) {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setFollowUpDate(d.toISOString().split("T")[0]);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#154734]"></div>
              </label>
            </div>

            {enableFollowUp && (
              <div className="pt-2 space-y-3 border-t border-emerald-200/60 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Follow-Up Date *
                    </label>
                    <input
                      type="date"
                      required={enableFollowUp}
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-[#154734]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Reason (Optional)
                    </label>
                    <input
                      type="text"
                      value={followUpReason}
                      onChange={(e) => setFollowUpReason(e.target.value)}
                      placeholder="e.g. Skin recheck, Wound check"
                      className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-medium focus:outline-[#154734]"
                    />
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-emerald-900">Quick presets:</span>
                  {[
                    { label: "+3 Days", days: 3 },
                    { label: "+5 Days", days: 5 },
                    { label: "+7 Days", days: 7 },
                    { label: "+14 Days", days: 14 },
                    { label: "+1 Month", days: 30 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => handleQuickDays(p.days)}
                      className="px-2 py-0.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-md text-[10px] font-bold text-[#154734] transition-colors cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#154734] hover:bg-[#103828] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Prescription</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
