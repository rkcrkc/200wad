import Image from "next/image";

/**
 * A hand-drawn callout annotation: the tan arrow SVG above a short Inter-Medium
 * note, the whole thing tilted. The arrow's rotation/flip and the overall tilt
 * differ per placement in the design, so they're passed in. Shared by the Section
 * 5 (The Solution) and Section 6 (Features) marginalia.
 */
export function CalloutAnnotation({
  text,
  wrapRotate,
  arrowClass,
  widthClass,
}: {
  text: string;
  /** Tilt of the whole callout, e.g. `rotate-[19.83deg]`. */
  wrapRotate: string;
  /** Arrow transform, e.g. `rotate-[-122.58deg]` or `-scale-y-100 rotate-[-57.42deg]`. */
  arrowClass: string;
  /** Text column width, e.g. `w-[160px]`. */
  widthClass: string;
}) {
  return (
    <div className={`flex-none ${wrapRotate}`}>
      <div className={`flex flex-col items-center gap-2 ${widthClass}`}>
        <div className="flex h-[66px] w-[58px] items-center justify-center">
          <div className={`flex-none ${arrowClass}`}>
            <Image
              src="/marketing/g/callout-arrow-1.svg"
              alt=""
              width={57}
              height={33}
              className="block max-w-none"
            />
          </div>
        </div>
        <p className="text-center text-[14px] font-medium leading-[1.4] tracking-[-0.21px] text-[var(--mono-soft)]">
          {text}
        </p>
      </div>
    </div>
  );
}
