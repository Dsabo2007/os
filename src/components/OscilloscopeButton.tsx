/**
 * Tactile Oscilloscope Button Component
 * Simulates real laboratory push-button switches with LED illumination,
 * mechanical depth depression, silk-screened typography, and audio clicks.
 */

import React from 'react';
import { playButtonClick } from '../engine/audioEffects';

interface OscilloscopeButtonProps {
  label: string;
  subLabel?: string;
  active?: boolean;
  ledColor?: 'green' | 'red' | 'cyan' | 'yellow' | 'blue' | 'none';
  variant?: 'softkey' | 'menu' | 'action' | 'channel' | 'power';
  soundEnabled?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
}

export const OscilloscopeButton: React.FC<OscilloscopeButtonProps> = ({
  label,
  subLabel,
  active = false,
  ledColor = 'none',
  variant = 'menu',
  soundEnabled = true,
  disabled = false,
  onClick,
  title,
  className = '',
}) => {
  const handleClick = () => {
    if (disabled) return;
    playButtonClick(soundEnabled);
    onClick();
  };

  // Illumination styles
  let glowStyle = '';
  if (active || ledColor !== 'none') {
    if (ledColor === 'green') {
      glowStyle = 'bg-emerald-600 text-white shadow-[0_0_8px_#10b981] border-emerald-400';
    } else if (ledColor === 'red') {
      glowStyle = 'bg-rose-600 text-white shadow-[0_0_8px_#f43f5e] border-rose-400';
    } else if (ledColor === 'cyan') {
      glowStyle = 'bg-cyan-600 text-white shadow-[0_0_8px_#06b6d4] border-cyan-300';
    } else if (ledColor === 'yellow') {
      glowStyle = 'bg-amber-500 text-white shadow-[0_0_8px_#f59e0b] border-amber-300';
    } else if (ledColor === 'blue') {
      glowStyle = 'bg-blue-600 text-white shadow-[0_0_8px_#3b82f6] border-blue-400';
    }
  }

  // Softkey styling (F1-F5 alongside screen)
  if (variant === 'softkey') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        title={title || label}
        className={`w-7 h-9 rounded-sm bg-gradient-to-b from-[#e8ecf1] via-[#d5dbe3] to-[#b8c2ce] border border-[#94a3b8] active:translate-y-0.5 active:shadow-inner shadow flex flex-col items-center justify-center cursor-pointer transition-all ${className}`}
      >
        <span className="text-[10px] font-bold text-gray-700 leading-none">{label}</span>
      </button>
    );
  }

  // Channel button (CH1, CH2, MATH)
  if (variant === 'channel') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        title={title || label}
        className={`px-3 py-1.5 rounded bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border active:translate-y-0.5 shadow-sm flex flex-col items-center justify-center cursor-pointer transition-all ${
          active ? glowStyle : 'border-gray-400 text-gray-800'
        } ${className}`}
      >
        <div className="flex items-center space-x-1">
          {ledColor !== 'none' && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                active
                  ? ledColor === 'cyan'
                    ? 'bg-cyan-300 shadow-[0_0_4px_#22d3ee]'
                    : ledColor === 'yellow'
                    ? 'bg-amber-300 shadow-[0_0_4px_#fde047]'
                    : 'bg-rose-400 shadow-[0_0_4px_#fb7185]'
                  : 'bg-gray-400'
              }`}
            />
          )}
          <span className="text-xs font-bold tracking-tight">{label}</span>
        </div>
      </button>
    );
  }

  // Default menu or action button
  const defaultBg = glowStyle
    ? glowStyle
    : 'bg-gradient-to-b from-[#f1f5f9] via-[#e2e8f0] to-[#cbd5e1] border-gray-400 text-gray-800 hover:border-gray-500';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      title={title || label}
      className={`px-2 py-1.5 rounded border active:translate-y-0.5 active:shadow-inner shadow-sm flex flex-col items-center justify-center cursor-pointer transition-all ${defaultBg} ${className}`}
    >
      <span className="text-[10px] font-bold tracking-wide uppercase leading-tight">{label}</span>
      {subLabel && (
        <span className="text-[8px] font-semibold opacity-80 leading-none mt-0.5">{subLabel}</span>
      )}
    </button>
  );
};
