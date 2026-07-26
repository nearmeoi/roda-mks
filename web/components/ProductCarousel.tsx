"use client";

import { useRef, useState } from "react";

export function ProductCarousel({ images, alt }: { images: string[]; alt: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  if (images.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-400">
        Belum ada foto
      </div>
    );
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex h-64 w-full snap-x snap-mandatory overflow-x-auto rounded-2xl"
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${alt} ${i + 1}`}
            className="h-64 w-full flex-shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === activeIndex ? "bg-brand-green" : "bg-gray-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
