import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Pause, Play, Square } from "lucide-react";
import { ttsManager, TTSState } from "../utils/speechHelper";
import { getTranslation } from "../data/translations";

interface AudioPlayerButtonProps {
  textToRead: string;
  langCode: string;
  speed?: number;
  pitch?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
}

export const AudioPlayerButton: React.FC<AudioPlayerButtonProps> = ({
  textToRead,
  langCode,
  speed = 1.0,
  pitch = 1.0,
  label,
  size = "md",
  className = "",
  id,
}) => {
  const [ttsState, setTtsState] = useState<TTSState>("idle");
  const [isCurrentSpeaker, setIsCurrentSpeaker] = useState(false);

  useEffect(() => {
    const unsubscribe = ttsManager.subscribe((state) => {
      setTtsState(state);
      if (state === "idle") {
        setIsCurrentSpeaker(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleStart = () => {
    setIsCurrentSpeaker(true);
    ttsManager.speak(textToRead, langCode, speed, pitch, () => {
      setIsCurrentSpeaker(false);
    });
  };

  const handlePause = () => {
    ttsManager.pause();
  };

  const handleResume = () => {
    ttsManager.resume();
  };

  const handleStop = () => {
    ttsManager.stop();
    setIsCurrentSpeaker(false);
  };

  // If this button is currently active and speaking/paused:
  if (isCurrentSpeaker && (ttsState === "playing" || ttsState === "paused")) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 p-1 bg-teal-50 border border-teal-300 rounded-2xl shadow-xs animate-in fade-in duration-200 ${className}`}
        id={id}
        role="group"
        aria-label="Text-to-speech audio playback controls"
      >
        {ttsState === "playing" ? (
          <button
            type="button"
            onClick={handlePause}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs"
            title={getTranslation(langCode, "pauseAudio")}
            aria-label={getTranslation(langCode, "pauseAudio")}
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>{getTranslation(langCode, "pauseAudio")}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResume}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs animate-pulse"
            title={getTranslation(langCode, "resumeAudio")}
            aria-label={getTranslation(langCode, "resumeAudio")}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{getTranslation(langCode, "resumeAudio")}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleStop}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          title={getTranslation(langCode, "stopAudio")}
          aria-label={getTranslation(langCode, "stopAudio")}
        >
          <Square className="w-3 h-3 fill-current" />
          <span>{getTranslation(langCode, "stopAudio")}</span>
        </button>
      </div>
    );
  }

  // Idle state button
  const displayLabel = label || getTranslation(langCode, "listenAudio");
  const sizeClasses =
    size === "sm"
      ? "text-xs py-1.5 px-3"
      : size === "lg"
      ? "text-sm py-2.5 px-4 font-extrabold"
      : "text-xs py-2 px-3.5 font-bold";

  return (
    <button
      type="button"
      onClick={handleStart}
      className={`inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-2xl transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-hidden ${sizeClasses} ${className}`}
      id={id}
      title={displayLabel}
      aria-label={displayLabel}
    >
      <Volume2 className="w-4 h-4 text-teal-600 shrink-0" />
      <span>{displayLabel}</span>
    </button>
  );
};
