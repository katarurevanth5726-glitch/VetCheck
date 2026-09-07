import React from "react";
import { Home, Camera, History, ShieldAlert, Menu } from "lucide-react";
import { NavTab } from "../../types";
import { getTranslation } from "../../data/translations";

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMore: () => void;
  language: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMore,
  language,
}) => {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-[#FAF9F5]/95 backdrop-blur-md border-t border-[#E5E3DC] shadow-sm px-2 py-1.5 md:hidden"
      role="navigation"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* 1. Home */}
        <button
          onClick={() => onSelectTab("home")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors focus:outline-hidden cursor-pointer min-h-[48px] ${
            currentTab === "home"
              ? "text-[#25473B] font-bold bg-[#E7EEE9]"
              : "text-[#626963] hover:text-[#252A27] font-medium"
          }`}
          id="bottom-nav-home"
        >
          <Home className={`w-5 h-5 transition-transform ${currentTab === "home" ? "text-[#315C4C]" : ""}`} />
          <span className="text-[10px] tracking-tight mt-0.5">{getTranslation(language, "navHome") || "Home"}</span>
        </button>

        {/* 2. History */}
        <button
          onClick={() => onSelectTab("history")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors focus:outline-hidden cursor-pointer min-h-[48px] ${
            currentTab === "history"
              ? "text-[#25473B] font-bold bg-[#E7EEE9]"
              : "text-[#626963] hover:text-[#252A27] font-medium"
          }`}
          id="bottom-nav-history"
        >
          <History className={`w-5 h-5 transition-transform ${currentTab === "history" ? "text-[#315C4C]" : ""}`} />
          <span className="text-[10px] tracking-tight mt-0.5">{getTranslation(language, "navHistory") || "History"}</span>
        </button>

        {/* 3. Scan (Elevated Prominent Primary Action) */}
        <button
          onClick={() => onSelectTab("scan")}
          className="flex flex-col items-center -mt-5 group focus:outline-hidden cursor-pointer"
          id="bottom-nav-scan-primary"
          aria-label="Scan an Animal"
        >
          <div
            className={`w-13 h-13 rounded-full flex items-center justify-center text-white shadow-sm transition-transform active:scale-95 ${
              currentTab === "scan"
                ? "bg-[#25473B] ring-4 ring-[#E7EEE9]"
                : "bg-[#315C4C] hover:bg-[#25473B] ring-4 ring-[#FAF9F5]"
            }`}
          >
            <Camera className="w-6 h-6 text-white" />
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
              currentTab === "scan" ? "text-[#25473B]" : "text-[#626963]"
            }`}
          >
            {getTranslation(language, "navScan") || "Scan"}
          </span>
        </button>

        {/* 4. Emergency */}
        <button
          onClick={() => onSelectTab("emergency")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors focus:outline-hidden cursor-pointer min-h-[48px] ${
            currentTab === "emergency"
              ? "text-[#B44A4A] font-bold bg-[#FDF2F2]"
              : "text-[#B44A4A] hover:bg-[#FDF2F2]/50 font-medium"
          }`}
          id="bottom-nav-emergency"
        >
          <div className="relative">
            <ShieldAlert className={`w-5 h-5 transition-transform ${currentTab === "emergency" ? "text-[#B44A4A]" : ""}`} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">{getTranslation(language, "navEmergency") || "1962 SOS"}</span>
        </button>

        {/* 5. More Menu */}
        <button
          onClick={onOpenMore}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors focus:outline-hidden cursor-pointer min-h-[48px] ${
            ["my-animals", "learn", "settings", "profile", "about"].includes(currentTab)
              ? "text-[#25473B] font-bold bg-[#E7EEE9]"
              : "text-[#626963] hover:text-[#252A27] font-medium"
          }`}
          id="bottom-nav-more"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">More</span>
        </button>
      </div>
    </nav>
  );
};
