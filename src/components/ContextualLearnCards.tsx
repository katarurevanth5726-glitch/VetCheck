import React, { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Ban,
  Volume2,
  VolumeX,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Info,
} from "lucide-react";
import { LearnTopic, UserSettings } from "../types";
import { getContextualLearnCards } from "../data/learnContent";
import { toggleLearnBookmark, isTopicBookmarked } from "../utils/storage";
import { ttsManager } from "../utils/speechHelper";
import { getTranslation } from "../data/translations";

interface ContextualLearnCardsProps {
  animalType?: string;
  bodyArea?: string;
  visibleSigns?: string[];
  severity?: string;
  settings: UserSettings;
  onNavigateToLearn?: () => void;
}

export const ContextualLearnCards: React.FC<ContextualLearnCardsProps> = ({
  animalType,
  bodyArea,
  visibleSigns = [],
  severity,
  settings,
  onNavigateToLearn,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [bookmarkedState, setBookmarkedState] = useState<Record<string, boolean>>({});

  const safeAnimalType =
    typeof animalType === "object" && animalType !== null
      ? (animalType as any).name || "animals"
      : typeof animalType === "string" && animalType
      ? animalType
      : "animals";

  const safeBodyArea =
    typeof bodyArea === "string" && bodyArea ? bodyArea : "general care";

  const matchingTopics: LearnTopic[] = getContextualLearnCards(
    safeAnimalType,
    safeBodyArea,
    visibleSigns,
    severity
  );

  if (matchingTopics.length === 0) return null;

  const handleToggleSpeak = (topic: LearnTopic) => {
    if (playingId === topic.id) {
      ttsManager.stop();
      setPlayingId(null);
    } else {
      ttsManager.stop();
      setPlayingId(topic.id);
      const textToRead = `${topic.title}. Summary: ${topic.summary}. Key preventive steps: ${topic.keyTips.join(
        ". "
      )}. When to call veterinarian: ${topic.whenToCallVet}`;
      ttsManager.speak(
        textToRead,
        settings.language,
        settings.ttsVoiceSpeed || 1.0,
        settings.ttsPitch || 1.0,
        () => setPlayingId(null)
      );
    }
  };

  const handleToggleBookmark = (id: string) => {
    const res = toggleLearnBookmark(id);
    setBookmarkedState((prev) => ({
      ...prev,
      [id]: res.isBookmarked,
    }));
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs" id="contextual-learn-section">
      {/* Distinct Educational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200">
              <BookOpen className="w-3 h-3 text-teal-700" />
              <span>General Care Information</span>
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              (Not Diagnostic Evidence)
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-black text-slate-900">
            Preventive Care & Hygiene Guidelines
          </h2>
          <p className="text-xs text-slate-600">
            Relevant educational advice for {safeAnimalType} regarding {safeBodyArea}.
          </p>
        </div>

        {onNavigateToLearn && (
          <button
            onClick={onNavigateToLearn}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer self-start sm:self-auto"
            id="view-all-learn-guides-btn"
          >
            <span>View All Guides</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Up to 3 Educational Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {matchingTopics.map((topic) => {
          const isSpeaking = playingId === topic.id;
          const isSaved = bookmarkedState[topic.id] !== undefined ? bookmarkedState[topic.id] : isTopicBookmarked(topic.id);

          return (
            <div
              key={topic.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-teal-300 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 truncate">
                    {topic.category.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleSpeak(topic)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isSpeaking ? "bg-teal-600 text-white animate-pulse" : "text-slate-400 hover:text-teal-700 hover:bg-teal-50"
                      }`}
                      title={isSpeaking ? "Stop audio" : "Listen to advice"}
                      aria-label="Read advice aloud"
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleToggleBookmark(topic.id)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isSaved ? "text-amber-600" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      }`}
                      title={isSaved ? "Saved" : "Save article"}
                      aria-label="Bookmark article"
                    >
                      {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 fill-current" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <h3 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-2">
                  {topic.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-3 font-medium leading-relaxed">
                  {topic.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-teal-800 font-bold flex items-center justify-between">
                <span>{topic.keyTips.length} Key Tips</span>
                {onNavigateToLearn && (
                  <button
                    onClick={onNavigateToLearn}
                    className="hover:underline flex items-center gap-0.5 text-teal-700 cursor-pointer"
                  >
                    <span>Read Guide</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
