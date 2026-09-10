import React, { useState, useMemo } from "react";
import {
  History,
  Trash2,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  Download,
  AlertCircle,
  ExternalLink,
  PawPrint,
  CheckCircle,
  Share2,
  ArrowUpDown,
  Clock,
  MapPin,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { ScreeningRecord, UserSettings } from "../types";
import { getTranslation } from "../data/translations";
import { shareScreeningSummary, downloadScreeningSummaryAsTxt } from "../utils/shareHelper";
import { downloadPrescriptionPdf } from "../utils/prescriptionPdf";
import { useModalHistory } from "../utils/useModalHistory";

interface HistoryScreenProps {
  records: ScreeningRecord[];
  settings: UserSettings;
  onSelectRecord: (record: ScreeningRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onStartNewScan: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  records,
  settings,
  onSelectRecord,
  onDeleteRecord,
  onClearAll,
  onStartNewScan,
}) => {
  const lang = settings.language;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnimalFilter, setSelectedAnimalFilter] = useState<string>("all");
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [confirmClear, setConfirmClear] = useState(false);
  const [sharedToast, setSharedToast] = useState<string | null>(null);

  useModalHistory({
    isOpen: confirmClear,
    onClose: () => setConfirmClear(false),
    modalKey: "clear_history_confirm",
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirmClear) {
        setConfirmClear(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmClear]);

  const animalOptions = [
    { id: "all", label: "All Animals" },
    { id: "cattle", label: "Cattle / Cow" },
    { id: "buffalo", label: "Buffalo" },
    { id: "goat_sheep", label: "Goat / Sheep" },
    { id: "dog", label: "Dog" },
    { id: "cat", label: "Cat" },
    { id: "poultry", label: "Poultry / Chicken" },
    { id: "horse", label: "Horse / Donkey" },
    { id: "other", label: "Other" },
  ];

  const severityOptions = [
    { id: "all", label: "All Severities" },
    { id: "Emergency", label: "Emergency" },
    { id: "Serious", label: "Serious" },
    { id: "Moderate", label: "Moderate" },
    { id: "Mild", label: "Mild" },
  ];

  const filteredAndSortedRecords = useMemo(() => {
    let result = records.filter((r) => {
      const rawAnimal =
        typeof r.result.detectedAnimal === "object" && r.result.detectedAnimal !== null
          ? r.result.detectedAnimal.name
          : r.result.detectedAnimal || r.result.animalType || r.selectedAnimal || "";
      const animalText = String(rawAnimal).toLowerCase();
      const areaText = (r.result.affectedBodyArea || "").toLowerCase();
      const symptomsText = (r.symptomsInput || "").toLowerCase();
      const conditionsText = (r.result.possibleConditions || []).map((c) => c.name.toLowerCase()).join(" ");
      const langText = (r.languageName || r.language || "").toLowerCase();

      const matchesSearch =
        searchTerm.trim() === "" ||
        animalText.includes(searchTerm.toLowerCase()) ||
        areaText.includes(searchTerm.toLowerCase()) ||
        symptomsText.includes(searchTerm.toLowerCase()) ||
        conditionsText.includes(searchTerm.toLowerCase()) ||
        langText.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Animal filter
      if (selectedAnimalFilter !== "all") {
        if (selectedAnimalFilter === "cattle" && !(animalText.includes("cow") || animalText.includes("cattle") || animalText.includes("desi") || animalText.includes("gir"))) {
          return false;
        }
        if (selectedAnimalFilter === "buffalo" && !animalText.includes("buffalo")) {
          return false;
        }
        if (selectedAnimalFilter === "goat_sheep" && !(animalText.includes("goat") || animalText.includes("sheep"))) {
          return false;
        }
        if (selectedAnimalFilter === "dog" && !animalText.includes("dog")) {
          return false;
        }
        if (selectedAnimalFilter === "cat" && !animalText.includes("cat")) {
          return false;
        }
        if (selectedAnimalFilter === "poultry" && !(animalText.includes("poultry") || animalText.includes("chicken") || animalText.includes("hen") || animalText.includes("bird"))) {
          return false;
        }
        if (selectedAnimalFilter === "horse" && !(animalText.includes("horse") || animalText.includes("donkey") || animalText.includes("mule") || animalText.includes("equine"))) {
          return false;
        }
        if (selectedAnimalFilter === "other") {
          const isStandard =
            animalText.includes("cow") ||
            animalText.includes("cattle") ||
            animalText.includes("buffalo") ||
            animalText.includes("goat") ||
            animalText.includes("sheep") ||
            animalText.includes("dog") ||
            animalText.includes("cat") ||
            animalText.includes("poultry") ||
            animalText.includes("chicken") ||
            animalText.includes("horse");
          if (isStandard) return false;
        }
      }

      // Severity filter
      if (selectedSeverityFilter !== "all") {
        if (r.result.severity !== selectedSeverityFilter) return false;
      }

      return true;
    });

    // Sort newest vs oldest
    result.sort((a, b) => {
      if (sortOrder === "newest") {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });

    return result;
  }, [records, searchTerm, selectedAnimalFilter, selectedSeverityFilter, sortOrder]);

  const handleShareRecord = async (e: React.MouseEvent, record: ScreeningRecord) => {
    e.stopPropagation();
    const res = await shareScreeningSummary(
      record.result,
      record.selectedAnimal,
      record.symptomsInput,
      record.timestamp,
      false,
      record.imageThumbnail
    );

    if (res.method === "clipboard") {
      setSharedToast("Summary copied to clipboard!");
    } else if (res.method === "download") {
      setSharedToast("Summary downloaded as text file!");
    } else if (res.success) {
      setSharedToast("Screening report shared successfully!");
    }
    setTimeout(() => setSharedToast(null), 3000);
  };

  const exportHistoryJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vetcheck_screening_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#252A27] flex items-center gap-2">
            <History className="w-6 h-6 text-[#315C4C]" />
            <span>{getTranslation(lang, "historyTitle")}</span>
          </h1>
          <p className="text-xs text-[#626963] font-normal">
            {records.length} record{records.length === 1 ? "" : "s"} saved locally
          </p>
        </div>

        {records.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportHistoryJSON}
              className="bg-white hover:bg-[#FAF9F5] text-[#252A27] border border-[#E5E3DC] p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download JSON Backup"
              id="history-export-json-btn"
            >
              <Download className="w-4 h-4 text-[#315C4C]" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              className="bg-[#FDF2F2] hover:bg-[#FCE8E8] text-[#B44A4A] border border-[#F2D6D6] p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={getTranslation(lang, "clearHistory")}
              id="history-clear-all-btn"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{getTranslation(lang, "clearHistory")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {sharedToast && (
        <div className="fixed top-18 right-4 z-50 bg-[#315C4C] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{sharedToast}</span>
        </div>
      )}

      {/* Clear All Confirmation Box */}
      {confirmClear && (
        <div className="bg-[#FDF2F2] border border-[#F2D6D6] rounded-2xl p-5 text-xs text-[#B44A4A] space-y-3 animate-in fade-in">
          <div className="font-bold flex items-center gap-2 text-sm text-[#B44A4A]">
            <AlertCircle className="w-5 h-5 text-[#B44A4A]" />
            <span>Clear all screening history records?</span>
          </div>
          <p className="text-[#626963] font-normal leading-relaxed">
            This will permanently erase all {records.length} saved screening records from this browser's local storage. This action cannot be undone.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                onClearAll();
                setConfirmClear(false);
              }}
              className="bg-[#B44A4A] hover:bg-[#963C3C] text-white font-semibold px-4 py-2.5 rounded-lg cursor-pointer"
            >
              Yes, Clear All History
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="bg-white hover:bg-[#FAF9F5] text-[#252A27] border border-[#E5E3DC] font-semibold px-4 py-2.5 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search, Filters and Sort Controls */}
      {records.length > 0 && (
        <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-[#E5E3DC] shadow-xs">
          {/* Search Box & Sort Toggle */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#858B86] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={getTranslation(lang, "searchHistory")}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-[#E5E3DC] bg-[#FAF9F5] focus:bg-white focus:outline-hidden focus:border-[#315C4C] font-normal text-[#252A27]"
              />
            </div>

            {/* Sort Toggle Button */}
            <button
              onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              className="bg-[#FAF9F5] hover:bg-[#F2EFE9] text-[#252A27] border border-[#E5E3DC] px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Sort order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#315C4C]" />
              <span>Sort: {sortOrder === "newest" ? "Newest First" : "Oldest First"}</span>
            </button>
          </div>

          {/* Animal Filter Chips */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-[#626963] uppercase tracking-wider">
              Filter by Animal
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {animalOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedAnimalFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedAnimalFilter === opt.id
                      ? "bg-[#315C4C] text-white"
                      : "bg-[#FAF9F5] text-[#626963] hover:bg-[#F2EFE9] border border-[#E5E3DC]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Filter Chips */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-[#626963] uppercase tracking-wider">
              Filter by Severity
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {severityOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedSeverityFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedSeverityFilter === opt.id
                      ? opt.id === "Emergency"
                        ? "bg-[#B44A4A] text-white"
                        : opt.id === "Serious"
                        ? "bg-[#B25E00] text-white"
                        : opt.id === "Moderate"
                        ? "bg-[#7D6608] text-white"
                        : "bg-[#315C4C] text-white"
                      : "bg-[#FAF9F5] text-[#626963] hover:bg-[#F2EFE9] border border-[#E5E3DC]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Records List */}
      {filteredAndSortedRecords.length > 0 ? (
        <div className="space-y-3">
          {filteredAndSortedRecords.map((record) => {
            const dateStr = new Date(record.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const animalName =
              (typeof record.result.detectedAnimal === "object" && record.result.detectedAnimal !== null
                ? record.result.detectedAnimal.name
                : record.result.detectedAnimal) ||
              record.result.animalType ||
              record.selectedAnimal ||
              "Animal";
            const primaryCondition =
              record.result.possibleConditions && record.result.possibleConditions.length > 0
                ? record.result.possibleConditions[0].name
                : record.result.affectedBodyArea || "Screening completed";

            return (
              <div
                key={record.id}
                onClick={() => onSelectRecord(record)}
                className="bg-white border border-[#E5E3DC] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#315C4C] transition-colors flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 group cursor-pointer"
              >
                {/* Left: Thumbnail & Record Metadata */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <img
                    src={record.imageThumbnail}
                    alt={animalName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-[#E5E3DC] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    {/* Header Row: Animal Name + Severity Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-[#252A27] truncate">
                        {animalName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {record.prescription && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#E7EEE9] text-[#25473B] border border-[#D2DFD7]">
                            🩺 Rx
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded border shrink-0 ${
                            record.result.severity === "Emergency"
                              ? "bg-[#FDF2F2] text-[#B44A4A] border-[#F2D6D6]"
                              : record.result.severity === "Serious"
                              ? "bg-[#FFF4E5] text-[#B25E00] border-[#FFE2BA]"
                              : record.result.severity === "Moderate"
                              ? "bg-[#FEF9E7] text-[#7D6608] border-[#F9E79F]"
                              : "bg-[#E7EEE9] text-[#25473B] border-[#D2DFD7]"
                          }`}
                        >
                          {record.result.severity}
                        </span>
                      </div>
                    </div>

                    {/* Affected Area & Possible Condition */}
                    <p className="text-xs text-[#252A27] font-semibold truncate">
                      🩺 {primaryCondition}
                    </p>
                    <p className="text-[11px] text-[#626963] truncate font-normal mt-0.5">
                      📍 Area: {record.result.affectedBodyArea || "General examination"}
                    </p>

                    {/* Timestamp & Language Used */}
                    <div className="flex items-center gap-2 text-[11px] text-[#858B86] mt-1 font-normal">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{record.languageName || record.language}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-end gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5E3DC] shrink-0"
                >
                  {record.prescription && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPrescriptionPdf(record.prescription!);
                        setSharedToast("Prescription PDF downloaded!");
                        setTimeout(() => setSharedToast(null), 3000);
                      }}
                      className="p-2 text-[#315C4C] hover:bg-[#E7EEE9] rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                      title="Download Prescription PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Rx PDF</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => handleShareRecord(e, record)}
                    className="p-2 text-[#626963] hover:text-[#315C4C] rounded-lg hover:bg-[#FAF9F5] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                    title="Share report"
                    id={`history-share-${record.id}`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="sm:hidden">Share</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRecord(record.id);
                    }}
                    className="p-2 text-[#858B86] hover:text-[#B44A4A] rounded-lg hover:bg-[#FDF2F2] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                    title="Delete record"
                    id={`history-delete-${record.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sm:hidden">Delete</span>
                  </button>

                  <button
                    onClick={() => onSelectRecord(record)}
                    className="bg-[#E7EEE9] text-[#25473B] hover:bg-[#315C4C] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-[#E5E3DC] rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-xl bg-[#E7EEE9] text-[#315C4C] flex items-center justify-center mx-auto">
            <PawPrint className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#252A27]">
            {searchTerm || selectedAnimalFilter !== "all" || selectedSeverityFilter !== "all"
              ? "No matching records found"
              : "No Screening History"}
          </h3>
          <p className="text-xs text-[#626963] max-w-sm mx-auto font-normal leading-relaxed">
            {searchTerm || selectedAnimalFilter !== "all" || selectedSeverityFilter !== "all"
              ? "Try clearing search keywords or changing filter categories."
              : getTranslation(lang, "historyEmpty")}
          </p>
          <button
            onClick={onStartNewScan}
            className="bg-[#315C4C] hover:bg-[#25473B] text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer mt-2"
          >
            {getTranslation(lang, "scanAnimal")}
          </button>
        </div>
      )}
    </div>
  );
};
