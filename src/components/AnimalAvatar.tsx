import { useState } from "react";
import type { AnimalSpecies } from "../types";

interface AnimalAvatarProps {
  name: string;
  species: AnimalSpecies;
  photoUrl?: string;
  sizeClass?: string;
}

export function AnimalAvatar({
  name,
  species,
  photoUrl,
  sizeClass = "w-14 h-14",
}: AnimalAvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (!photoUrl || imgError) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-[#F8EAEF] border border-[#E4CDD4] flex flex-col items-center justify-center shrink-0 text-[#881337] select-none`}
        aria-label={`${name} (${species})`}
      >
        <span className="text-sm font-semibold leading-none">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span className="text-[10px] text-[#634853] mt-0.5 leading-none">
          {species}
        </span>
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={`${name} — ${species}`}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={`${sizeClass} rounded-xl object-cover border border-[#E4CDD4] shrink-0 bg-[#F8EAEF]`}
    />
  );
}
