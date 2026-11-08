/**
 * UNI-T UTD2025CL Laboratory Digital Storage Oscilloscope
 * Main Application Component
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  OscilloscopeState,
  SignalGeneratorSource,
  SignalParameters,
} from './types/oscilloscope';
import { OscilloscopePanel } from './components/OscilloscopePanel';
import { SignalSourceRack } from './components/SignalSourceRack';
import { QuickHelpModal } from './components/QuickHelpModal';
import { SystemExportModal } from './components/SystemExportModal';
import { calculateMeasurements } from './engine/dsp';
import { generateChannelSamples } from './engine/signalGenerator';
import { playRelayClick, playButtonClick, playBeep } from './engine/audioEffects';

export default function App() {
  // Oscilloscope Hardware Internal State
  const [scopeState, setScopeState] = useState<OscilloscopeState>({
    powerOn: true,
    runMode: 'RUN',
    autoActive: false,
    timeDiv: 500e-6, // 500us/div default (matching Figure 1-4 Probe Comp in manual)
    horiPos: 0,
    horiZoomMode: 'Main',
    zoomTimeDiv: 100e-6,
    zoomHoriPos: 0,

    ch1: {
      enabled: true,
      coupling: 'DC',
      bwLimit: false,
      voltsDivStep: 'Coarse',
      probe: 1,
      invert: false,
      voltsDiv: 1.0, // 1V/div default
      position: 0, // centered
    },
    ch2: {
      enabled: false,
      coupling: 'DC',
      bwLimit: false,
      voltsDivStep: 'Coarse',
      probe: 1,
      invert: false,
      voltsDiv: 1.0,
      position: -1.5,
    },
    math: {
      enabled: false,
      type: 'Math',
      source1: 'CH1',
      source2: 'CH2',
      operator: '+',
      voltsDiv: 1.0,
      position: 0, // centered about ground reference
      fftSource: 'CH1',
      fftWindow: 'Hanning',
      fftUnit: 'dBVrms',
      fftScale: 1.0,
      fftPosition: 0,
    },
    trigger: {
      type: 'Edge',
      source: 'CH1',
      slope: 'Rise',
      mode: 'AUTO',
      coupling: 'DC',
      level: 0.0,
      holdoff: 1e-7,
      pulseCondition: '>',
      pulseWidth: 1e-6,
      pulsePolarity: 'Positive',
      videoStandard: 'PAL',
      videoSync: 'All line',
    },
    acquire: {
      mode: 'Sampling',
      averages: 16,
      sampling: 'Realtime',
      fastAcq: false,
    },
    display: {
      type: 'Vector',
      format: 'YT',
      persist: 'Off',
      waveformBrightness: 90,
      gridBrightness: 70,
    },
    cursor: {
      type: 'Off',
      source: 'CH1',
      cursorVa: 1.0,
      cursorVb: -1.0,
      cursorTa: -200e-6,
      cursorTb: 200e-6,
      activeCursor: 'a',
    },

    activeMenu: 'CH1',
    menuPage: 1,
    menuVisible: true,
    selectedMeasurements: [
      { channel: 'CH1', param: 'Vpp' },
      { channel: 'CH1', param: 'Freq' },
      { channel: 'CH1', param: 'Vrms' },
      { channel: 'CH1', param: 'RiseTime' },
    ],
    showAllParametersModal: false,

    language: 'CN',
    skin: 'Classic Navy',
    frequencyCounterEnabled: true,
    soundEnabled: true,
    selfCalibrating: false,
    selfCalProgress: 0,
    usbPlugged: false,
  });

  // Signal Generator Inputs connected to CH1 & CH2 BNC jacks
  const [ch1Source, setCh1Source] = useState<SignalGeneratorSource>({
    waveform: 'probe_comp', // 1kHz 3Vpp square wave default
    frequency: 1000,
    amplitude: 3.0,
    offset: 0,
    phase: 0,
    dutyCycle: 50,
    noiseLevel: 0.1, // subtle physical noise
    probeCompTrimmer: 'correct',
    glitchEnabled: false,
  });

  const [ch2Source, setCh2Source] = useState<SignalGeneratorSource>({
    waveform: 'sine',
    frequency: 1000,
    amplitude: 2.0,
    offset: 0,
    phase: Math.PI / 2, // 90 deg phase for Lissajous
    dutyCycle: 50,
    noiseLevel: 0.08,
    probeCompTrimmer: 'correct',
    glitchEnabled: false,
  });

  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [rackExpanded, setRackExpanded] = useState(true);

  // Compute live measurements for CH1 & CH2
  const measurementsCh1 = useMemo<SignalParameters>(() => {
    const totalTime = scopeState.timeDiv * 12;
    const timeStart = scopeState.horiPos - totalTime / 2;
    const timeEnd = scopeState.horiPos + totalTime / 2;
    const samples = generateChannelSamples(ch1Source, timeStart, timeEnd, 600, {
      coupling: scopeState.ch1.coupling,
      bwLimit: scopeState.ch1.bwLimit,
      voltsDiv: scopeState.ch1.voltsDiv,
      invert: scopeState.ch1.invert,
    });
    const dt = totalTime / (samples.length - 1);
    return calculateMeasurements(samples, dt);
  }, [scopeState.timeDiv, scopeState.horiPos, scopeState.ch1, ch1Source]);

  const measurementsCh2 = useMemo<SignalParameters>(() => {
    const totalTime = scopeState.timeDiv * 12;
    const timeStart = scopeState.horiPos - totalTime / 2;
    const timeEnd = scopeState.horiPos + totalTime / 2;
    const samples = generateChannelSamples(ch2Source, timeStart, timeEnd, 600, {
      coupling: scopeState.ch2.coupling,
      bwLimit: scopeState.ch2.bwLimit,
      voltsDiv: scopeState.ch2.voltsDiv,
      invert: scopeState.ch2.invert,
    });
    const dt = totalTime / (samples.length - 1);
    return calculateMeasurements(samples, dt);
  }, [scopeState.timeDiv, scopeState.horiPos, scopeState.ch2, ch2Source]);

  // Self-calibration timer effect
  useEffect(() => {
    if (!scopeState.selfCalibrating) return;
    const interval = setInterval(() => {
      setScopeState((prev) => {
        if (prev.selfCalProgress >= 100) {
          clearInterval(interval);
          playBeep(1200, 0.25, prev.soundEnabled);
          return {
            ...prev,
            selfCalibrating: false,
            selfCalProgress: 0,
            ch1: { ...prev.ch1, position: 0 },
            ch2: { ...prev.ch2, position: 0 },
          };
        }
        return {
          ...prev,
          selfCalProgress: prev.selfCalProgress + 10,
        };
      });
    }, 200);

    return () => clearInterval(interval);
  }, [scopeState.selfCalibrating]);

  // AUTOSET algorithm: automatically finds optimal timebase, V/div, and trigger level
  const handleAutoSet = useCallback(() => {
    playButtonClick(scopeState.soundEnabled);
    playRelayClick(scopeState.soundEnabled);

    const freq = scopeState.ch1.enabled ? ch1Source.frequency : ch2Source.frequency;
    const amp = scopeState.ch1.enabled ? ch1Source.amplitude : ch2Source.amplitude;

    // 1. Calculate timebase to show ~2.5 full periods across 12 divisions
    const period = 1 / Math.max(freq, 10);
    const targetTimeDiv = (period * 2.5) / 12;

    const standardTimebases = [
      5e-9, 1e-8, 2e-8, 5e-8, 1e-7, 2e-7, 5e-7,
      1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4,
      1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 1e-1, 2e-1, 5e-1,
      1.0, 2.0, 5.0,
    ];
    let bestTimeDiv = standardTimebases[0];
    let minTimeDiff = Infinity;
    for (const t of standardTimebases) {
      const diff = Math.abs(t - targetTimeDiv);
      if (diff < minTimeDiff) {
        minTimeDiff = diff;
        bestTimeDiv = t;
      }
    }

    // 2. Calculate Volts/Div to span ~4 vertical divisions (out of 8)
    const targetVDiv = amp / 4;
    const standardVDivs = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0];
    let bestVDiv = standardVDivs[0];
    let minVDiff = Infinity;
    for (const v of standardVDivs) {
      const diff = Math.abs(v - targetVDiv);
      if (diff < minVDiff) {
        minVDiff = diff;
        bestVDiv = v;
      }
    }

    setScopeState((prev) => ({
      ...prev,
      timeDiv: bestTimeDiv,
      horiPos: 0,
      ch1: {
        ...prev.ch1,
        voltsDiv: bestVDiv,
        position: 0,
      },
      trigger: {
        ...prev.trigger,
        level: 0,
        mode: 'AUTO',
      },
    }));
  }, [scopeState.soundEnabled, scopeState.ch1.enabled, ch1Source, ch2Source]);

  // Soft-key click router (F1 - F5)
  const handleSoftKeyClick = useCallback((key: 1 | 2 | 3 | 4 | 5) => {
    playButtonClick(scopeState.soundEnabled);

    setScopeState((prev) => {
      const menu = prev.activeMenu;

      // CH1 Menu
      if (menu === 'CH1') {
        if (key === 1) {
          playRelayClick(prev.soundEnabled);
          const nextCoupling = prev.ch1.coupling === 'DC' ? 'AC' : prev.ch1.coupling === 'AC' ? 'GND' : 'DC';
          return { ...prev, ch1: { ...prev.ch1, coupling: nextCoupling } };
        }
        if (key === 2) {
          return { ...prev, ch1: { ...prev.ch1, bwLimit: !prev.ch1.bwLimit } };
        }
        if (key === 3) {
          const nextStep = prev.ch1.voltsDivStep === 'Coarse' ? 'Fine' : 'Coarse';
          return { ...prev, ch1: { ...prev.ch1, voltsDivStep: nextStep } };
        }
        if (key === 4) {
          const probes: Array<1 | 10 | 100 | 1000> = [1, 10, 100, 1000];
          const nextIdx = (probes.indexOf(prev.ch1.probe) + 1) % probes.length;
          return { ...prev, ch1: { ...prev.ch1, probe: probes[nextIdx] } };
        }
        if (key === 5) {
          return { ...prev, ch1: { ...prev.ch1, invert: !prev.ch1.invert } };
        }
      }

      // CH2 Menu
      if (menu === 'CH2') {
        if (key === 1) {
          playRelayClick(prev.soundEnabled);
          const nextCoupling = prev.ch2.coupling === 'DC' ? 'AC' : prev.ch2.coupling === 'AC' ? 'GND' : 'DC';
          return { ...prev, ch2: { ...prev.ch2, coupling: nextCoupling } };
        }
        if (key === 2) {
          return { ...prev, ch2: { ...prev.ch2, bwLimit: !prev.ch2.bwLimit } };
        }
        if (key === 3) {
          const nextStep = prev.ch2.voltsDivStep === 'Coarse' ? 'Fine' : 'Coarse';
          return { ...prev, ch2: { ...prev.ch2, voltsDivStep: nextStep } };
        }
        if (key === 4) {
          const probes: Array<1 | 10 | 100 | 1000> = [1, 10, 100, 1000];
          const nextIdx = (probes.indexOf(prev.ch2.probe) + 1) % probes.length;
          return { ...prev, ch2: { ...prev.ch2, probe: probes[nextIdx] } };
        }
        if (key === 5) {
          return { ...prev, ch2: { ...prev.ch2, invert: !prev.ch2.invert } };
        }
      }

      // MATH Menu
      if (menu === 'MATH') {
        if (key === 1) {
          return {
            ...prev,
            math: { ...prev.math, type: prev.math.type === 'Math' ? 'FFT' : 'Math' },
          };
        }
        if (prev.math.type === 'Math') {
          if (key === 2) {
            return {
              ...prev,
              math: { ...prev.math, source1: prev.math.source1 === 'CH1' ? 'CH2' : 'CH1' },
            };
          }
          if (key === 3) {
            const ops: Array<'+' | '-' | '×' | '÷'> = ['+', '-', '×', '÷'];
            const nextIdx = (ops.indexOf(prev.math.operator) + 1) % ops.length;
            return {
              ...prev,
              math: { ...prev.math, operator: ops[nextIdx] },
            };
          }
          if (key === 4) {
            return {
              ...prev,
              math: { ...prev.math, source2: prev.math.source2 === 'CH1' ? 'CH2' : 'CH1' },
            };
          }
          if (key === 5) {
            // Re-center math position
            return {
              ...prev,
              math: { ...prev.math, position: 0 },
            };
          }
        } else {
          // FFT sub-options
          if (key === 2) {
            return {
              ...prev,
              math: { ...prev.math, fftSource: prev.math.fftSource === 'CH1' ? 'CH2' : 'CH1' },
            };
          }
          if (key === 3) {
            const wins: Array<'Rectangle' | 'Hanning' | 'Hamming' | 'Blackman'> = [
              'Rectangle',
              'Hanning',
              'Hamming',
              'Blackman',
            ];
            const nextIdx = (wins.indexOf(prev.math.fftWindow) + 1) % wins.length;
            return {
              ...prev,
              math: { ...prev.math, fftWindow: wins[nextIdx] },
            };
          }
          if (key === 4) {
            return {
              ...prev,
              math: {
                ...prev.math,
                fftUnit: prev.math.fftUnit === 'dBVrms' ? 'Vrms' : 'dBVrms',
              },
            };
          }
        }
      }

      // MEASURE Menu
      if (menu === 'MEASURE') {
        if (key === 5) {
          return {
            ...prev,
            showAllParametersModal: !prev.showAllParametersModal,
          };
        }
      }

      // CURSOR Menu
      if (menu === 'CURSOR') {
        if (key === 1) {
          const types: Array<'Off' | 'Voltage' | 'Time' | 'Track'> = ['Off', 'Voltage', 'Time', 'Track'];
          const nextIdx = (types.indexOf(prev.cursor.type) + 1) % types.length;
          return { ...prev, cursor: { ...prev.cursor, type: types[nextIdx] } };
        }
        if (key === 2) {
          return {
            ...prev,
            cursor: { ...prev.cursor, source: prev.cursor.source === 'CH1' ? 'CH2' : 'CH1' },
          };
        }
        if (key === 3) {
          return {
            ...prev,
            cursor: {
              ...prev.cursor,
              activeCursor: prev.cursor.activeCursor === 'a' ? 'b' : 'a',
            },
          };
        }
        if (key === 5) {
          // Center cursors
          return {
            ...prev,
            cursor: {
              ...prev.cursor,
              cursorVa: 1.0,
              cursorVb: -1.0,
              cursorTa: -200e-6,
              cursorTb: 200e-6,
            },
          };
        }
      }

      // ACQUIRE Menu
      if (menu === 'ACQUIRE') {
        if (key === 1) {
          const modes: Array<'Sampling' | 'Peak' | 'Average'> = ['Sampling', 'Peak', 'Average'];
          const nextIdx = (modes.indexOf(prev.acquire.mode) + 1) % modes.length;
          return { ...prev, acquire: { ...prev.acquire, mode: modes[nextIdx] } };
        }
        if (key === 2) {
          const avgs: Array<2 | 4 | 8 | 16 | 32 | 64 | 128 | 256> = [2, 4, 8, 16, 32, 64, 128, 256];
          const nextIdx = (avgs.indexOf(prev.acquire.averages) + 1) % avgs.length;
          return { ...prev, acquire: { ...prev.acquire, averages: avgs[nextIdx] } };
        }
        if (key === 3) {
          return {
            ...prev,
            acquire: {
              ...prev.acquire,
              sampling: prev.acquire.sampling === 'Realtime' ? 'Equivalence' : 'Realtime',
            },
          };
        }
        if (key === 4) {
          return { ...prev, acquire: { ...prev.acquire, fastAcq: !prev.acquire.fastAcq } };
        }
      }

      // DISPLAY Menu
      if (menu === 'DISPLAY') {
        if (key === 1) {
          return {
            ...prev,
            display: {
              ...prev.display,
              type: prev.display.type === 'Vector' ? 'Dots' : 'Vector',
            },
          };
        }
        if (key === 2) {
          return {
            ...prev,
            display: {
              ...prev.display,
              format: prev.display.format === 'YT' ? 'XY' : 'YT',
            },
          };
        }
        if (key === 3) {
          const persists: Array<'Off' | '1s' | '2s' | '5s' | 'Infinite'> = ['Off', '1s', '2s', '5s', 'Infinite'];
          const nextIdx = (persists.indexOf(prev.display.persist) + 1) % persists.length;
          return {
            ...prev,
            display: { ...prev.display, persist: persists[nextIdx] },
          };
        }
      }

      // HORI Menu
      if (menu === 'HORI') {
        if (key === 1 || key === 2) {
          return {
            ...prev,
            horiZoomMode: prev.horiZoomMode === 'Main' ? 'Window' : 'Main',
          };
        }
        if (key === 4) {
          return { ...prev, horiPos: 0 };
        }
      }

      // TRIGGER Menu
      if (menu === 'TRIGGER') {
        if (key === 1) {
          const types: Array<'Edge' | 'Pulse' | 'Video' | 'Alter'> = ['Edge', 'Pulse', 'Video', 'Alter'];
          const nextIdx = (types.indexOf(prev.trigger.type) + 1) % types.length;
          return { ...prev, trigger: { ...prev.trigger, type: types[nextIdx] } };
        }
        if (key === 2) {
          const sources: Array<'CH1' | 'CH2' | 'EXT' | 'AC Line' | 'Alter'> = [
            'CH1',
            'CH2',
            'EXT',
            'AC Line',
            'Alter',
          ];
          const nextIdx = (sources.indexOf(prev.trigger.source) + 1) % sources.length;
          return { ...prev, trigger: { ...prev.trigger, source: sources[nextIdx] } };
        }
        if (key === 3) {
          const slopes: Array<'Rise' | 'Fall' | 'Rise/Fall'> = ['Rise', 'Fall', 'Rise/Fall'];
          const nextIdx = (slopes.indexOf(prev.trigger.slope) + 1) % slopes.length;
          return { ...prev, trigger: { ...prev.trigger, slope: slopes[nextIdx] } };
        }
        if (key === 4) {
          const modes: Array<'AUTO' | 'Normal' | 'Single'> = ['AUTO', 'Normal', 'Single'];
          const nextIdx = (modes.indexOf(prev.trigger.mode) + 1) % modes.length;
          return { ...prev, trigger: { ...prev.trigger, mode: modes[nextIdx] } };
        }
        if (key === 5) {
          const couplings: Array<'AC' | 'DC' | 'HF Reject' | 'LF Reject'> = [
            'AC',
            'DC',
            'HF Reject',
            'LF Reject',
          ];
          const nextIdx = (couplings.indexOf(prev.trigger.coupling) + 1) % couplings.length;
          return { ...prev, trigger: { ...prev.trigger, coupling: couplings[nextIdx] } };
        }
      }

      // UTILITY Menu
      if (menu === 'UTILITY') {
        if (prev.menuPage === 1) {
          if (key === 1) {
            // Trigger Self-Adjustment Calibration
            return {
              ...prev,
              selfCalibrating: true,
              selfCalProgress: 0,
            };
          }
          if (key === 4) {
            const langs: Array<'EN' | 'CN' | 'AR'> = ['EN', 'CN', 'AR'];
            const nextIdx = (langs.indexOf(prev.language) + 1) % langs.length;
            return { ...prev, language: langs[nextIdx] };
          }
          if (key === 5) {
            return { ...prev, menuPage: 2 };
          }
        } else if (prev.menuPage === 2) {
          if (key === 1) {
            // Factory Reset
            return {
              ...prev,
              timeDiv: 500e-6,
              horiPos: 0,
              ch1: { ...prev.ch1, enabled: true, voltsDiv: 1.0, position: 0 },
              ch2: { ...prev.ch2, enabled: false, voltsDiv: 1.0, position: -1.5 },
              math: { ...prev.math, enabled: false, position: 0 },
            };
          }
          if (key === 2) {
            const skins: Array<'Classic Navy' | 'Dark Slate' | 'Retro Amber' | 'High Contrast'> = [
              'Classic Navy',
              'Dark Slate',
              'Retro Amber',
              'High Contrast',
            ];
            const nextIdx = (skins.indexOf(prev.skin) + 1) % skins.length;
            return { ...prev, skin: skins[nextIdx] };
          }
          if (key === 4) {
            return { ...prev, soundEnabled: !prev.soundEnabled };
          }
          if (key === 5) {
            return { ...prev, menuPage: 3 };
          }
        } else {
          if (key === 2) {
            return { ...prev, frequencyCounterEnabled: !prev.frequencyCounterEnabled };
          }
          if (key === 4) {
            return { ...prev, menuPage: 1 };
          }
          if (key === 5) {
            return { ...prev, menuVisible: false };
          }
        }
      }

      return prev;
    });
  }, [scopeState.soundEnabled]);

  // Screen Print function (PrtSc)
  const handlePrintScreen = useCallback(() => {
    playButtonClick(scopeState.soundEnabled);
    const canvas = document.querySelector('canvas[data-testid="oscilloscope-screen"]') as HTMLCanvasElement | null;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `UTD2025CL_Capture_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [scopeState.soundEnabled]);

  // Apply experiment presets
  const handleApplyPreset = (presetKey: string) => {
    playButtonClick(scopeState.soundEnabled);
    playRelayClick(scopeState.soundEnabled);

    if (presetKey === 'probe_comp') {
      // 1kHz 3Vpp square wave with probe compensation
      setCh1Source({
        waveform: 'probe_comp',
        frequency: 1000,
        amplitude: 3.0,
        offset: 0,
        phase: 0,
        dutyCycle: 50,
        noiseLevel: 0.08,
        probeCompTrimmer: 'correct',
        glitchEnabled: false,
      });
      setScopeState((prev) => ({
        ...prev,
        timeDiv: 500e-6,
        horiPos: 0,
        ch1: { ...prev.ch1, enabled: true, voltsDiv: 1.0, position: 0 },
        ch2: { ...prev.ch2, enabled: false },
        math: { ...prev.math, enabled: false },
        trigger: { ...prev.trigger, source: 'CH1', slope: 'Rise', level: 0 },
      }));
    } else if (presetKey === 'noisy_sine') {
      // High noise to test BW limit & Average sampling
      setCh1Source({
        waveform: 'sine',
        frequency: 5000,
        amplitude: 4.0,
        offset: 0,
        phase: 0,
        dutyCycle: 50,
        noiseLevel: 0.65, // heavy thermal noise
        probeCompTrimmer: 'correct',
        glitchEnabled: false,
      });
      setScopeState((prev) => ({
        ...prev,
        timeDiv: 100e-6,
        horiPos: 0,
        ch1: { ...prev.ch1, enabled: true, voltsDiv: 1.0, position: 0, bwLimit: false },
        acquire: { ...prev.acquire, mode: 'Average', averages: 32 },
        activeMenu: 'ACQUIRE',
      }));
    } else if (presetKey === 'lissajous') {
      // Dual sine 90 deg out of phase -> Circle
      setCh1Source({
        waveform: 'sine',
        frequency: 1000,
        amplitude: 3.0,
        offset: 0,
        phase: 0,
        dutyCycle: 50,
        noiseLevel: 0.04,
        probeCompTrimmer: 'correct',
        glitchEnabled: false,
      });
      setCh2Source({
        waveform: 'dual_quadrature',
        frequency: 1000,
        amplitude: 3.0,
        offset: 0,
        phase: 0,
        dutyCycle: 50,
        noiseLevel: 0.04,
        probeCompTrimmer: 'correct',
        glitchEnabled: false,
      });
      setScopeState((prev) => ({
        ...prev,
        ch1: { ...prev.ch1, enabled: true, voltsDiv: 1.0, position: 0 },
        ch2: { ...prev.ch2, enabled: true, voltsDiv: 1.0, position: 0 },
        display: { ...prev.display, format: 'XY' },
        activeMenu: 'DISPLAY',
      }));
    } else if (presetKey === 'math_demo') {
      // Both channels enabled with Centered Math Sum
      setCh1Source({
        waveform: 'square',
        frequency: 1000,
        amplitude: 2.0,
        offset: 0,
        phase: 0,
        dutyCycle: 50,
        noiseLevel: 0.05,
        probeCompTrimmer: 'correct',
        glitchEnabled: false,
      });
      setCh2Source({
        waveform: 'sine',
        frequency: 1000,
        amplitude: 2.0,
        offset: 0,
        phase: 0,
        dutyCycle: 50,
        noiseLevel: 0.05,
        probeCompTrimmer: 'correct',
        glitchEnabled: false,
      });
      setScopeState((prev) => ({
        ...prev,
        display: { ...prev.display, format: 'YT' },
        ch1: { ...prev.ch1, enabled: true, voltsDiv: 1.0, position: 1.5 },
        ch2: { ...prev.ch2, enabled: true, voltsDiv: 1.0, position: -1.5 },
        math: {
          ...prev.math,
          enabled: true,
          type: 'Math',
          operator: '+',
          position: 0, // centered about ground
          voltsDiv: 2.0,
        },
        activeMenu: 'MATH',
      }));
    } else if (presetKey === 'glitch_single') {
      // Pulse with occasional glitch and single trigger
      setCh1Source({
        waveform: 'pulse',
        frequency: 200,
        amplitude: 3.0,
        offset: 0,
        phase: 0,
        dutyCycle: 10,
        noiseLevel: 0.05,
        probeCompTrimmer: 'correct',
        glitchEnabled: true,
      });
      setScopeState((prev) => ({
        ...prev,
        timeDiv: 500e-6,
        ch1: { ...prev.ch1, enabled: true, voltsDiv: 1.0, position: 0 },
        trigger: {
          ...prev.trigger,
          mode: 'Single',
          level: 2.0,
          source: 'CH1',
        },
        activeMenu: 'TRIGGER',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Banner Navigation */}
      <header className="border-b border-[#1e293b] bg-[#0d1524] px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-[#c8102e] text-white px-2 py-0.5 rounded font-black text-sm tracking-tight shadow">
              UNI-T
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                UTD2025CL Digital Storage Oscilloscope Simulator
              </h1>
              <p className="text-[11px] text-gray-400">
                Modeled after laboratory model UTD 2025 CL (25MHz, 250MS/s, 8-bit ADC)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/70 rounded-lg text-xs font-semibold text-cyan-300 transition-colors flex items-center gap-1.5 shadow-xs"
              title="تصدير معمارية المحرك وكود DSP"
            >
              <span>معمارية وتصدير المحرك</span>
            </button>

            <button
              type="button"
              onClick={() => setRackExpanded((prev) => !prev)}
              className="px-3 py-1.5 bg-[#172236] hover:bg-[#1f2d47] border border-cyan-800/60 rounded-lg text-xs font-semibold text-cyan-300 transition-colors flex items-center gap-1.5"
            >
              {rackExpanded ? 'Hide Signal Testbench' : 'Show Signal Testbench'}
            </button>

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="px-3 py-1.5 bg-[#1a2538] hover:bg-[#23324d] border border-gray-700 rounded-lg text-xs font-semibold text-gray-200 transition-colors"
            >
              Help & Guide
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-5 flex flex-col space-y-5">
        {/* Signal Generator Testbench Rack */}
        {rackExpanded && (
          <SignalSourceRack
            ch1Source={ch1Source}
            ch2Source={ch2Source}
            onUpdateCh1={(partial) => setCh1Source((prev) => ({ ...prev, ...partial }))}
            onUpdateCh2={(partial) => setCh2Source((prev) => ({ ...prev, ...partial }))}
            onApplyPreset={handleApplyPreset}
            soundEnabled={scopeState.soundEnabled}
            onToggleSound={() => setScopeState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
          />
        )}

        {/* Physical Oscilloscope Instrument Panel */}
        <OscilloscopePanel
          state={scopeState}
          ch1Source={ch1Source}
          ch2Source={ch2Source}
          measurementsCh1={measurementsCh1}
          measurementsCh2={measurementsCh2}
          onUpdateState={setScopeState}
          onSoftKeyClick={handleSoftKeyClick}
          onAutoSet={handleAutoSet}
          onPrintScreen={handlePrintScreen}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenExport={() => setExportOpen(true)}
        />
      </main>

      {/* Quick Help Modal */}
      <QuickHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Standalone Engine Architecture & Export Modal */}
      <SystemExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

