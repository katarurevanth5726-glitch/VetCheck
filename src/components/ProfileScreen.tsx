import React, { useState } from "react";
import {
  PawPrint,
  Plus,
  Trash2,
  Tag,
  Calendar,
  CheckCircle,
  X,
  Stethoscope,
  ChevronRight,
  Sparkles,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Camera,
  Activity,
  UserCheck,
  ShieldCheck,
  Clock,
  Download,
  Scissors,
  Syringe,
  Pill,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  CalendarPlus,
  Edit2,
  CheckCircle2,
  QrCode,
  MoreVertical,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AnimalProfile, ScreeningRecord, UserSettings, CareReminder } from "../types";
import { VeterinaryReportModal } from "./VeterinaryReportModal";
import { FollowUpModal } from "./FollowUpModal";
import { VaccinationDewormingSection } from "./VaccinationDewormingSection";
import { AnimalHealthTimeline } from "./AnimalHealthTimeline";
import { SetFollowUpModal } from "./SetFollowUpModal";
import { AnimalQRHealthCardModal } from "./AnimalQRHealthCardModal";
import { downloadPrescriptionPdf } from "../utils/prescriptionPdf";
import { getRemindersForAnimal, toggleReminderCompleted } from "../utils/storage";
import { useModalHistory } from "../utils/useModalHistory";

interface ProfileScreenProps {
  profiles: AnimalProfile[];
  records: ScreeningRecord[];
  settings: UserSettings;
  onSaveProfile: (profile: AnimalProfile) => void;
  onDeleteProfile: (id: string) => void;
  onSelectProfileToScan?: (profile: AnimalProfile) => void;
  onSelectRecord?: (record: ScreeningRecord) => void;
  onOpenNearbyPetSalons?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profiles,
  records,
  settings,
  onSaveProfile,
  onDeleteProfile,
  onSelectProfileToScan,
  onSelectRecord,
  onOpenNearbyPetSalons,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Cattle / Cow");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"Male" | "Female" | "Unknown">("Female");
  const [tagNumber, setTagNumber] = useState("");
  const [color, setColor] = useState("");
  const [vaccinationStatus, setVaccinationStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProfileDetail, setSelectedProfileDetail] = useState<AnimalProfile | null>(null);
  const [profileTabs, setProfileTabs] = useState<Record<string, "timeline" | "care" | "qr-card" | "screenings" | "details">>({});
  const [remindersVersion, setRemindersVersion] = useState(0);

  // QR Health Card Modal State
  const [qrHealthCardModalProfile, setQrHealthCardModalProfile] = useState<AnimalProfile | null>(null);

  // Follow-Up Reminders Modals State
  const [followUpModalProfile, setFollowUpModalProfile] = useState<AnimalProfile | null>(null);
  const [editingReminder, setEditingReminder] = useState<CareReminder | null>(null);

  // Modals for selected records
  const [selectedReportRecord, setSelectedReportRecord] = useState<ScreeningRecord | null>(null);
  const [selectedFollowUpRecord, setSelectedFollowUpRecord] = useState<ScreeningRecord | null>(null);

  // Safe Deletion Modal and Menu States
  const [profileToDelete, setProfileToDelete] = useState<AnimalProfile | null>(null);
  const [activeMenuProfileId, setActiveMenuProfileId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useModalHistory({
    isOpen: Boolean(profileToDelete),
    onClose: () => setProfileToDelete(null),
    modalKey: "delete_profile_confirm",
  });

  const getActiveTab = (profileId: string): "timeline" | "care" | "qr-card" | "screenings" | "details" => {
    return profileTabs[profileId] || "timeline";
  };

  const setActiveTab = (profileId: string, tab: "timeline" | "care" | "qr-card" | "screenings" | "details") => {
    setProfileTabs((prev) => ({ ...prev, [profileId]: tab }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProfile: AnimalProfile = {
      id: "animal-" + Date.now(),
      name: name.trim(),
      species,
      breed: breed.trim() || undefined,
      approxAge: age.trim() || undefined,
      age: age.trim() || undefined,
      sex,
      tagNumber: tagNumber.trim() || undefined,
      color: color.trim() || undefined,
      vaccinationStatus: vaccinationStatus.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    onSaveProfile(newProfile);
    setIsAdding(false);
    setName("");
    setBreed("");
    setAge("");
    setTagNumber("");
    setColor("");
    setVaccinationStatus("");
    setNotes("");
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
    <div className="max-w-xl mx-auto space-y-4 pb-20 animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#252A27] flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-[#315C4C]" />
            <span>Animal Health Passport</span>
          </h1>
          <p className="text-xs text-[#626963] font-normal">
            Local animal profiles, medical logs, and health timelines
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenNearbyPetSalons && (
            <button
              onClick={onOpenNearbyPetSalons}
              className="bg-white hover:bg-[#FAF9F5] text-[#252A27] border border-[#E5E3DC] font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Find nearby pet grooming centers"
            >
              <Scissors className="w-3.5 h-3.5 text-[#315C4C]" />
              <span className="hidden sm:inline">Pet Salons</span>
            </button>
          )}

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-[#315C4C] hover:bg-[#25473B] text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isAdding ? "Cancel" : "Add Animal"}</span>
          </button>
        </div>
      </div>

      {/* Add Animal Registration Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-in fade-in"
        >
          <div className="text-xs font-bold text-[#252A27] border-b border-[#E5E3DC] pb-2">
            Register New Animal Profile
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
                Name or Tag Identifier *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gauri / Sheru / Cow #4"
                className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
                Species / Animal Type
              </label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              >
                <option value="Cattle / Cow">Cattle / Cow (गाय)</option>
                <option value="Buffalo">Buffalo (भैंस)</option>
                <option value="Goat / Sheep">Goat / Sheep (बकरी/भेड़)</option>
                <option value="Dog">Dog (कुत्ता)</option>
                <option value="Cat">Cat (बिल्ली)</option>
                <option value="Poultry / Chicken">Poultry / Chicken (मुर्गी)</option>
                <option value="Horse / Donkey">Horse / Donkey (घोड़ा/गधा)</option>
                <option value="Other">Other Animal</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
                Breed / Variety (Optional)
              </label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Gir / Murrah / Sahiwal / Indie"
                className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
                Approximate Age
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 3 Years / 6 Months"
                className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
                Sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
                Tag / Ear Tag # (Optional)
              </label>
              <input
                type="text"
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
                placeholder="e.g. MH-VET-4091"
                className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
                Vaccination Status (Optional)
              </label>
              <input
                type="text"
                value={vaccinationStatus}
                onChange={(e) => setVaccinationStatus(e.target.value)}
                placeholder="e.g. FMD vaccinated in March"
                className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
                Color / Markings
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. White patch on forehead"
                className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#252A27] block mb-1">
              Medical Notes / History
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any past illnesses, milk production history, or allergies..."
              rows={2}
              className="w-full text-xs p-2.5 rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-2 text-xs font-semibold text-[#626963] hover:text-[#252A27] rounded-lg hover:bg-[#FAF9F5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#315C4C] hover:bg-[#25473B] text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors"
            >
              Save Animal Profile
            </button>
          </div>
        </form>
      )}

      {/* Profiles List */}
      {profiles.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#E5E3DC] space-y-3 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center">
            <PawPrint className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#252A27]">No Animals Registered Yet</h3>
          <p className="text-xs text-[#626963] max-w-sm mx-auto font-normal">
            Create an animal profile to automatically organize screenings, follow-up logs, and veterinary health passports.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-[#315C4C] hover:bg-[#25473B] text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors"
          >
            Register First Animal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => {
            const animalRecords = records.filter(
              (r) =>
                r.animalProfileId === profile.id ||
                (r.selectedAnimal && r.selectedAnimal.toLowerCase().includes(profile.species.toLowerCase().split(" ")[0]))
            );
            const isSelected = selectedProfileDetail?.id === profile.id;

            return (
              <div
                key={profile.id}
                className="bg-white rounded-2xl border border-[#E5E3DC] shadow-xs overflow-hidden transition-colors hover:border-[#315C4C]"
              >
                {/* Profile Card Summary Header */}
                <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#E7EEE9] border border-[#D2DFD7] flex items-center justify-center text-2xl shrink-0">
                      {getSpeciesEmoji(profile.species)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#252A27] truncate">
                          {profile.name}
                        </h3>
                        {profile.tagNumber && (
                          <span className="text-[10px] font-semibold bg-[#FAF9F5] text-[#626963] border border-[#E5E3DC] px-2 py-0.5 rounded flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-[#858B86]" />
                            <span>{profile.tagNumber}</span>
                          </span>
                        )}
                        <span className="text-[10px] font-semibold bg-[#E7EEE9] text-[#25473B] border border-[#D2DFD7] px-2 py-0.5 rounded">
                          {profile.species}
                        </span>
                      </div>

                      <div className="text-xs text-[#626963] font-normal flex items-center gap-3 mt-1 flex-wrap">
                        {profile.breed && <span>Breed: {profile.breed}</span>}
                        {(profile.approxAge || profile.age) && (
                          <span>Age: {profile.approxAge || profile.age}</span>
                        )}
                        {profile.sex && <span>Sex: {profile.sex}</span>}
                        {profile.vaccinationStatus && (
                          <span className="text-[#315C4C] font-semibold">
                            ✓ {profile.vaccinationStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrHealthCardModalProfile(profile);
                      }}
                      className="px-2.5 py-1.5 bg-[#FAF9F5] hover:bg-[#E7EEE9] text-[#315C4C] border border-[#E5E3DC] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Open Animal QR Health Card"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#315C4C]" />
                      <span className="hidden sm:inline">QR Card</span>
                      <span className="sm:hidden">QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectProfileToScan(profile)}
                      className="px-3 py-1.5 bg-[#315C4C] hover:bg-[#25473B] text-white font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Screen</span>
                    </button>

                    {/* Three-Dot More Options Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuProfileId(activeMenuProfileId === profile.id ? null : profile.id);
                        }}
                        className="p-1.5 text-[#858B86] hover:text-[#252A27] rounded-lg hover:bg-[#FAF9F5] cursor-pointer"
                        title="More options"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuProfileId === profile.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuProfileId(null);
                            }}
                          />
                          <div
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-[#E5E3DC] p-1.5 z-30 space-y-0.5 animate-in fade-in duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuProfileId(null);
                                setSelectedProfileDetail(profile);
                                setActiveTab(profile.id, "details");
                              }}
                              className="w-full text-left px-2.5 py-2 text-xs text-[#252A27] hover:bg-[#FAF9F5] rounded-lg flex items-center gap-2 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#626963]" />
                              <span>View Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuProfileId(null);
                                setQrHealthCardModalProfile(profile);
                              }}
                              className="w-full text-left px-2.5 py-2 text-xs text-[#252A27] hover:bg-[#FAF9F5] rounded-lg flex items-center gap-2 cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#315C4C]" />
                              <span>Open QR Card</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuProfileId(null);
                                setFollowUpModalProfile(profile);
                              }}
                              className="w-full text-left px-2.5 py-2 text-xs text-[#252A27] hover:bg-[#FAF9F5] rounded-lg flex items-center gap-2 cursor-pointer"
                            >
                              <CalendarPlus className="w-3.5 h-3.5 text-[#315C4C]" />
                              <span>Set Care Reminder</span>
                            </button>

                            <div className="my-1 border-t border-[#E5E3DC]" />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuProfileId(null);
                                setProfileToDelete(profile);
                              }}
                              className="w-full text-left px-2.5 py-2 text-xs text-[#B44A4A] hover:bg-[#FDF3F3] rounded-lg flex items-center gap-2 cursor-pointer font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#B44A4A]" />
                              <span>Delete Animal</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProfileDetail(isSelected ? null : profile)
                      }
                      className="p-2 text-[#858B86] hover:text-[#252A27] rounded-lg hover:bg-[#FAF9F5] cursor-pointer"
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${isSelected ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Upcoming Vet Visit Status Card on Animal Profile */}
                {(() => {
                  const animalReminders = getRemindersForAnimal(profile.id);
                  const upcomingFollowUp = animalReminders.find(
                    (r) => (r.reminderType === "follow_up" || r.type === "follow_up") && !r.completed
                  );

                  if (upcomingFollowUp) {
                    const due = new Date(upcomingFollowUp.dueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdue = due < today;
                    const isDueToday = due.toDateString() === new Date().toDateString();

                    return (
                      <div className="mx-4 sm:mx-5 mb-3.5 p-3.5 bg-[#FAF9F5] border border-[#E5E3DC] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                              isOverdue
                                ? "bg-[#B44A4A] text-white"
                                : isDueToday
                                ? "bg-[#B25E00] text-white"
                                : "bg-[#315C4C] text-white"
                            }`}
                          >
                            <CalendarCheck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-[#315C4C] uppercase tracking-wide">
                                {isDueToday
                                  ? "🩺 Vet Visit Today"
                                  : isOverdue
                                  ? "⚠️ Overdue Vet Visit"
                                  : "🩺 Upcoming Vet Visit"}
                              </span>
                              <span
                                className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  isOverdue
                                    ? "bg-[#FDF2F2] text-[#B44A4A] border border-[#F2D6D6]"
                                    : isDueToday
                                    ? "bg-[#FFF4E5] text-[#B25E00] border border-[#FFE2BA]"
                                    : "bg-[#E7EEE9] text-[#25473B] border border-[#D2DFD7]"
                                }`}
                              >
                                {isDueToday
                                  ? "Today"
                                  : due.toLocaleDateString("en-IN", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-[#252A27] mt-0.5 truncate">
                              {upcomingFollowUp.reason || upcomingFollowUp.title || "Follow-up Checkup"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 pl-9 sm:pl-0">
                          <button
                            type="button"
                            onClick={() => onSelectProfileToScan(profile)}
                            className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-[#315C4C] border border-[#E5E3DC] rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Camera className="w-3 h-3 text-[#315C4C]" />
                            <span>Add Recovery Photo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingReminder(upcomingFollowUp)}
                            className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-[#252A27] border border-[#E5E3DC] rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-[#626963]" />
                            <span>Change Date</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              toggleReminderCompleted(upcomingFollowUp.id);
                              setRemindersVersion((v) => v + 1);
                            }}
                            className="px-2.5 py-1 bg-[#315C4C] hover:bg-[#25473B] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                            <span>Mark Done</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="mx-4 sm:mx-5 mb-3 flex items-center justify-between py-1.5 px-3 bg-[#FAF9F5] border border-dashed border-[#E5E3DC] rounded-lg">
                      <span className="text-[11px] text-[#626963] font-normal">
                        No upcoming vet visit scheduled
                      </span>
                      <button
                        type="button"
                        onClick={() => setFollowUpModalProfile(profile)}
                        className="text-[11px] text-[#315C4C] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CalendarPlus className="w-3 h-3 text-[#315C4C]" />
                        <span>+ Set Follow-Up</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Expanded Sub-Tabs: Health & Care, Recovery Screenings, Details */}
                {isSelected && (
                  <div className="p-4 sm:p-5 bg-[#FAF9F5] border-t border-[#E5E3DC] space-y-4 animate-in fade-in">
                    {/* Navigation Sub-Tabs */}
                    <div className="flex items-center gap-1.5 border-b border-[#E5E3DC] pb-2 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab(profile.id, "timeline")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          getActiveTab(profile.id) === "timeline"
                            ? "bg-[#315C4C] text-white"
                            : "bg-white border border-[#E5E3DC] text-[#626963] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Health Timeline</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab(profile.id, "qr-card")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          getActiveTab(profile.id) === "qr-card"
                            ? "bg-[#315C4C] text-white"
                            : "bg-white border border-[#E5E3DC] text-[#626963] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Health Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab(profile.id, "care")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          getActiveTab(profile.id) === "care"
                            ? "bg-[#315C4C] text-white"
                            : "bg-white border border-[#E5E3DC] text-[#626963] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <Syringe className="w-3.5 h-3.5" />
                        <span>Vaccination & Deworming</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab(profile.id, "screenings")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          getActiveTab(profile.id) === "screenings"
                            ? "bg-[#315C4C] text-white"
                            : "bg-white border border-[#E5E3DC] text-[#626963] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Recovery Tracker ({animalRecords.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab(profile.id, "details")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          getActiveTab(profile.id) === "details"
                            ? "bg-[#315C4C] text-white"
                            : "bg-white border border-[#E5E3DC] text-[#626963] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Passport Details</span>
                      </button>
                    </div>

                    {/* Sub-Tab 0: Health Timeline */}
                    {getActiveTab(profile.id) === "timeline" && (
                      <AnimalHealthTimeline
                        profile={profile}
                        allRecords={records}
                        settings={settings}
                        onNavigateToScan={onSelectProfileToScan}
                      />
                    )}

                    {/* Sub-Tab 0.5: QR Health Card */}
                    {getActiveTab(profile.id) === "qr-card" && (
                      <div className="p-4 sm:p-5 bg-white rounded-xl border border-[#E5E3DC] space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#E7EEE9] border border-[#D2DFD7] flex items-center justify-center text-[#315C4C]">
                              <QrCode className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#252A27]">
                                {profile.name} Digital QR Health Card
                              </h4>
                              <p className="text-xs text-[#626963] font-normal">
                                Permanent National Animal ID:{" "}
                                <span className="font-mono font-semibold text-[#315C4C]">
                                  {profile.animalId || "VC-PENDING"}
                                </span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setQrHealthCardModalProfile(profile)}
                            className="px-4 py-2.5 bg-[#315C4C] hover:bg-[#25473B] text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
                          >
                            <QrCode className="w-4 h-4 text-emerald-200" />
                            <span>Open Digital Card & QR Controls</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div className="p-3.5 bg-[#FAF9F5] rounded-lg border border-[#E5E3DC] space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#252A27]">
                              <FileText className="w-4 h-4 text-[#315C4C]" />
                              <span>Printable Health Card</span>
                            </div>
                            <p className="text-[11px] text-[#626963]">
                              Download official ID card in A6/Passport format with photo, species, and vaccination badge.
                            </p>
                          </div>

                          <div className="p-3.5 bg-[#FAF9F5] rounded-lg border border-[#E5E3DC] space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#252A27]">
                              <ShieldCheck className="w-4 h-4 text-[#315C4C]" />
                              <span>Owner Privacy Shield</span>
                            </div>
                            <p className="text-[11px] text-[#626963]">
                              Medical history & private info is hidden by default. Optional Lost Pet contact phone.
                            </p>
                          </div>

                          <div className="p-3.5 bg-[#FAF9F5] rounded-lg border border-[#E5E3DC] space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#252A27]">
                              <Stethoscope className="w-4 h-4 text-[#315C4C]" />
                              <span>Share with Vet</span>
                            </div>
                            <p className="text-[11px] text-[#626963]">
                              Selectively share vaccine records, prescriptions & recovery timeline with veterinarians.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub-Tab 1: Care (Vaccination & Deworming) */}
                    {getActiveTab(profile.id) === "care" && (
                      <VaccinationDewormingSection
                        animalProfile={profile}
                        settings={settings}
                      />
                    )}

                    {/* Sub-Tab 2: Screenings & Recovery Tracking */}
                    {getActiveTab(profile.id) === "screenings" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-[#252A27] flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-[#315C4C]" />
                            <span>Recovery Logs & AI Visual Comparisons</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onSelectProfileToScan(profile)}
                            className="px-3 py-1.5 bg-[#315C4C] hover:bg-[#25473B] text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>New Recovery Scan</span>
                          </button>
                        </div>

                        {animalRecords.length === 0 ? (
                          <div className="p-6 text-center bg-white rounded-xl border border-[#E5E3DC] space-y-2">
                            <Activity className="w-8 h-8 text-[#858B86] mx-auto" />
                            <p className="text-xs text-[#252A27] font-semibold">No recovery scans recorded for {profile.name} yet.</p>
                            <p className="text-[11px] text-[#626963] max-w-xs mx-auto">
                              Take an initial photo of any wound, skin condition, or eye issue to start tracking recovery progress over time.
                            </p>
                            <button
                              type="button"
                              onClick={() => onSelectProfileToScan(profile)}
                              className="mt-1 px-4 py-2 bg-[#315C4C] hover:bg-[#25473B] text-white font-semibold text-xs rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Start Recovery Tracking</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {animalRecords.map((record) => (
                              <div
                                key={record.id}
                                className="p-3.5 bg-white rounded-xl border border-[#E5E3DC] space-y-2.5 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={record.imageThumbnail}
                                      alt="Screening baseline"
                                      className="w-12 h-12 rounded-lg object-cover border border-[#E5E3DC] shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div>
                                      <div className="text-xs font-bold text-[#252A27]">
                                        {(typeof record.result.detectedAnimal === "object" && record.result.detectedAnimal !== null
                                          ? record.result.detectedAnimal.name
                                          : record.result.detectedAnimal) ||
                                          record.result.animalType ||
                                          record.selectedAnimal ||
                                          "Animal"}
                                        {record.bodyArea && ` • ${record.bodyArea}`}
                                      </div>
                                      <div className="text-[10px] text-[#858B86] font-normal">
                                        Baseline: {new Date(record.timestamp).toLocaleDateString("en-IN", {
                                          dateStyle: "medium",
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                        record.result.severity === "Emergency"
                                          ? "bg-[#FDF2F2] text-[#B44A4A] border-[#F2D6D6]"
                                          : record.result.severity === "Serious"
                                          ? "bg-[#FFF4E5] text-[#B25E00] border-[#FFE2BA]"
                                          : "bg-[#E7EEE9] text-[#25473B] border-[#D2DFD7]"
                                      }`}
                                    >
                                      {record.result.severity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReportRecord(record)}
                                      className="p-1.5 bg-[#FAF9F5] hover:bg-[#E7EEE9] text-[#252A27] border border-[#E5E3DC] rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                      title="View Health Report"
                                    >
                                      <FileText className="w-3 h-3 text-[#315C4C]" />
                                      <span>Summary</span>
                                    </button>
                                    {record.prescription && (
                                      <button
                                        type="button"
                                        onClick={() => downloadPrescriptionPdf(record.prescription!)}
                                        className="p-1.5 bg-[#E7EEE9] hover:bg-[#D2DFD7] text-[#25473B] rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer border border-[#D2DFD7]"
                                        title="Download Prescription PDF"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Rx PDF</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedFollowUpRecord(record)}
                                      className="p-1.5 bg-white hover:bg-[#FAF9F5] text-[#315C4C] border border-[#E5E3DC] rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                      title="Add follow-up photo & compare recovery"
                                    >
                                      <Camera className="w-3 h-3" />
                                      <span>+ Follow-Up</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Follow-up Checkpoints */}
                                {record.followUps && record.followUps.length > 0 ? (
                                  <div className="pt-2 border-t border-[#E5E3DC] space-y-1.5">
                                    <span className="text-[10px] font-semibold text-[#626963] uppercase">
                                      Recovery Timeline ({record.followUps.length} Checkpoints):
                                    </span>
                                    {record.followUps.map((fl) => (
                                      <div
                                        key={fl.id}
                                        className="p-2.5 bg-[#FAF9F5] rounded-lg text-xs flex items-center justify-between gap-2 border border-[#E5E3DC]"
                                      >
                                        <div className="flex items-center gap-2">
                                          {fl.followUpImage && (
                                            <img
                                              src={fl.followUpImage}
                                              alt="Follow-up"
                                              className="w-7 h-7 rounded-md object-cover border border-[#E5E3DC]"
                                              referrerPolicy="no-referrer"
                                            />
                                          )}
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              {fl.statusCondition === "improving" ? (
                                                <TrendingUp className="w-3.5 h-3.5 text-[#315C4C]" />
                                              ) : fl.statusCondition === "worsening" ? (
                                                <TrendingDown className="w-3.5 h-3.5 text-[#B44A4A]" />
                                              ) : (
                                                <Minus className="w-3.5 h-3.5 text-[#7D6608]" />
                                              )}
                                              <span className="font-semibold text-[#252A27]">
                                                {fl.scheduledLabel}: {fl.statusCondition?.toUpperCase() || "LOGGED"}
                                              </span>
                                            </div>
                                            {fl.newObservedSigns && (
                                              <p className="text-[10px] text-[#626963] truncate max-w-[200px]">
                                                {fl.newObservedSigns}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {fl.comparisonResult && (
                                          <span className="text-[10px] font-semibold text-[#25473B] bg-[#E7EEE9] border border-[#D2DFD7] px-2 py-0.5 rounded shrink-0">
                                            AI: {fl.comparisonResult.status}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-[#858B86] pt-1 flex items-center justify-between">
                                    <span>No follow-up photos logged yet.</span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedFollowUpRecord(record)}
                                      className="text-[#315C4C] font-semibold hover:underline"
                                    >
                                      Log first checkup →
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-Tab 3: Passport Details */}
                    {getActiveTab(profile.id) === "details" && (
                      <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E5E3DC]">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[#858B86] font-semibold block text-[10px] uppercase">Registered Species</span>
                            <span className="font-bold text-[#252A27]">{profile.species}</span>
                          </div>
                          <div>
                            <span className="text-[#858B86] font-semibold block text-[10px] uppercase">Breed</span>
                            <span className="font-bold text-[#252A27]">{profile.breed || "Not specified"}</span>
                          </div>
                          <div>
                            <span className="text-[#858B86] font-semibold block text-[10px] uppercase">Age / Sex</span>
                            <span className="font-bold text-[#252A27]">
                              {profile.approxAge || profile.age || "Unknown"} • {profile.sex || "Unknown"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#858B86] font-semibold block text-[10px] uppercase">Ear Tag / ID Number</span>
                            <span className="font-bold text-[#252A27]">{profile.tagNumber || "None"}</span>
                          </div>
                        </div>

                        {profile.notes && (
                          <div className="pt-2 border-t border-[#E5E3DC]">
                            <span className="text-[#858B86] font-semibold block text-[10px] uppercase mb-1">Medical Notes & History</span>
                            <p className="text-xs text-[#626963] leading-relaxed bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E5E3DC] font-normal">
                              {profile.notes}
                            </p>
                          </div>
                        )}

                        <div className="pt-3 border-t border-[#E5E3DC] flex justify-end">
                          <button
                            type="button"
                            onClick={() => setProfileToDelete(profile)}
                            className="text-xs text-[#B44A4A] hover:text-[#963C3C] font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#FDF3F3] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Animal Profile</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals for viewing record summary / follow-up directly from profile */}
      {selectedReportRecord && (
        <VeterinaryReportModal
          result={selectedReportRecord.result}
          record={selectedReportRecord}
          animalProfile={profiles.find((p) => p.id === selectedReportRecord.animalProfileId)}
          selectedAnimal={selectedReportRecord.selectedAnimal}
          bodyArea={selectedReportRecord.bodyArea}
          symptoms={selectedReportRecord.symptomsInput}
          settings={settings}
          onClose={() => setSelectedReportRecord(null)}
        />
      )}

      {selectedFollowUpRecord && (
        <FollowUpModal
          record={selectedFollowUpRecord}
          settings={settings}
          animalProfile={profiles.find((p) => p.id === selectedFollowUpRecord.animalProfileId)}
          onClose={() => setSelectedFollowUpRecord(null)}
          onSaved={() => {
            setSelectedFollowUpRecord(null);
            setRemindersVersion((v) => v + 1);
          }}
        />
      )}

      {/* Set Follow-Up Modal for Creating New Follow-Up */}
      {followUpModalProfile && (
        <SetFollowUpModal
          isOpen={Boolean(followUpModalProfile)}
          onClose={() => setFollowUpModalProfile(null)}
          onSaved={() => {
            setFollowUpModalProfile(null);
            setRemindersVersion((v) => v + 1);
          }}
          defaultAnimalName={followUpModalProfile.name}
          defaultAnimalProfileId={followUpModalProfile.id}
          settings={settings}
        />
      )}

      {/* Set Follow-Up Modal for Editing Existing Follow-Up */}
      {editingReminder && (
        <SetFollowUpModal
          isOpen={Boolean(editingReminder)}
          onClose={() => setEditingReminder(null)}
          onSaved={() => {
            setEditingReminder(null);
            setRemindersVersion((v) => v + 1);
          }}
          defaultAnimalName={editingReminder.animalName}
          defaultAnimalProfileId={editingReminder.animalProfileId}
          defaultDate={editingReminder.dueDate}
          defaultReason={editingReminder.reason || editingReminder.title?.replace(/^Follow-Up: /, "")}
          prescriptionId={editingReminder.prescriptionId}
          screeningId={editingReminder.screeningId}
          settings={settings}
        />
      )}
      {/* Animal QR Health Card Modal */}
      {qrHealthCardModalProfile && (
        <AnimalQRHealthCardModal
          isOpen={Boolean(qrHealthCardModalProfile)}
          onClose={() => setQrHealthCardModalProfile(null)}
          profile={qrHealthCardModalProfile}
          allRecords={records}
          settings={settings}
          onProfileUpdated={(updated) => {
            onSaveProfile(updated);
            setQrHealthCardModalProfile(updated);
          }}
        />
      )}

      {/* Safe Delete Animal Confirmation Dialog Modal */}
      {profileToDelete && (
        <div
          id="delete-animal-confirmation-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-animal-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !isDeleting && setProfileToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E3DC] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#FDF3F3] text-[#B44A4A] border border-[#F5C7C7] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-animal-dialog-title" className="text-base font-bold text-[#252A27]">
                  Delete {profileToDelete.name}?
                </h3>
                <p className="text-xs text-[#626963] mt-1.5 font-normal leading-relaxed">
                  This will remove this animal profile and its associated VetCheck records. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-[#FAF9F5] rounded-xl p-3.5 border border-[#E5E3DC] text-xs text-[#626963] space-y-2 font-normal">
              <div className="font-semibold text-[#252A27] text-[11px] uppercase tracking-wider">
                Records that will be permanently cleared:
              </div>
              <ul className="space-y-1.5 text-xs text-[#626963]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B44A4A] shrink-0" />
                  <span>Animal profile, identification & QR health card</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B44A4A] shrink-0" />
                  <span>Health scan screenings & recovery timeline logs</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B44A4A] shrink-0" />
                  <span>Care reminders, vaccination & deworming schedules</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B44A4A] shrink-0" />
                  <span>Veterinary prescriptions & clinic visit history</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="cancel-delete-animal-btn"
                disabled={isDeleting}
                onClick={() => setProfileToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E3DC] bg-white text-xs font-semibold text-[#626963] hover:bg-[#FAF9F5] hover:text-[#252A27] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-animal-btn"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    onDeleteProfile(profileToDelete.id);
                    setProfileToDelete(null);
                  } catch (err) {
                    console.error("Delete error:", err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-[#B44A4A] hover:bg-[#963C3C] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Animal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
