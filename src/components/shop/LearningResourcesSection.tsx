import { GraduationCap, MapPin, type LucideIcon } from "lucide-react";

interface ResourcePlaceholder {
  title: string;
  description: string;
  /** Short format/meta line, e.g. "Online · Video course". */
  meta: string;
  icon: LucideIcon;
}

// Static placeholders for the upcoming Learning resources category. These are
// not real shop_items yet — they advertise what's coming and will be replaced
// by seeded, purchasable rows once the offerings are finalised.
const PLACEHOLDERS: ResourcePlaceholder[] = [
  {
    title: "Italian grammar course",
    description:
      "A self-paced video course taking you through Italian grammar from the ground up.",
    meta: "Online · Video course",
    icon: GraduationCap,
  },
  {
    title: "Italian bootcamp",
    description:
      "A one-week immersive language retreat in the heart of Tuscany.",
    meta: "In-person · 1 week · Tuscany",
    icon: MapPin,
  },
];

export function LearningResourcesSection() {
  return (
    <section className="mb-10">
      <h2 className="text-xl-semibold text-foreground">Learning resources</h2>
      <p className="mt-1 text-[14px] leading-[1.4] text-muted-foreground">
        Spend coins on courses and experiences to take your Italian further.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDERS.map((resource) => {
          const Icon = resource.icon;
          return (
            <div
              key={resource.title}
              className="flex h-full flex-col rounded-2xl border-[1.5px] border-dashed border-gray-200 bg-white p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100">
                  <Icon className="h-7 w-7 text-muted-foreground" strokeWidth={1.67} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-regular-semibold text-foreground">
                    {resource.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-[1.4] text-muted-foreground">
                    {resource.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 pt-1">
                <span className="text-xs-medium text-muted-foreground">
                  {resource.meta}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs-medium text-muted-foreground">
                  Coming soon
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
