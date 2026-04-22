import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-muted-foreground text-sm font-medium tracking-[0.22em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-3 max-w-3xl text-base leading-7">
          {description}
        </p>
      ) : null}
    </div>
  );
}
