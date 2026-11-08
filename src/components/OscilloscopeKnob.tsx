/**
 * Tactile Rotary Knob Component for UNI-T Oscilloscope
 * Supports rotary dragging, mouse wheel, push-to-click, and mechanical detent audio.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { playKnobTick } from '../engine/audioEffects';

interface OscilloscopeKnobProps {
  label: string;
  subLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  valueDisplay?: string;
  angle?: number; // current angle in degrees
  soundEnabled?: boolean;
  onRotate: (delta: number) => void; // delta +1 or -1
  onPush?: () => void;
  accentColor?: string;
  showSteppers?: boolean;
}

export const OscilloscopeKnob: React.FC<OscilloscopeKnobProps> = ({
  label,
  subLabel,
  size = 'md',
  valueDisplay,
  angle = 0,
  soundEnabled = true,
  onRotate,
  onPush,
  accentColor = '#cbd5e1',
  showSteppers = true,
}) => {
  const [internalAngle, setInternalAngle] = useState(angle);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const accumulatedDeltaRef = useRef<number>(0);

  useEffect(() => {
    setInternalAngle(angle);
  }, [angle]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    accumulatedDeltaRef.current = 0;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || dragStartYRef.current === null) return;
    const dy = dragStartYRef.current - e.clientY;
    dragStartYRef.current = e.clientY;
    accumulatedDeltaRef.current += dy;

    // Threshold of 6 pixels per rotary step
    if (Math.abs(accumulatedDeltaRef.current) >= 6) {
      const step = accumulatedDeltaRef.current > 0 ? 1 : -1;
      accumulatedDeltaRef.current = 0;
      setInternalAngle((prev) => (prev + step * 18) % 360);
      playKnobTick(soundEnabled);
      onRotate(step);
    }
  }, [isDragging, onRotate, soundEnabled]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartYRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 1 : -1;
    setInternalAngle((prev) => (prev + step * 18) % 360);
    playKnobTick(soundEnabled);
    onRotate(step);
  };

  const sizePx = size === 'sm' ? 36 : size === 'lg' ? 54 : 44;

  const handleStep = (step: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalAngle((prev) => (prev + step * 18) % 360);
    playKnobTick(soundEnabled);
    onRotate(step);
  };

  return (
    <div className="flex flex-col items-center justify-center select-none group">
      <div className="text-[10px] font-bold text-gray-700 tracking-wider uppercase text-center mb-0.5 leading-tight">
        {label}
      </div>

      <div
        className="relative flex items-center justify-center cursor-ns-resize"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onClick={(e) => {
          if (!isDragging && onPush && e.detail === 1) {
            onPush();
          }
        }}
        title={`${label}: ${valueDisplay || ''} (Drag or scroll to rotate${onPush ? ', click to push' : ''})`}
        style={{ width: sizePx + 10, height: sizePx + 10 }}
      >
        {/* Outer metallic shadow bezel */}
        <div
          className="absolute rounded-full border border-gray-400 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-400 shadow-md flex items-center justify-center"
          style={{ width: sizePx + 6, height: sizePx + 6 }}
        >
          {/* Knob Body with knurled grip ring */}
          <div
            className="rounded-full bg-gradient-to-b from-[#2b313b] via-[#1e232a] to-[#12161c] shadow-inner relative flex items-center justify-center border border-gray-600 transition-transform duration-75"
            style={{
              width: sizePx,
              height: sizePx,
              transform: `rotate(${internalAngle}deg)`,
            }}
          >
            {/* Center cap with accent ring */}
            <div
              className="rounded-full bg-gradient-to-b from-[#3a424e] to-[#222831] border border-gray-500 shadow flex items-center justify-center"
              style={{ width: sizePx * 0.72, height: sizePx * 0.72 }}
            >
              {/* Pointer indicator tick notch */}
              <div
                className="absolute top-1 rounded-full shadow-sm"
                style={{
                  width: 3,
                  height: sizePx * 0.28,
                  backgroundColor: accentColor,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sublabel or Value readout */}
      {subLabel && (
        <span className="text-[9px] font-semibold text-gray-500 tracking-tight text-center mt-0.5">
          {subLabel}
        </span>
      )}

      {/* Quick Step Buttons & Value */}
      <div className="flex items-center space-x-1 mt-0.5">
        {showSteppers && (
          <button
            type="button"
            onClick={(e) => handleStep(-1, e)}
            className="w-4 h-4 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 text-[9px] font-black flex items-center justify-center border border-gray-400 shadow-xs cursor-pointer"
            title="Step Down / Decrease"
          >
            -
          </button>
        )}

        {valueDisplay && (
          <span className="text-[9px] font-mono font-bold text-cyan-900 bg-cyan-100/90 px-1 py-0.5 rounded border border-cyan-300/80 shadow-2xs">
            {valueDisplay}
          </span>
        )}

        {showSteppers && (
          <button
            type="button"
            onClick={(e) => handleStep(1, e)}
            className="w-4 h-4 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 text-[9px] font-black flex items-center justify-center border border-gray-400 shadow-xs cursor-pointer"
            title="Step Up / Increase"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};

