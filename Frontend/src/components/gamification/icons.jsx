import {
  Clock, Timer, CircleCheck, CalendarCheck, Flame, GraduationCap, FileText, ClipboardCheck, Handshake, ShieldCheck,
  Lightbulb, MessageSquare, ThumbsUp, Star, Rocket, Camera, UserCheck, Target, Award, Trophy, TrendingUp, Medal,
  Crown, Gift, Heart, Layers, Compass, Puzzle, Users, BookOpen, Sun, Sparkles, Coffee, Shirt, Plane, Ticket,
  Wallet, Briefcase, Zap, Flag,
} from "lucide-react";

// Backend catalogues store icon *keys*; this is the single place they become icons.
export const ICONS = {
  clock: Clock, timer: Timer, check: CircleCheck, calendar: CalendarCheck, flame: Flame, graduation: GraduationCap,
  file: FileText, clipboard: ClipboardCheck, handshake: Handshake, shield: ShieldCheck, bulb: Lightbulb,
  message: MessageSquare, thumbs: ThumbsUp, star: Star, rocket: Rocket, camera: Camera, user: UserCheck,
  target: Target, award: Award, trophy: Trophy, trend: TrendingUp, medal: Medal, crown: Crown, gift: Gift,
  heart: Heart, layers: Layers, compass: Compass, puzzle: Puzzle, users: Users, book: BookOpen, sun: Sun,
  sparkles: Sparkles, coffee: Coffee, shirt: Shirt, plane: Plane, ticket: Ticket, wallet: Wallet,
  briefcase: Briefcase, zap: Zap, flag: Flag,
};
export const ICON_KEYS = Object.keys(ICONS);

export const Icon = ({ name, size = 16, className = "", strokeWidth = 2, ...rest }) => {
  const C = ICONS[name] || Award;
  return <C size={size} className={className} strokeWidth={strokeWidth} {...rest} />;
};

// Soft tinted square with an icon - the standard "icon tile".
export const IconTile = ({ name, color = "#730042", size = 36, round = false }) => (
  <span className={`inline-flex shrink-0 items-center justify-center ${round ? "rounded-full" : "rounded-lg"}`} style={{ width: size, height: size, background: `${color}14`, color }}>
    <Icon name={name} size={Math.round(size * 0.5)} />
  </span>
);

// Admin helper: choose an icon from the curated set.
export const IconPicker = ({ value, onChange }) => (
  <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
    {ICON_KEYS.map((k) => (
      <button type="button" key={k} onClick={() => onChange(k)} title={k} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${value === k ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-[#ede5e0] text-[#7a6a64] hover:bg-[#faf7f5]"}`}>
        <Icon name={k} size={16} />
      </button>
    ))}
  </div>
);
