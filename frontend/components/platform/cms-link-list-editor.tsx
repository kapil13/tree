"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CmsLink } from "@/lib/cms-api";

type Props = {
  label: string;
  links: CmsLink[];
  onChange: (links: CmsLink[]) => void;
};

export function CmsLinkListEditor({ label, links, onChange }: Props) {
  function update(index: number, field: keyof CmsLink, value: string) {
    const next = links.map((link, i) => (i === index ? { ...link, [field]: value } : link));
    onChange(next);
  }

  function add() {
    onChange([...links, { label: "New link", href: "/" }]);
  }

  function remove(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-200">{label}</p>
        <button type="button" className="btn-ghost text-xs" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Add link
        </button>
      </div>
      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={`${label}-${index}`} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Label"
              value={link.label}
              onChange={(e) => update(index, "label", e.target.value)}
            />
            <input
              className="input flex-[1.2]"
              placeholder="URL or #anchor"
              value={link.href}
              onChange={(e) => update(index, "href", e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost shrink-0 text-red-600"
              aria-label="Remove link"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
