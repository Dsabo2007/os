/**
 * Standalone Oscilloscope Core Engine (UNI-T UTD2025CL Architecture)
 * Modular, decoupled DSP and state machine designed for easy reuse in other projects.
 *
 * Capabilities:
 * - 2-Channel Analog Front-End Simulator
 * - Hardware 1-2-5 Volts/Div and Timebase Steps
 * - Real-time Edge, Pulse, and Alternate Trigger Synchronization
 * - Centered Math (+, -, ×, ÷) and 1024-point FFT Spectrum Analysis
 * - 28 Automatic Waveform Measurements (Vpp, Vmax, Vmin, Vrms, Frequency, Period, Duty, etc.)
 * - Auto-Setup Algorithm
 * - Interactive Cursors (Voltage, Time, Track)
 */

import {
  ChannelId,
  OscilloscopeState,
  SignalGeneratorSource,
  SignalParameters,
} from '../types/oscilloscope';
import { calculateMeasurements, computeFFT, computeMathWaveform, findTriggerIndex } from './dsp';
import { generateChannelSamples } from './signalGenerator';

export const STANDARD_VOLTS_DIV = [
  0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0,
];

export const STANDARD_TIMEBASE = [
  5e-9, 1e-8, 2e-8, 5e-8, 1e-7, 2e-7, 5e-7,
  1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4,
  1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 1e-1, 2e-1, 5e-1,
  1.0, 2.0, 5.0, 10.0, 20.0, 50.0,
];

export class OscilloscopeCoreEngine {
  private state: OscilloscopeState;

  constructor(initialState?: Partial<OscilloscopeState>) {
    this.state = {
      powerOn: true,
      runMode: 'RUN',
      autoActive: false,
      timeDiv: 500e-6, // 500us/div default (optimal for 1kHz calibration signal)
      horiPos: 0.0, // 0.00us center
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
        voltsDiv: 1.0,
        position: 0.0,
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
        position: 0.0, // centered at ground reference
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
      ...initialState,
    };
  }

  public getState(): OscilloscopeState {
    return { ...this.state };
  }

  public setState(updater: (prev: OscilloscopeState) => OscilloscopeState): OscilloscopeState {
    this.state = updater(this.state);
    return this.getState();
  }

  /**
   * Autoset: Automatically configures optimal Timebase, Volts/div, and Trigger level
   * for stable observation (exactly like real UTD2025CL AUTO key)
   */
  public performAutoset(ch1Freq: number, ch1Amp: number, ch2Freq = 1000, ch2Amp = 2.0): void {
    const activeFreq = this.state.ch1.enabled ? ch1Freq : ch2Freq;
    const activeAmp = this.state.ch1.enabled ? ch1Amp : ch2Amp;

    // Target ~2.5 full periods across 12 divisions
    const period = 1 / Math.max(activeFreq, 10);
    const targetTimeDiv = (period * 2.5) / 12;

    let bestTimeDiv = STANDARD_TIMEBASE[0];
    let minTimeDiff = Infinity;
    for (const t of STANDARD_TIMEBASE) {
      const diff = Math.abs(t - targetTimeDiv);
      if (diff < minTimeDiff) {
        minTimeDiff = diff;
        bestTimeDiv = t;
      }
    }

    // Target amplitude spanning ~4 divisions (out of 8)
    const targetVDiv = activeAmp / 4;
    let bestVDiv = STANDARD_VOLTS_DIV[0];
    let minVDiff = Infinity;
    for (const v of STANDARD_VOLTS_DIV) {
      const diff = Math.abs(v - targetVDiv);
      if (diff < minVDiff) {
        minVDiff = diff;
        bestVDiv = v;
      }
    }

    this.state = {
      ...this.state,
      timeDiv: bestTimeDiv,
      horiPos: 0.0,
      ch1: {
        ...this.state.ch1,
        voltsDiv: bestVDiv,
        position: 0.0,
      },
      trigger: {
        ...this.state.trigger,
        level: 0.0,
        mode: 'AUTO',
      },
    };
  }

  /**
   * Generate screen buffers and compute all 28 measurements
   */
  public acquireWaveforms(
    ch1Source: SignalGeneratorSource,
    ch2Source: SignalGeneratorSource,
    screenWidthPx = 440
  ): {
    ch1Data: Float32Array;
    ch2Data: Float32Array;
    mathData: Float32Array | null;
    fftResult: { frequencies: Float32Array; magnitudes: Float32Array } | null;
    measurementsCh1: SignalParameters;
    measurementsCh2: SignalParameters;
    triggerLocked: boolean;
  } {
    const totalTime = this.state.timeDiv * 12;
    const bufTimeStart = this.state.horiPos - totalTime * 1.5;
    const bufTimeEnd = this.state.horiPos + totalTime * 1.5;
    const bufCount = Math.floor(screenWidthPx * 6);

    const ch1Buf = generateChannelSamples(ch1Source, bufTimeStart, bufTimeEnd, bufCount, {
      coupling: this.state.ch1.coupling,
      bwLimit: this.state.ch1.bwLimit,
      voltsDiv: this.state.ch1.voltsDiv,
      invert: this.state.ch1.invert,
    });

    const ch2Buf = generateChannelSamples(ch2Source, bufTimeStart, bufTimeEnd, bufCount, {
      coupling: this.state.ch2.coupling,
      bwLimit: this.state.ch2.bwLimit,
      voltsDiv: this.state.ch2.voltsDiv,
      invert: this.state.ch2.invert,
    });

    // Find trigger point in middle third
    const searchStart = Math.floor(bufCount / 3);
    const searchEnd = Math.floor((bufCount * 2) / 3);
    const trigData = this.state.trigger.source === 'CH2' ? ch2Buf : ch1Buf;

    let trigIdx = -1;
    if (this.state.runMode === 'RUN') {
      for (let i = searchStart; i < searchEnd; i++) {
        const prev = trigData[i - 1];
        const curr = trigData[i];
        if (this.state.trigger.slope === 'Rise' || this.state.trigger.slope === 'Rise/Fall') {
          if (prev <= this.state.trigger.level && curr > this.state.trigger.level) {
            trigIdx = i;
            break;
          }
        }
        if (this.state.trigger.slope === 'Fall' || this.state.trigger.slope === 'Rise/Fall') {
          if (prev >= this.state.trigger.level && curr < this.state.trigger.level) {
            trigIdx = i;
            break;
          }
        }
      }
    }

    const triggerLocked = trigIdx !== -1;
    if (!triggerLocked) {
      trigIdx = Math.floor(bufCount / 2);
    }

    const samplesPerPixel = (bufCount / 3) / screenWidthPx;
    const startOffset = trigIdx - (screenWidthPx / 2) * samplesPerPixel;

    const ch1Data = new Float32Array(screenWidthPx);
    const ch2Data = new Float32Array(screenWidthPx);

    for (let i = 0; i < screenWidthPx; i++) {
      const idx = Math.floor(startOffset + i * samplesPerPixel);
      const safeIdx = Math.max(0, Math.min(bufCount - 1, idx));
      ch1Data[i] = ch1Buf[safeIdx];
      ch2Data[i] = ch2Buf[safeIdx];
    }

    // Measurements
    const dt = totalTime / (screenWidthPx - 1);
    const measurementsCh1 = calculateMeasurements(ch1Data, dt);
    const measurementsCh2 = calculateMeasurements(ch2Data, dt);

    // Math waveform
    let mathData: Float32Array | null = null;
    let fftResult: { frequencies: Float32Array; magnitudes: Float32Array } | null = null;

    if (this.state.math.enabled) {
      if (this.state.math.type === 'Math') {
        mathData = computeMathWaveform(ch1Data, ch2Data, this.state.math.operator);
      } else {
        const target = this.state.math.fftSource === 'CH2' ? ch2Data : ch1Data;
        const sampleRate = screenWidthPx / totalTime;
        fftResult = computeFFT(
          target,
          this.state.math.fftWindow,
          this.state.math.fftUnit,
          sampleRate
        );
      }
    }

    return {
      ch1Data,
      ch2Data,
      mathData,
      fftResult,
      measurementsCh1,
      measurementsCh2,
      triggerLocked,
    };
  }
}
