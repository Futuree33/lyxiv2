import { MapPin, Heart, Sun, Sunrise, Sunset, Moon } from 'lucide-react';

interface AtmospherePanelProps {
  location?: string | null;
  sceneDescription?: string | null;
  timeOfDay?: string | null;
  mood?: string | null;
}

const TIME_ICONS = {
  morning: <Sunrise size={16} className="text-amber-400" />,
  afternoon: <Sun size={16} className="text-yellow-400" />,
  evening: <Sunset size={16} className="text-orange-400" />,
  night: <Moon size={16} className="text-blue-300" />,
};

const MOOD_COLORS = {
  playful: 'text-presence',
  tense: 'text-warn',
  intimate: 'text-danger',
  melancholic: 'text-accent-2',
  content: 'text-success',
  nervous: 'text-warn',
  excited: 'text-accent',
  neutral: 'text-muted',
  happy: 'text-success',
  sad: 'text-accent-2',
} as const;

export function AtmospherePanel({ location, sceneDescription, timeOfDay, mood }: AtmospherePanelProps) {
  // Show a placeholder while atmospheric data is being generated
  if (!location && !timeOfDay && !mood) {
    return (
      <div className="mb-4 rounded-xl border border-hairline/30 bg-gradient-to-br from-void to-surface p-3 backdrop-blur-sm opacity-60">
        <p className="text-xs text-faint italic text-center">
          ✨ Analyzing atmospheric context...
        </p>
      </div>
    );
  }

  const timeIcon = timeOfDay && TIME_ICONS[timeOfDay as keyof typeof TIME_ICONS];
  const moodColor = mood && (MOOD_COLORS[mood.toLowerCase() as keyof typeof MOOD_COLORS] || MOOD_COLORS.neutral);

  return (
    <div className="sticky top-0 z-10 mb-4 rounded-xl border border-hairline/50 bg-gradient-to-br from-void to-surface/95 p-4 backdrop-blur-md shadow-lg">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Location */}
        {location && (
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-accent" />
            <span className="text-sm font-medium text-ink">{location}</span>
          </div>
        )}

        {/* Time of Day */}
        {timeOfDay && (
          <div className="flex items-center gap-2">
            {timeIcon}
            <span className="text-sm text-muted capitalize">{timeOfDay}</span>
          </div>
        )}

        {/* Mood Indicator */}
        {mood && (
          <div className="flex items-center gap-2">
            <Heart size={14} className={moodColor} />
            <span className={`text-sm capitalize ${moodColor}`}>{mood}</span>
          </div>
        )}
      </div>

      {/* Scene Description */}
      {sceneDescription && (
        <p className="mt-2 text-xs text-faint italic leading-relaxed">
          {sceneDescription}
        </p>
      )}
    </div>
  );
}
