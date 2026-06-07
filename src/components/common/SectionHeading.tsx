import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  title,
  subtitle,
  className,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-6",
        align === "center" && "text-center",
        className
      )}
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
