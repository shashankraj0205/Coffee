import React from 'react';
import { BrandSettings } from '../types/store';

interface BrandLogoProps {
  brand: BrandSettings;
  className?: string;
  light?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  brand,
  className = 'w-9 h-9',
  light = false,
}) => {
  if (brand.logoType === 'image' && brand.logoUrl) {
    return (
      <div
        className={`${className} rounded-[10px] overflow-hidden border ${
          light ? 'border-[#D9A441]/30 bg-white/10' : 'border-[#6F4028]/20 bg-[#FFF9F0]'
        } shrink-0 flex items-center justify-center`}
      >
        <img
          src={brand.logoUrl}
          alt={`${brand.name} logo`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const bg = light ? '#FAF6F0' : '#0F382A';
  const saffron = brand.accentColor || '#D4A359';
  const turmeric = '#F0C97A';
  const masala = '#140E0C';
  const fg = light ? '#0F382A' : '#FAF6F0';

  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="10" fill={bg} />

      {/* Preset 1: Terracotta Kulhad Cup */}
      {(brand.logoPreset === 'kulhad' || !brand.logoPreset) && (
        <>
          <path
            d="M11.5 14H24.5L22.6 25.5C22.4 26.5 21.6 27.2 20.6 27.2H15.4C14.4 27.2 13.6 26.5 13.4 25.5L11.5 14Z"
            fill={saffron}
          />
          <ellipse cx="18" cy="14" rx="6.6" ry="2.1" fill={fg} />
          <ellipse cx="18" cy="14" rx="4.5" ry="1.1" fill={masala} />
          <path
            d="M15.2 10.5C15.2 9.1 16.7 8.8 16.7 7.4M20.2 10.5C20.2 9.1 21.7 8.8 21.7 7.4"
            stroke={turmeric}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Preset 2: Brass South Indian Davara-Tumbler */}
      {brand.logoPreset === 'davara' && (
        <>
          <path
            d="M13 11.5H23L21.8 21H14.2L13 11.5Z"
            fill={turmeric}
          />
          <ellipse cx="18" cy="11.5" rx="5" ry="1.5" fill={fg} />
          <path
            d="M9.5 20.5H26.5C26 24.5 22.8 27 18 27C13.2 27 10 24.5 9.5 20.5Z"
            fill={saffron}
          />
          <path
            d="M16.5 8.5C16.5 7.5 18 7 18 6M20 8.5C20 7.5 21.3 7 21.3 6"
            stroke={fg}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Preset 3: Traditional Indian Chai Kettle */}
      {brand.logoPreset === 'kettle' && (
        <>
          <path
            d="M11 16C11 13.5 14 12.5 18 12.5C22 12.5 25 13.5 25 16V23.5C25 25 23.5 26 21.5 26H14.5C12.5 26 11 25 11 23.5V16Z"
            fill={saffron}
          />
          <path
            d="M13 13C13 9.5 23 9.5 23 13"
            stroke={fg}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M25 17.5L28.5 15.5V18.5L25 20.5"
            stroke={turmeric}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="19.5" r="2.2" fill={fg} />
        </>
      )}

      {/* Preset 4: Indian Arch Monogram Emblem */}
      {brand.logoPreset === 'emblem' && (
        <>
          <path
            d="M10 27V16.5C10 12 13.5 9 18 9C22.5 9 26 12 26 16.5V27H10Z"
            stroke={turmeric}
            strokeWidth="1.7"
          />
          <text
            x="18"
            y="22.8"
            textAnchor="middle"
            fill={fg}
            fontFamily="Shantell Sans, sans-serif"
            fontSize="13.5"
            fontWeight="600"
          >
            {(brand.name || 'K').charAt(0).toUpperCase()}
          </text>
        </>
      )}
    </svg>
  );
};
