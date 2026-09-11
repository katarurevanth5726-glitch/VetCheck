import React, { useEffect } from "react";
import {
  PawPrint,
  Clock,
  BookOpen,
  User,
  Settings,
  ShieldCheck,
  Info,
  CheckCircle2,
  ChevronRight,
  X,
  Scissors,
  MapPin,
} from "lucide-react";
import { NavTab } from "../types";
import { useModalHistory } from "../utils/useModalHistory";

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  onOpenChecklist?: () => void;
  onOpenNearbyVet?: () => void;
  onOpenNearbyPetSalons?: () => void;
  animalCount?: number;
  historyCount?: number;
}

interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badge?: string;
  badgeColor?: string;
  tab?: NavTab;
  action?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenChecklist,
  onOpenNearbyVet,
  onOpenNearbyPetSalons,
  animalCount = 0,
  historyCount = 0,
}) => {
  useModalHistory({
    isOpen,
    onClose,
    modalKey: "more_menu",
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavigate = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  const menuSections: MenuSection[] = [
    {
      title: "Animal Care & Tracking",
      items: [
        {
          id: "my-animals",
          tab: "my-animals",
          label: "My Animals",
          description: "Manage animal profiles, age, weight, and vaccination history",
          icon: PawPrint,
          iconBg: "bg-teal-600",
          badge: animalCount > 0 ? `${animalCount} registered` : undefined,
        },
        {
          id: "history",
          tab: "history",
          label: "Follow-ups & History",
          description: "Review past screening records, photo comparisons & wellness logs",
          icon: Clock,
          iconBg: "bg-emerald-600",
          badge: historyCount > 0 ? `${historyCount} records` : undefined,
        },
        {
          id: "learn",
          tab: "learn",
          label: "Learn & Prevent",
          description: "Preventive care, feed hygiene, seasonal health tips & daily checklist",
          icon: BookOpen,
          iconBg: "bg-teal-700",
        },
      ],
    },
    {
      title: "Nearby Services & Facilities",
      items: [
        {
          id: "nearby-salons",
          label: "Nearby Pet Salons & Grooming",
          description: "Locate pet spas, dog/cat grooming centers and call directly",
          icon: Scissors,
          iconBg: "bg-amber-600",
          action: () => {
            onClose();
            if (onOpenNearbyPetSalons) onOpenNearbyPetSalons();
          },
        },
        {
          id: "nearby-vet",
          label: "Nearby Veterinary Hospitals",
          description: "Search government polyclinics, vet dispensaries & emergency clinics",
          icon: MapPin,
          iconBg: "bg-teal-600",
          action: () => {
            onClose();
            if (onOpenNearbyVet) onOpenNearbyVet();
          },
        },
      ],
    },
    {
      title: "Smart India Hackathon & Evaluation",
      items: [
        {
          id: "about",
          tab: "about",
          label: "About Project (SIH Dossier)",
          description: "Team details, problem statement ID, GitHub repository & innovation dossier",
          icon: Info,
          iconBg: "bg-teal-800",
        },
      ],
    },
    {
      title: "Account & Preferences",
      items: [
        {
          id: "profile",
          tab: "profile",
          label: "User Profile",
          description: "Farmer / pet owner status, location and livestock holdings",
          icon: User,
          iconBg: "bg-slate-700",
        },
        {
          id: "settings",
          tab: "settings",
          label: "Settings & Languages",
          description: "10+ regional languages, Voice TTS speed, display & accessibility options",
          icon: Settings,
          iconBg: "bg-teal-600",
        },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              More Features & Tools
            </h2>
            <p className="text-xs text-slate-500">
              Explore animal health tracking, education, and SIH evaluation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {menuSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                {section.title}
              </div>

              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.action) {
                          item.action();
                        } else if (item.tab) {
                          handleNavigate(item.tab);
                        }
                      }}
                      className="w-full p-3 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/40 transition-all duration-150 flex items-center justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 pr-2">
                        <div
                          className={`w-9 h-9 rounded-xl ${item.iconBg} text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-teal-900">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  item.badgeColor || "bg-teal-100 text-teal-800"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submission Readiness Checklist Quick Trigger */}
          {onOpenChecklist && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onClose();
                  onOpenChecklist();
                }}
                className="w-full p-3 rounded-2xl bg-teal-50 border border-teal-200 hover:bg-teal-100/70 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-teal-950">
                      SIH Submission Readiness Checklist
                    </div>
                    <div className="text-[11px] text-teal-700">
                      Verify 17 evaluation criteria before jury demo
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-700 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
