/**
 * UNI-T UTD2025CL Laboratory Oscilloscope Front Panel Component
 * High-precision physical chassis simulation with realistic textures,
 * silk-screened typography, illuminated buttons, knurled knobs, BNC terminals,
 * probe compensation terminal, and virtual USB storage port.
 */

import React from 'react';
import {
  OscilloscopeState,
  SignalGeneratorSource,
  SignalParameters,
} from '../types/oscilloscope';
import { OscilloscopeScreen } from './OscilloscopeScreen';
import { OscilloscopeKnob } from './OscilloscopeKnob';
import { OscilloscopeButton } from './OscilloscopeButton';
import { Camera, HelpCircle, Power, Cpu, Globe } from 'lucide-react';
import { playRelayClick, playButtonClick } from '../engine/audioEffects';

interface OscilloscopePanelProps {
  state: OscilloscopeState;
  ch1Source: SignalGeneratorSource;
  ch2Source: SignalGeneratorSource;
  measurementsCh1: SignalParameters;
  measurementsCh2: SignalParameters;
  onUpdateState: (updater: (prev: OscilloscopeState) => OscilloscopeState) => void;
  onSoftKeyClick: (key: 1 | 2 | 3 | 4 | 5) => void;
  onAutoSet: () => void;
  onPrintScreen: () => void;
  onOpenHelp: () => void;
  onOpenExport?: () => void;
}

// 1-2-5 Standard Volts/Div Scale ladder
const VOLTS_DIV_STEPS = [
  0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0,
];

// 1-2-5 Standard Timebase Sec/Div Scale ladder (5ns to 50s)
const SEC_DIV_STEPS = [
  5e-9, 10e-9, 20e-9, 5e-8, 1e-7, 2e-7, 5e-7,
  1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4,
  1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 1e-1, 2e-1, 5e-1,
  1.0, 2.0, 5.0, 10.0, 20.0, 50.0,
];


export const OscilloscopePanel: React.FC<OscilloscopePanelProps> = ({
  state,
  ch1Source,
  ch2Source,
  measurementsCh1,
  measurementsCh2,
  onUpdateState,
  onSoftKeyClick,
  onAutoSet,
  onPrintScreen,
  onOpenHelp,
  onOpenExport,
}) => {
  // Format Sec/Div for display
  const formatSecDiv = (s: number) => {
    if (s < 1e-6) return `${(s * 1e9).toFixed(0)}ns`;
    if (s < 1e-3) return `${(s * 1e6).toFixed(0)}μs`;
    if (s < 1) return `${(s * 1e3).toFixed(0)}ms`;
    return `${s.toFixed(0)}s`;
  };

  // Format Volts/Div for display
  const formatVoltsDiv = (v: number) => {
    if (v < 1) return `${(v * 1000).toFixed(0)}mV`;
    return `${v.toFixed(0)}V`;
  };

  // Knob Handlers
  const handleVoltsDivRotate = (delta: number) => {
    playRelayClick(state.soundEnabled);
    onUpdateState((prev) => {
      // Rotate active channel (CH1 by default or CH2 if CH1 disabled)
      const targetCh = prev.ch1.enabled ? 'ch1' : 'ch2';
      const currVal = prev[targetCh].voltsDiv;
      let idx = VOLTS_DIV_STEPS.indexOf(currVal);
      if (idx === -1) {
        idx = VOLTS_DIV_STEPS.findIndex((s) => s >= currVal);
        if (idx === -1) idx = 8;
      }
      const newIdx = Math.max(0, Math.min(VOLTS_DIV_STEPS.length - 1, idx + delta));
      return {
        ...prev,
        [targetCh]: {
          ...prev[targetCh],
          voltsDiv: VOLTS_DIV_STEPS[newIdx],
        },
      };
    });
  };

  const handleSecDivRotate = (delta: number) => {
    onUpdateState((prev) => {
      let idx = SEC_DIV_STEPS.indexOf(prev.timeDiv);
      if (idx === -1) {
        idx = SEC_DIV_STEPS.findIndex((s) => s >= prev.timeDiv);
        if (idx === -1) idx = 15;
      }
      const newIdx = Math.max(0, Math.min(SEC_DIV_STEPS.length - 1, idx + delta));
      return {
        ...prev,
        timeDiv: SEC_DIV_STEPS[newIdx],
      };
    });
  };

  const handleVertPosRotate = (delta: number) => {
    onUpdateState((prev) => {
      const targetCh = prev.ch1.enabled ? 'ch1' : 'ch2';
      return {
        ...prev,
        [targetCh]: {
          ...prev[targetCh],
          position: Math.max(-4, Math.min(4, prev[targetCh].position + delta * 0.1)),
        },
      };
    });
  };

  const handleHoriPosRotate = (delta: number) => {
    onUpdateState((prev) => ({
      ...prev,
      horiPos: prev.horiPos + delta * (prev.timeDiv * 0.2),
    }));
  };

  const handleTriggerLevelRotate = (delta: number) => {
    onUpdateState((prev) => {
      const vDiv = prev.trigger.source === 'CH2' ? prev.ch2.voltsDiv : prev.ch1.voltsDiv;
      return {
        ...prev,
        trigger: {
          ...prev.trigger,
          level: prev.trigger.level + delta * (vDiv * 0.1),
        },
      };
    });
  };

  const handleMultipurposeRotate = (delta: number) => {
    onUpdateState((prev) => {
      if (prev.activeMenu === 'CURSOR') {
        const cur = prev.cursor.activeCursor;
        if (prev.cursor.type === 'Voltage') {
          return {
            ...prev,
            cursor: {
              ...prev.cursor,
              [cur === 'a' ? 'cursorVa' : 'cursorVb']:
                prev.cursor[cur === 'a' ? 'cursorVa' : 'cursorVb'] + delta * (prev.ch1.voltsDiv * 0.1),
            },
          };
        } else if (prev.cursor.type === 'Time') {
          return {
            ...prev,
            cursor: {
              ...prev.cursor,
              [cur === 'a' ? 'cursorTa' : 'cursorTb']:
                prev.cursor[cur === 'a' ? 'cursorTa' : 'cursorTb'] + delta * (prev.timeDiv * 0.1),
            },
          };
        }
      }
      if (prev.activeMenu === 'DISPLAY') {
        return {
          ...prev,
          display: {
            ...prev.display,
            waveformBrightness: Math.max(10, Math.min(100, prev.display.waveformBrightness + delta * 5)),
          },
        };
      }
      if (prev.activeMenu === 'HORI') {
        return {
          ...prev,
          trigger: {
            ...prev.trigger,
            holdoff: Math.max(8e-8, Math.min(1.5, prev.trigger.holdoff + delta * 1e-7)),
          },
        };
      }
      return prev;
    });
  };

  const handleMultipurposePush = () => {
    playButtonClick(state.soundEnabled);
    onUpdateState((prev) => {
      if (prev.activeMenu === 'CURSOR') {
        return {
          ...prev,
          cursor: {
            ...prev.cursor,
            activeCursor: prev.cursor.activeCursor === 'a' ? 'b' : 'a',
          },
        };
      }
      return prev;
    });
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto bg-gradient-to-b from-[#e5e9f0] via-[#dce1ea] to-[#cfd6e3] rounded-2xl shadow-2xl border-4 border-[#b0bac9] p-4 sm:p-6 text-gray-800">
      {/* Top Chassis Bevel with UNI-T Brand & Device Title */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-gray-400 pb-3 mb-4 gap-4">
        <div className="flex items-center space-x-4">
          {/* UNI-T Signature Logo */}
          <div className="flex items-center space-x-1.5 bg-[#c8102e] text-white px-2.5 py-1 rounded shadow">
            <span className="font-black text-lg tracking-tighter">UNI-T</span>
            <span className="text-[10px] font-bold">®</span>
          </div>

          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-tight text-gray-900 uppercase">
              UTD2025CL
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider text-gray-600 uppercase">
              25MHz 250MS/s DIGITAL STORAGE OSCILLOSCOPE
            </span>
          </div>
        </div>

        {/* Top Control Bar with Power Switch & PrtSc */}
        {/* Top Control Bar with Power Switch, PrtSc, Engine Export & Help */}
        <div className="flex flex-wrap items-center space-x-2">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => {
              playButtonClick(state.soundEnabled);
              const nextLang = state.language === 'CN' ? 'EN' : state.language === 'EN' ? 'AR' : 'CN';
              onUpdateState((prev) => ({ ...prev, language: nextLang }));
            }}
            className="px-2.5 py-1.5 bg-gradient-to-b from-gray-100 to-gray-300 hover:from-white hover:to-gray-200 border border-gray-400 rounded shadow-xs text-xs font-bold text-gray-800 flex items-center gap-1 active:translate-y-0.5"
            title="Toggle Language: Chinese (中文 - جهاز الجامعة) / English / Arabic"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{state.language === 'CN' ? '中文 (جامعة)' : state.language === 'EN' ? 'English' : 'عربي'}</span>
          </button>

          {/* Engine Architecture & Export Modal Button */}
          {onOpenExport && (
            <button
              type="button"
              onClick={onOpenExport}
              className="px-2.5 py-1.5 bg-gradient-to-b from-cyan-100 to-cyan-200 hover:from-cyan-50 hover:to-cyan-100 border border-cyan-500 rounded shadow-xs text-xs font-bold text-cyan-950 flex items-center gap-1 active:translate-y-0.5"
              title="معمارية وتصدير المحرك (Oscilloscope Core Engine Export)"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-700" />
              <span>تصدير المحرك (Engine)</span>
            </button>
          )}

          {/* PrtSc Screenshot Button */}
          <button
            type="button"
            onClick={onPrintScreen}
            className="px-2.5 py-1.5 bg-gradient-to-b from-gray-100 to-gray-300 hover:from-white hover:to-gray-200 border border-gray-400 rounded shadow-xs text-xs font-bold text-gray-800 flex items-center gap-1 active:translate-y-0.5"
            title="PrtSc: Save Screenshot / Bitmap to USB"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-700" />
            <span>PrtSc</span>
          </button>

          {/* Help Button */}
          <button
            type="button"
            onClick={onOpenHelp}
            className="px-2.5 py-1.5 bg-gradient-to-b from-gray-100 to-gray-300 hover:from-white hover:to-gray-200 border border-gray-400 rounded shadow-xs text-xs font-bold text-gray-800 flex items-center gap-1 active:translate-y-0.5"
            title="Built-in Help System"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
            <span>HELP</span>
          </button>

          {/* Main Power Rocker Switch */}
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-400">
            <button
              type="button"
              onClick={() => {
                playButtonClick(state.soundEnabled);
                onUpdateState((prev) => ({ ...prev, powerOn: !prev.powerOn }));
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all shadow-md cursor-pointer ${
                state.powerOn
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_#10b981]'
                  : 'bg-gray-400 border-gray-500 text-gray-700'
              }`}
              title="Power ON/OFF"
            >
              <Power className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">POWER</span>
          </div>
        </div>

      </div>

      {/* Main Body: Left LCD Display with F1-F5 Softkeys, Right Controls Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Screen Bezel & LCD Frame (lg: 7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* LCD Bezel Frame with corner screws and dark surround */}
          <div className="w-full bg-gradient-to-b from-[#2d3748] via-[#1a202c] to-[#111827] p-3 sm:p-4 rounded-xl shadow-2xl border-2 border-[#4a5568] relative flex">
            {/* Screen Display Area */}
            <div className="w-full aspect-[16/10] max-h-[420px] rounded-lg overflow-hidden border border-[#0d213b] shadow-inner">
              <OscilloscopeScreen
                state={state}
                ch1Source={ch1Source}
                ch2Source={ch2Source}
                measurementsCh1={measurementsCh1}
                measurementsCh2={measurementsCh2}
                onSoftKeyClick={onSoftKeyClick}
              />
            </div>

            {/* F1 - F5 Physical Softkeys alongside screen right edge */}
            {state.menuVisible && (
              <div className="flex flex-col justify-between py-6 pl-2.5">
                {[1, 2, 3, 4, 5].map((k) => (
                  <OscilloscopeButton
                    key={k}
                    label={`F${k}`}
                    variant="softkey"
                    soundEnabled={state.soundEnabled}
                    onClick={() => onSoftKeyClick(k as 1 | 2 | 3 | 4 | 5)}
                    title={`Soft-key F${k}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom BNC Input Terminals Bar */}
          <div className="w-full mt-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 p-3 rounded-xl border border-gray-400 shadow-md flex flex-wrap items-center justify-around gap-4">
            {/* CH1 (X) BNC */}
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-bold text-cyan-800 uppercase tracking-tight">CH1 (X)</div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 border-2 border-cyan-600 shadow-inner flex items-center justify-center p-1">
                <div className="w-4 h-4 rounded-full bg-gray-900 border border-amber-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
              </div>
              <span className="text-[9px] font-mono text-gray-600">1MΩ 24pF</span>
            </div>

            {/* CH2 (Y) BNC */}
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-tight">CH2 (Y)</div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 border-2 border-amber-500 shadow-inner flex items-center justify-center p-1">
                <div className="w-4 h-4 rounded-full bg-gray-900 border border-amber-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
              </div>
              <span className="text-[9px] font-mono text-gray-600">1MΩ 24pF</span>
            </div>

            {/* EXT TRIG BNC */}
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-bold text-gray-700 uppercase tracking-tight">EXT TRIG</div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 border-2 border-gray-600 shadow-inner flex items-center justify-center p-1">
                <div className="w-4 h-4 rounded-full bg-gray-900 border border-amber-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
              </div>
              <span className="text-[9px] font-mono text-gray-600">±3V MAX</span>
            </div>

            {/* Probe Comp 1kHz ~3Vpp Terminal */}
            <div className="flex flex-col items-center bg-gray-100 px-3 py-1.5 rounded border border-gray-300 shadow-sm">
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">PROBE COMP</span>
              <div className="flex items-center space-x-2 my-0.5">
                <div className="w-5 h-3 bg-amber-300 border border-amber-600 rounded-sm shadow-sm flex items-center justify-center text-[8px] font-black">
                  ~
                </div>
                <div className="w-3 h-3 bg-gray-600 rounded-full border border-gray-400 flex items-center justify-center text-[7px] text-white">
                  ⏚
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold text-gray-700">1kHz 3Vpp</span>
            </div>

            {/* Front USB OTG Port */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">USB HOST</span>
              <button
                type="button"
                onClick={() => {
                  playButtonClick(state.soundEnabled);
                  onUpdateState((prev) => ({ ...prev, usbPlugged: !prev.usbPlugged }));
                }}
                className={`w-8 h-5 rounded border border-gray-500 shadow-inner flex items-center justify-center transition-colors cursor-pointer ${
                  state.usbPlugged ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
                title={state.usbPlugged ? 'USB Drive Plugged In (Click to remove)' : 'Insert Virtual USB Drive'}
              >
                <span className="text-[8px] font-mono font-bold">{state.usbPlugged ? 'USB' : 'PORT'}</span>
              </button>
              <span className="text-[8px] text-gray-500">{state.usbPlugged ? 'Ready' : 'Empty'}</span>
            </div>
          </div>
        </div>

        {/* Right Side Control Section (lg: 5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Top Control Header: MULTIPURPOSE Knob + User Menus & AUTO / RUN/STOP */}
          <div className="bg-gradient-to-b from-[#f0f4f8] via-[#e2e8f0] to-[#d8e0ea] p-3 rounded-xl border border-gray-400 shadow-md">
            <div className="grid grid-cols-12 gap-3 items-center">
              {/* Multipurpose Knob (Left col) */}
              <div className="col-span-4 flex flex-col items-center border-r border-gray-300 pr-2">
                <OscilloscopeKnob
                  label="MULTIPURPOSE"
                  subLabel="PUSH SELECTED"
                  size="md"
                  accentColor="#00e5ff"
                  soundEnabled={state.soundEnabled}
                  onRotate={handleMultipurposeRotate}
                  onPush={handleMultipurposePush}
                />
              </div>

              {/* User Function Menus (Center 5 cols) */}
              <div className="col-span-5 grid grid-cols-2 gap-1.5">
                <OscilloscopeButton
                  label="MEASURE"
                  active={state.activeMenu === 'MEASURE'}
                  soundEnabled={state.soundEnabled}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: prev.activeMenu === 'MEASURE' ? 'NONE' : 'MEASURE',
                      menuVisible: true,
                    }))
                  }
                />
                <OscilloscopeButton
                  label="ACQUIRE"
                  active={state.activeMenu === 'ACQUIRE'}
                  soundEnabled={state.soundEnabled}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: prev.activeMenu === 'ACQUIRE' ? 'NONE' : 'ACQUIRE',
                      menuVisible: true,
                    }))
                  }
                />
                <OscilloscopeButton
                  label="STORAGE"
                  active={state.activeMenu === 'STORAGE'}
                  soundEnabled={state.soundEnabled}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: prev.activeMenu === 'STORAGE' ? 'NONE' : 'STORAGE',
                      menuVisible: true,
                    }))
                  }
                />
                <OscilloscopeButton
                  label="CURSOR"
                  active={state.activeMenu === 'CURSOR'}
                  soundEnabled={state.soundEnabled}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: prev.activeMenu === 'CURSOR' ? 'NONE' : 'CURSOR',
                      menuVisible: true,
                    }))
                  }
                />
                <OscilloscopeButton
                  label="DISPLAY"
                  active={state.activeMenu === 'DISPLAY'}
                  soundEnabled={state.soundEnabled}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: prev.activeMenu === 'DISPLAY' ? 'NONE' : 'DISPLAY',
                      menuVisible: true,
                    }))
                  }
                />
                <OscilloscopeButton
                  label="UTILITY"
                  active={state.activeMenu === 'UTILITY'}
                  soundEnabled={state.soundEnabled}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: prev.activeMenu === 'UTILITY' ? 'NONE' : 'UTILITY',
                      menuVisible: true,
                    }))
                  }
                />
              </div>

              {/* Execution & Automation: AUTO + RUN/STOP (Right 3 cols) */}
              <div className="col-span-3 flex flex-col space-y-2">
                <OscilloscopeButton
                  label="RUN/STOP"
                  active={true}
                  ledColor={state.runMode === 'RUN' ? 'green' : 'red'}
                  soundEnabled={state.soundEnabled}
                  onClick={() => {
                    playButtonClick(state.soundEnabled);
                    onUpdateState((prev) => ({
                      ...prev,
                      runMode: prev.runMode === 'RUN' ? 'STOP' : 'RUN',
                    }));
                  }}
                  className="w-full py-2.5 font-black"
                />
                <OscilloscopeButton
                  label="AUTO"
                  soundEnabled={state.soundEnabled}
                  onClick={onAutoSet}
                  className="w-full py-2 bg-gradient-to-b from-sky-100 to-sky-300 font-bold border-sky-400 text-sky-950"
                  title="Auto-Set: Automatically detect signal & optimize scale"
                />
              </div>
            </div>
          </div>

          {/* Vertical Control Area (CH1, CH2, MATH, POSITION, SCALE) */}
          <div className="bg-gradient-to-b from-[#f0f4f8] via-[#e2e8f0] to-[#d8e0ea] p-3 rounded-xl border border-gray-400 shadow-md">
            <div className="flex items-center justify-between border-b border-gray-300 pb-1 mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                VERTICAL SYSTEM
              </span>
              <span className="text-[10px] font-mono text-gray-500">1mV - 20V/div</span>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              {/* Channel Select Buttons */}
              <div className="col-span-4 flex flex-col space-y-1.5">
                <OscilloscopeButton
                  label="CH1"
                  variant="channel"
                  active={state.ch1.enabled}
                  ledColor="cyan"
                  soundEnabled={state.soundEnabled}
                  onClick={() => {
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: 'CH1',
                      menuVisible: true,
                      ch1: { ...prev.ch1, enabled: !prev.ch1.enabled || prev.activeMenu !== 'CH1' },
                    }));
                  }}
                />
                <OscilloscopeButton
                  label="CH2"
                  variant="channel"
                  active={state.ch2.enabled}
                  ledColor="yellow"
                  soundEnabled={state.soundEnabled}
                  onClick={() => {
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: 'CH2',
                      menuVisible: true,
                      ch2: { ...prev.ch2, enabled: !prev.ch2.enabled || prev.activeMenu !== 'CH2' },
                    }));
                  }}
                />
                <OscilloscopeButton
                  label="MATH"
                  variant="channel"
                  active={state.math.enabled}
                  ledColor="red"
                  soundEnabled={state.soundEnabled}
                  onClick={() => {
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: 'MATH',
                      menuVisible: true,
                      math: { ...prev.math, enabled: !prev.math.enabled || prev.activeMenu !== 'MATH' },
                    }));
                  }}
                />
              </div>

              {/* Vertical POSITION Knob */}
              <div className="col-span-4 flex flex-col items-center">
                <OscilloscopeKnob
                  label="POSITION"
                  subLabel="VERTICAL"
                  size="sm"
                  accentColor="#00e5ff"
                  soundEnabled={state.soundEnabled}
                  onRotate={handleVertPosRotate}
                  valueDisplay={`${(state.ch1.enabled ? state.ch1.position : state.ch2.position).toFixed(1)}div`}
                />
              </div>

              {/* VOLTS/DIV Scale Knob */}
              <div className="col-span-4 flex flex-col items-center">
                <OscilloscopeKnob
                  label="VOLTS/DIV"
                  subLabel="SCALE"
                  size="md"
                  accentColor="#00e5ff"
                  soundEnabled={state.soundEnabled}
                  onRotate={handleVoltsDivRotate}
                  valueDisplay={formatVoltsDiv(state.ch1.enabled ? state.ch1.voltsDiv : state.ch2.voltsDiv)}
                />
              </div>
            </div>
          </div>

          {/* Horizontal Control Area (Timebase, SEC/DIV, POSITION, HORI MENU) */}
          <div className="bg-gradient-to-b from-[#f0f4f8] via-[#e2e8f0] to-[#d8e0ea] p-3 rounded-xl border border-gray-400 shadow-md">
            <div className="flex items-center justify-between border-b border-gray-300 pb-1 mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                HORIZONTAL SYSTEM
              </span>
              <span className="text-[10px] font-mono text-gray-500">5ns - 50s/div</span>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-4 flex flex-col space-y-1.5">
                <OscilloscopeButton
                  label="HORI MENU"
                  active={state.activeMenu === 'HORI'}
                  soundEnabled={state.soundEnabled}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: prev.activeMenu === 'HORI' ? 'NONE' : 'HORI',
                      menuVisible: true,
                    }))
                  }
                />
                <OscilloscopeButton
                  label="SET TO ZERO"
                  subLabel="CENTER"
                  soundEnabled={state.soundEnabled}
                  onClick={() => {
                    playButtonClick(state.soundEnabled);
                    onUpdateState((prev) => ({ ...prev, horiPos: 0 }));
                  }}
                  title="Reset horizontal position to center"
                />
              </div>

              <div className="col-span-4 flex flex-col items-center">
                <OscilloscopeKnob
                  label="POSITION"
                  subLabel="HORIZONTAL"
                  size="sm"
                  soundEnabled={state.soundEnabled}
                  onRotate={handleHoriPosRotate}
                />
              </div>

              <div className="col-span-4 flex flex-col items-center">
                <OscilloscopeKnob
                  label="SEC/DIV"
                  subLabel="TIMEBASE"
                  size="md"
                  soundEnabled={state.soundEnabled}
                  onRotate={handleSecDivRotate}
                  valueDisplay={formatSecDiv(state.timeDiv)}
                />
              </div>
            </div>
          </div>

          {/* Trigger Control Area (LEVEL, TRIG MENU, FORCE, SET TO ZERO) */}
          <div className="bg-gradient-to-b from-[#f0f4f8] via-[#e2e8f0] to-[#d8e0ea] p-3 rounded-xl border border-gray-400 shadow-md">
            <div className="flex items-center justify-between border-b border-gray-300 pb-1 mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                TRIGGER SYSTEM
              </span>
              <span className="text-[10px] font-mono text-gray-500">EDGE / PULSE</span>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-4 flex flex-col space-y-1.5">
                <OscilloscopeButton
                  label="TRIG MENU"
                  active={state.activeMenu === 'TRIGGER'}
                  soundEnabled={state.soundEnabled}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      activeMenu: prev.activeMenu === 'TRIGGER' ? 'NONE' : 'TRIGGER',
                      menuVisible: true,
                    }))
                  }
                />
                <OscilloscopeButton
                  label="FORCE"
                  soundEnabled={state.soundEnabled}
                  onClick={() => {
                    playButtonClick(state.soundEnabled);
                    onUpdateState((prev) => ({
                      ...prev,
                      trigger: { ...prev.trigger, mode: 'AUTO' },
                    }));
                  }}
                  title="Force Trigger Cycle"
                />
              </div>

              <div className="col-span-4 flex flex-col items-center">
                <OscilloscopeButton
                  label="50%"
                  subLabel="SET TO ZERO"
                  soundEnabled={state.soundEnabled}
                  onClick={() => {
                    playButtonClick(state.soundEnabled);
                    onUpdateState((prev) => ({
                      ...prev,
                      trigger: { ...prev.trigger, level: 0 },
                    }));
                  }}
                  className="w-full h-12"
                  title="Set trigger level to 50% amplitude"
                />
              </div>

              <div className="col-span-4 flex flex-col items-center">
                <OscilloscopeKnob
                  label="LEVEL"
                  subLabel="TRIGGER"
                  size="md"
                  accentColor="#ffd600"
                  soundEnabled={state.soundEnabled}
                  onRotate={handleTriggerLevelRotate}
                  valueDisplay={`${formatVoltsDiv(state.trigger.level)}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
