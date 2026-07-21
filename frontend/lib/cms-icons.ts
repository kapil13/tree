/** Lucide icon resolver for CMS JSON content. */
import {
  Bell,
  Bird,
  Brain,
  Building2,
  FileCheck2,
  Globe2,
  Leaf,
  MapPin,
  Radar,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  TreePine,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Bell,
  Bird,
  Brain,
  Building2,
  FileCheck2,
  Globe2,
  Leaf,
  MapPin,
  Radar,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  TreePine,
  Users,
};

export function cmsIcon(name?: string): LucideIcon {
  if (!name) return Sparkles;
  return ICONS[name] ?? Sparkles;
}
