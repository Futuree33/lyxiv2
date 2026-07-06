import { avatarGradient, initials } from '../lib/avatar';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

export function Avatar({
  name,
  size = 'md',
  ring = false,
  src,
}: {
  name: string;
  size?: keyof typeof SIZES;
  ring?: boolean;
  src?: string | null;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${SIZES[size]} ${
          ring ? 'ring-2 ring-accent/40 ring-offset-2 ring-offset-void' : ''
        }`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white/95 ${SIZES[size]} ${
        ring ? 'ring-2 ring-accent/40 ring-offset-2 ring-offset-void' : ''
      }`}
      style={{ backgroundImage: avatarGradient(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
