const GRADIENTS: [string, string][] = [
  ['#e64bc4', '#f6b8e8'],
  ['#5eead4', '#2dd4bf'],
  ['#f59e0b', '#e64bc4'],
  ['#6d5ef2', '#5eead4'],
  ['#38bdf8', '#6d5ef2'],
  ['#f4635f', '#f59e0b'],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function avatarGradient(seed: string): string {
  const [from, to] = GRADIENTS[hash(seed) % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
