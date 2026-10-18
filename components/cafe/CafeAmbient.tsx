import Image from "next/image";

/**
 * On wide screens the artwork stays a portrait column in the middle. This fills
 * the space around it with a soft, dimmed blur of the same café, so the page
 * feels like one warm room instead of a phone on a dark desktop. Static.
 */
export default function CafeAmbient() {
  return (
    <div className="absolute inset-0 hidden overflow-hidden md:block" aria-hidden="true">
      <Image
        src="/images/cafe-background.png"
        alt=""
        fill
        quality={75}
        sizes="40vw"
        className="scale-125 object-cover opacity-60 blur-2xl"
        draggable={false}
      />
      <div className="absolute inset-0 bg-white/60" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_30%,rgba(244,247,246,0.8)_100%)]" />
    </div>
  );
}
