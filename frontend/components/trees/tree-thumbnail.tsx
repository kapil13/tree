import { ImageIcon, TreePine } from "lucide-react";
import { cn } from "@/lib/cn";

type TreeThumbnailProps = {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
  size?: "sm" | "md";
};

export function TreeThumbnail({
  imageUrl,
  alt = "",
  className,
  size = "md",
}: TreeThumbnailProps) {
  const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={cn(dim, "shrink-0 rounded-md object-cover bg-stone-100", className)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        dim,
        "flex shrink-0 items-center justify-center rounded-md border border-dashed border-stone-200 bg-stone-50 text-stone-400",
        className,
      )}
      aria-hidden
    >
      {size === "sm" ? <ImageIcon className="h-4 w-4" /> : <TreePine className="h-5 w-5" />}
    </div>
  );
}
