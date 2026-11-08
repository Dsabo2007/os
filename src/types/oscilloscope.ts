/**
 * UNI-T UTD2025CL Digital Storage Oscilloscope Simulator
 * TypeScript Definitions
 */

export type ChannelId = 'CH1' | 'CH2';

export type CouplingMode = 'DC' | 'AC' | 'GND';

export type ProbeAttenuation = 1 | 10 | 100 | 1000;

export type VoltsDivStep = 'Coarse' | 'Fine';

export interface ChannelSettings {
  enabled: boolean;
  coupling: CouplingMode;
  bwLimit: boolean; // 20MHz limit
  voltsDivStep: VoltsDivStep;
  probe: ProbeAttenuation;
  invert: boolean;
  voltsDiv: number; // e.g. 1.0 (V/div)
  position: number; // vertical position in divisions (-4 to +4)
}

export type MathOperator = '+' | '-' | '×' | '÷';
export type FFTWindow = 'Rectangle' | 'Hanning' | 'Hamming' | 'Blackman';
export type FFTVerticalUnit = 'Vrms' | 'dBVrms';

export interface MathSettings {
  enabled: boolean;
  type: 'Math' | 'FFT';
  source1: ChannelId;
  source2: ChannelId;
  operator: MathOperator;
  voltsDiv: number;
  position: number;
  // FFT settings
  fftSource: ChannelId;
  fftWindow: FFTWindow;
  fftUnit: FFTVerticalUnit;
  fftScale: number; // dB/div or V/div
  fftPosition: number;
}

export type TriggerType = 'Edge' | 'Pulse' | 'Video' | 'Alter';
export type TriggerSource = 'CH1' | 'CH2' | 'EXT' | 'AC Line' | 'Alter';
export type TriggerSlope = 'Rise' | 'Fall' | 'Rise/Fall';
export type TriggerMode = 'AUTO' | 'Normal' | 'Single';
export type TriggerCoupling = 'AC' | 'DC' | 'HF Reject' | 'LF Reject';
export type PulseCondition = '>' | '<' | '=';
export type PulsePolarity = 'Positive' | 'Negative';

export interface TriggerSettings {
  type: TriggerType;
  source: TriggerSource;
  slope: TriggerSlope;
  mode: TriggerMode;
  coupling: TriggerCoupling;
  level: number; // in Volts
  holdoff: number; // in seconds (80ns to 1.5s)
  pulseCondition: PulseCondition;
  pulseWidth: number; // in seconds
  pulsePolarity: PulsePolarity;
  videoStandard: 'PAL' | 'NTSC';
  videoSync: 'All line' | 'Lines' | 'Even field' | 'Odd field';
}

export type AcquireMode = 'Sampling' | 'Peak' | 'Average';
export type AcquireSampling = 'Realtime' | 'Equivalence';

export interface AcquireSettings {
  mode: AcquireMode;
  averages: 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256;
  sampling: AcquireSampling;
  fastAcq: boolean;
}

export type DisplayType = 'Vector' | 'Dots';
export type DisplayFormat = 'YT' | 'XY';
export type DisplayPersist = 'Off' | '1s' | '2s' | '5s' | 'Infinite';

export interface DisplaySettings {
  type: DisplayType;
  format: DisplayFormat;
  persist: DisplayPersist;
  waveformBrightness: number; // 1% to 100%
  gridBrightness: number; // 1% to 100%
}

export type CursorType = 'Off' | 'Voltage' | 'Time' | 'Track';

export interface CursorSettings {
  type: CursorType;
  source: ChannelId;
  // Voltage cursors (in divisions or volts)
  cursorVa: number; // volts
  cursorVb: number; // volts
  // Time cursors (in seconds)
  cursorTa: number; // seconds
  cursorTb: number; // seconds
  activeCursor: 'a' | 'b';
}

export type ActiveMenu =
  | 'CH1'
  | 'CH2'
  | 'MATH'
  | 'MEASURE'
  | 'CURSOR'
  | 'ACQUIRE'
  | 'DISPLAY'
  | 'HORI'
  | 'TRIGGER'
  | 'STORAGE'
  | 'UTILITY'
  | 'NONE';

export type MeasurementParam =
  | 'Vpp'
  | 'Vmax'
  | 'Vmin'
  | 'Vamp'
  | 'Vmid'
  | 'Vtop'
  | 'Vbase'
  | 'Vrms'
  | 'Average'
  | 'Overshoot'
  | 'Preshoot'
  | 'Freq'
  | 'Period'
  | 'RiseTime'
  | 'FallTime'
  | '+Width'
  | '-Width'
  | '+Duty'
  | '-Duty'
  | 'Delay';

export interface SignalParameters {
  vpp: number;
  vmax: number;
  vmin: number;
  vamp: number;
  vmid: number;
  vtop: number;
  vbase: number;
  vrms: number;
  vavg: number;
  overshoot: number; // %
  preshoot: number; // %
  frequency: number;
  period: number;
  riseTime: number;
  fallTime: number;
  posWidth: number;
  negWidth: number;
  posDuty: number; // %
  negDuty: number; // %
  delay: number;
}

export type SignalWaveformType =
  | 'probe_comp' // 1kHz 3Vpp square wave with compensation trimmer
  | 'sine'
  | 'square'
  | 'triangle'
  | 'pulse'
  | 'noise_sensor'
  | 'am_signal'
  | 'dual_quadrature'; // 90 deg sine for Lissajous

export interface SignalGeneratorSource {
  waveform: SignalWaveformType;
  frequency: number; // Hz
  amplitude: number; // Vpp
  offset: number; // V DC
  phase: number; // radians
  dutyCycle: number; // % (for square/pulse)
  noiseLevel: number; // 0 to 1 (thermal noise & jitter)
  probeCompTrimmer: 'over' | 'correct' | 'under'; // For probe comp test
  glitchEnabled: boolean;
}

export interface OscilloscopeState {
  powerOn: boolean;
  runMode: 'RUN' | 'STOP';
  autoActive: boolean;
  timeDiv: number; // seconds per div (e.g. 500e-6 = 500us/div)
  horiPos: number; // seconds offset
  horiZoomMode: 'Main' | 'Window';
  zoomTimeDiv: number;
  zoomHoriPos: number;

  ch1: ChannelSettings;
  ch2: ChannelSettings;
  math: MathSettings;
  trigger: TriggerSettings;
  acquire: AcquireSettings;
  display: DisplaySettings;
  cursor: CursorSettings;

  activeMenu: ActiveMenu;
  menuPage: number; // For multi-page menus like Utility (1/3, 2/3, 3/3)
  menuVisible: boolean;

  // Selected measurements to show on the 5 right menu buttons when in MEASURE mode
  selectedMeasurements: Array<{ channel: ChannelId; param: MeasurementParam }>;
  showAllParametersModal: boolean;

  // System Utility settings
  language: 'EN' | 'CN' | 'AR';
  skin: 'Classic Navy' | 'Dark Slate' | 'Retro Amber' | 'High Contrast';
  frequencyCounterEnabled: boolean;
  soundEnabled: boolean;
  selfCalibrating: boolean;
  selfCalProgress: number; // 0 to 100
  usbPlugged: boolean;
}
