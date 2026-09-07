import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ttsManager } from "../../utils/speechHelper";
import { UserSettings } from "../../types";

interface AudioControlsProps {
  textToSpeak: string;
  language: string;
  settings?: UserSettings;
  className?: string;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  textToSpeak,
  language,
  settings,
  className = "",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(settings?.ttsVoiceSpeed || 1.0);

  useEffect(() => {
    return () => {
      ttsManager.stop();
    };
  }, []);

  const handlePlayToggle = () => {
    if (isPlaying) {
      ttsManager.stop();
      setIsPlaying(false);
    } else {
      if (!textToSpeak.trim()) return;
      setIsPlaying(true);
      ttsManager.speak(
        textToSpeak,
        language,
        speed,
        settings?.ttsPitch || 1.0,
        () => setIsPlaying(false)
      );
    }
  };

  const handleSpeedCycle = () => {
    const speeds = [0.8, 1.0, 1.2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setSpeed(newSpeed);
    if (isPlaying) {
      ttsManager.stop();
      ttsManager.speak(
        textToSpeak,
        language,
        newSpeed,
        settings?.ttsPitch || 1.0,
        () => setIsPlaying(false)
      );
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-2xl p-1.5 ${className}`}
      role="region"
      aria-label="Audio voice reader"
    >
      <button
        onClick={handlePlayToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
          isPlaying
            ? "bg-teal-700 text-white animate-pulse"
            : "bg-teal-600 hover:bg-teal-700 text-white"
        }`}
        aria-label={isPlaying ? "Stop voice playback" : "Listen to audio narration"}
      >
        {isPlaying ? (
          <>
            <VolumeX className="w-4 h-4" />
            <span>Stop Audio</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4" />
            <span>Listen (आवाज़ में सुनें)</span>
          </>
        )}
      </button>

      <button
        onClick={handleSpeedCycle}
        className="px-2 py-1 bg-white hover:bg-slate-100 text-teal-900 border border-teal-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
        title="Voice Speed"
        aria-label={`Current voice speed: ${speed}x. Click to change.`}
      >
        {speed}x
      </button>
    </div>
  );
};
