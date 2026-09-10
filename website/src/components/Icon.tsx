import { ArrowLeft, ArrowRight, ArrowUpRight, Building2, Leaf, TreePine, PanelsTopLeft, Menu, X, Maximize, Minimize, Mouse, Play, Pause } from 'lucide-react';

const icons = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  building: Building2,
  leaf: Leaf,
  tree: TreePine,
  'panels-top-left': PanelsTopLeft,
  menu: Menu,
  x: X,
  maximize: Maximize,
  minimize: Minimize,
  mouse: Mouse,
  play: Play,
  pause: Pause,
};

export type IconName = keyof typeof icons;

/** Decorative SVG: the surrounding link/button supplies its accessible name. */
export default function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const Glyph = icons[name];
  return <Glyph className={`site-icon ${className}`} size={20} strokeWidth={1.65} aria-hidden="true" focusable="false" />;
}
