import React, { useState } from "react";
import { Globe, Check, Search, X } from "lucide-react";
import { SUPPORTED_LANGUAGES, getTranslation } from "../data/translations";

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelectLanguage: (code: string) => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onSelectLanguage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.script.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-700/60 flex items-center justify-center text-teal-100">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 id="lang-modal-title" className="text-lg font-black tracking-tight text-white">
                {getTranslation(currentLanguage, "selectLanguage")}
              </h2>
              <p className="text-xs text-teal-100 font-medium">
                20 Indian Languages Available • 20 भारतीय भाषाएं
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-teal-700/50 hover:bg-teal-700 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search language / भाषा खोजें (e.g. Hindi, Telugu, Tamil, Marathi)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
          </div>
        </div>

        {/* Language Grid */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-1">
          {filteredLanguages.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No language found matching "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredLanguages.map((lang) => {
                const isSelected = currentLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSelectLanguage(lang.code);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-xs font-bold"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-base font-extrabold flex items-center gap-2">
                        <span>{lang.nativeName}</span>
                        {lang.isRtl && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">
                            RTL
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{lang.name}</span>
                        <span>•</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {lang.script}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>AI screening results and voice narration will adapt automatically</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
