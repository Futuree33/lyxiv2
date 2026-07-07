import { Clock, MapPin, Heart } from 'lucide-react';

interface NarratorMessageProps {
  type: string;
  content: string;
}

const NARRATOR_ICONS = {
  time_skip: <Clock size={16} />,
  scene_transition: <MapPin size={16} />,
  mood_shift: <Heart size={16} />,
};

export function NarratorMessage({ type, content }: NarratorMessageProps) {
  const icon = NARRATOR_ICONS[type as keyof typeof NARRATOR_ICONS] || <MapPin size={16} />;

  return (
    <div className="my-6 flex justify-center animate-fade-in-up">
      <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-gradient-to-r from-accent/10 via-accent-2/10 to-accent/10 px-4 py-2 backdrop-blur-sm max-w-2xl">
        <span className="text-accent shrink-0">{icon}</span>
        <p className="text-sm italic text-muted text-center">
          {content}
        </p>
      </div>
    </div>
  );
}
