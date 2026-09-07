import React, { useState } from "react";
import {
  Globe,
  ShieldAlert,
  Camera,
  History,
  PawPrint,
  BookOpen,
  Settings,
  User,
  Info,
  CheckCircle2,
  Menu,
} from "lucide-react";
import { VetCheckLogo } from "../ui/VetCheckLogo";
import { SUPPORTED_LANGUAGES, getTranslation } from "../../data/translations";
import { UserSettings, NavTab } from "../../types";
import { ttsManager } from "../../utils/speechHelper";

interface NavbarProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onNavigate: (tab: NavTab) => void;
  currentTab: NavTab;
  onOpenChecklist?: () => void;
  onOpenMore?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onUpdateSettings,
  onNavigate,
  currentTab,
  onOpenChecklist,
  onOpenMore,
}) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [searchLang, setSearchLang] = useState("");

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === settings.language) || SUPPORTED_LANGUAGES[0];

  const filteredLangs = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(searchLang.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchLang.toLowerCase()) ||
      l.code.toLowerCase().includes(searchLang.toLowerCase())
  );

  const handleSelectLang = (code: string) => {
    onUpdateSettings({ language: code });
    setIsLangOpen(false);
    setSearchLang("");
  };

  const navLinks: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "home", label: "Home", icon: () => null },
    { id: "scan", label: "Scan Animal", icon: Camera },
    { id: "history", label: "History", icon: History },
    { id: "my-animals", label: "My Animals", icon: PawPrint },
    { id: "learn", label: "Learn", icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E5E3DC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Brand & Logo */}
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center text-left focus:outline-hidden group cursor-pointer"
          id="brand-logo-btn"
          aria-label="VetCheck Home"
        >
          <VetCheckLogo
            size="md"
            showText={true}
            showTagline={true}
            textColor="text-[#252A27]"
            taglineColor="text-[#626963]"
          />
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main Desktop Navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                  isActive
                    ? "bg-[#315C4C] text-white"
                    : "text-[#626963] hover:text-[#252A27] hover:bg-[#E7EEE9]/60"
                }`}
                id={`desktop-nav-${link.id}`}
              >
                {link.id !== "home" && <Icon className="w-3.5 h-3.5" />}
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Language Selector, Emergency SOS, Settings */}
        <div className="flex items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E3DC] bg-white hover:bg-[#FAF9F5] text-xs font-semibold text-[#252A27] transition-colors cursor-pointer min-h-[36px]"
              id="navbar-language-btn"
              aria-label="Select Language"
              aria-expanded={isLangOpen}
            >
              <Globe className="w-3.5 h-3.5 text-[#315C4C]" />
              <span className="hidden sm:inline">{currentLang.nativeName}</span>
              <span className="sm:hidden uppercase">{currentLang.code}</span>
            </button>

            {isLangOpen && (
              <div
                className="absolute right-0 mt-2 w-64 max-h-80 bg-white border border-[#E5E3DC] rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in"
                id="language-dropdown-menu"
              >
                <div className="p-2.5 border-b border-[#E5E3DC] bg-[#FAF9F5]">
                  <input
                    type="text"
                    placeholder="Search 14 Indian languages..."
                    value={searchLang}
                    onChange={(e) => setSearchLang(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#E5E3DC] bg-white focus:outline-hidden focus:border-[#315C4C]"
                    autoFocus
                  />
                </div>

                <div className="max-h-56 overflow-y-auto p-1 divide-y divide-[#FAF9F5]">
                  {filteredLangs.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLang(lang.code)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        settings.language === lang.code
                          ? "bg-[#E7EEE9] text-[#25473B] font-bold"
                          : "text-[#252A27] hover:bg-[#FAF9F5] font-medium"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{lang.nativeName}</div>
                        <div className="text-[10px] text-[#858B86]">{lang.name}</div>
                      </div>
                      {settings.language === lang.code && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#315C4C]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Emergency SOS Shortcut (Desktop & Mobile) */}
          <button
            onClick={() => onNavigate("emergency")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FDF2F2] hover:bg-[#FBE8E8] text-[#B44A4A] border border-[#F2D6D6] text-xs font-bold transition-all cursor-pointer min-h-[36px]"
            id="navbar-emergency-btn"
            title="Animal Emergency Mode (1962 SOS)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#B44A4A]" />
            <span className="hidden sm:inline">1962 SOS</span>
          </button>

          {/* Settings shortcut button */}
          <button
            onClick={() => onNavigate("settings")}
            className={`p-2 rounded-lg border transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
              currentTab === "settings"
                ? "bg-[#315C4C] text-white border-[#315C4C]"
                : "border-[#E5E3DC] text-[#626963] hover:bg-white hover:text-[#252A27]"
            }`}
            title="Settings & Accessibility"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
