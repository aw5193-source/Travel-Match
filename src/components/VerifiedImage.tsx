/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface Props {
  src?: string;
  sources?: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  children?: React.ReactNode;
}

export const VerifiedImage: React.FC<Props> = ({
  src,
  sources = [],
  alt,
  className = 'w-full h-full',
  imageClassName = 'w-full h-full object-cover',
  fallbackClassName = '',
  children,
}) => {
  const candidates = useMemo(
    () => [...new Set([src, ...sources].filter((value): value is string => Boolean(value?.trim())))],
    [src, sources],
  );
  const candidateKey = candidates.join('|');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failed, setFailed] = useState(candidates.length === 0);

  useEffect(() => {
    setCurrentIndex(0);
    setFailed(candidates.length === 0);
  }, [candidateKey, candidates.length]);

  const activeSrc = !failed ? candidates[currentIndex] : '';

  return (
    <div className={className}>
      {!failed && activeSrc ? (
        <img
          src={activeSrc}
          alt={alt}
          className={imageClassName}
          referrerPolicy="no-referrer"
          onError={() => {
            if (currentIndex < candidates.length - 1) {
              setCurrentIndex((index) => index + 1);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : (
        <div
          className={`w-full h-full bg-zinc-100 text-zinc-400 flex flex-col items-center justify-center gap-2 text-center ${fallbackClassName}`}
        >
          <ImageOff className="w-6 h-6" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em]">
            Photo unavailable
          </span>
        </div>
      )}
      {children}
    </div>
  );
};
