import logoFull from "@/assets/logo-header.png";
import logoIcon from "@/assets/logo-icon.png";

type LogoProps = {
  compact?: boolean;
  invert?: boolean;
  variant?: "full" | "icon";
  className?: string;
};

export function Logo({ compact = false, invert = false, variant = "full", className }: LogoProps) {
  const isIcon = variant === "icon";
  const src = isIcon ? logoIcon : logoFull;
  const base = isIcon
    ? (compact ? "h-9 w-9 object-contain" : "h-12 w-12 object-contain md:h-14 md:w-14")
    : (compact
        ? "h-14 w-auto object-contain md:h-16 lg:h-20"
        : "h-16 w-auto object-contain md:h-24 lg:h-28");
  return (
    <img
      src={src}
      alt="Acre em Pauta — Conectado ao que importa"
      className={`${base}${invert ? " brightness-0 invert" : ""}${className ? " " + className : ""}`}
    />
  );
}