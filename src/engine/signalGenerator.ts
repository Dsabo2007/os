/**
 * Signal Generator & Physical Analog Front-End Modeling
 * Implements realistic physical waveform synthesis with thermal noise,
 * jitter, probe compensation RC network dynamics, and ADC quantization.
 */

import { SignalGeneratorSource } from '../types/oscilloscope';

/**
 * Standard continuous pseudo-random Gaussian noise generator (Box-Muller)
 */
function gaussianRandom(mean = 0, stdev = 1): number {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

/**
 * Evaluate the raw analog signal voltage at time t
 */
export function sampleRawSignal(source: SignalGeneratorSource, t: number): number {
  const { waveform, frequency, amplitude, offset, phase, dutyCycle, probeCompTrimmer } = source;
  const omega = 2 * Math.PI * frequency;
  const period = 1 / Math.max(frequency, 0.001);
  const cycleTime = ((t + phase / omega) % period + period) % period;
  const cycleNorm = cycleTime / period; // 0 to 1

  let baseVoltage = 0;

  switch (waveform) {
    case 'probe_comp': {
      // 1kHz 3Vpp square wave with probe compensation RC trimmer modeling
      // Reference: UTD2000 Manual Section 1.3 Probe Compensation (Page 13)
      const isHigh = cycleNorm < 0.5;
      const targetV = isHigh ? 1.5 : -1.5;
      const tInHalfCycle = cycleTime % (period / 2);
      const tau = 0.00004; // 40 microseconds RC constant

      if (probeCompTrimmer === 'correct') {
        // Flat, crisp square wave with slight realistic 10ns rise
        baseVoltage = targetV;
      } else if (probeCompTrimmer === 'over') {
        // Over-compensated: huge leading overshoot spike with damped ringing (L-C-R oscillation)
        const direction = isHigh ? 1 : -1;
        const decay = Math.exp(-tInHalfCycle / tau);
        const ringing = Math.cos(2 * Math.PI * 50000 * tInHalfCycle); // 50kHz ringing
        const overshoot = direction * 0.9 * decay * (1 + 0.3 * ringing);
        baseVoltage = targetV + overshoot;
      } else {
        // Under-compensated: slow exponential rounding (LPF integrator response)
        const direction = isHigh ? 1 : -1;
        const rounding = -direction * 1.1 * Math.exp(-tInHalfCycle / (tau * 1.5));
        baseVoltage = targetV + rounding;
      }
      break;
    }

    case 'sine': {
      baseVoltage = (amplitude / 2) * Math.sin(omega * t + phase);
      break;
    }

    case 'square': {
      const duty = (dutyCycle ?? 50) / 100;
      baseVoltage = cycleNorm < duty ? amplitude / 2 : -amplitude / 2;
      break;
    }

    case 'triangle': {
      // Symmetrical triangle wave
      if (cycleNorm < 0.5) {
        baseVoltage = -amplitude / 2 + cycleNorm * 2 * amplitude;
      } else {
        baseVoltage = amplitude / 2 - (cycleNorm - 0.5) * 2 * amplitude;
      }
      break;
    }

    case 'pulse': {
      // Narrow 10% pulse with glitch potential
      const duty = 0.1;
      baseVoltage = cycleNorm < duty ? amplitude / 2 : -amplitude / 2;
      if (source.glitchEnabled) {
        // Add occasional glitch spike every 7 cycles
        const glitchCycle = Math.floor((t * frequency) / 7);
        if (glitchCycle % 2 === 0 && cycleNorm > 0.45 && cycleNorm < 0.47) {
          baseVoltage += amplitude * 0.95;
        }
      }
      break;
    }

    case 'noise_sensor': {
      // Sensor signal: slow 100Hz sine + 60Hz mains ripple + harmonics
      baseVoltage =
        (amplitude * 0.4) * Math.sin(2 * Math.PI * 100 * t) +
        (amplitude * 0.15) * Math.sin(2 * Math.PI * 300 * t + 0.4) +
        (amplitude * 0.08) * Math.sin(2 * Math.PI * 60 * t); // 60Hz mains pick up
      break;
    }

    case 'am_signal': {
      // Amplitude Modulated Signal: 10kHz Carrier, 1kHz Modulator
      const carrier = Math.sin(2 * Math.PI * frequency * t);
      const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * (frequency * 0.1) * t);
      baseVoltage = (amplitude / 2) * carrier * mod;
      break;
    }

    case 'dual_quadrature': {
      // Pure sine with 90 degree shift for Lissajous
      baseVoltage = (amplitude / 2) * Math.cos(omega * t + phase);
      break;
    }

    default:
      baseVoltage = 0;
  }

  return baseVoltage + offset;
}

/**
 * Generate a full waveform buffer for the screen display
 * Applies thermal noise, bandwidth filtering, and 8-bit ADC quantization
 */
export function generateChannelSamples(
  source: SignalGeneratorSource,
  timeRangeStart: number,
  timeRangeEnd: number,
  numSamples: number,
  options: {
    coupling: 'DC' | 'AC' | 'GND';
    bwLimit: boolean;
    voltsDiv: number;
    invert: boolean;
    averageCount?: number;
    peakDetect?: boolean;
  }
): Float32Array {
  const result = new Float32Array(numSamples);
  if (options.coupling === 'GND') {
    // Channel connected to ground: flat line at 0V with minute thermal floor (~1mV)
    for (let i = 0; i < numSamples; i++) {
      result[i] = gaussianRandom(0, 0.001);
    }
    return result;
  }

  const dt = (timeRangeEnd - timeRangeStart) / (numSamples - 1);
  const noiseScale = source.noiseLevel * 0.05 * Math.max(source.amplitude, 0.2);

  // Bandwidth limit filter simulation (20MHz cutoff filter)
  // When ON, smooths out fast high frequency fluctuations
  const alpha = options.bwLimit ? 0.35 : 0.95;
  let filteredVoltage = 0;

  // Calculate DC offset for AC coupling blocking
  const dcBlockOffset = options.coupling === 'AC' ? source.offset : 0;

  for (let i = 0; i < numSamples; i++) {
    const t = timeRangeStart + i * dt;
    let v = sampleRawSignal(source, t) - dcBlockOffset;

    // Add realistic analog noise
    // 1. High frequency thermal noise
    const thermal = gaussianRandom(0, noiseScale);
    // 2. Subtle periodic line ripple pickup
    const linePickup = (source.noiseLevel > 0.05 ? 0.008 * Math.sin(2 * Math.PI * 50 * t) : 0);

    const noisyV = v + thermal + linePickup;

    // Apply bandwidth filter (1-pole IIR smoothing)
    filteredVoltage = filteredVoltage + alpha * (noisyV - filteredVoltage);

    let finalV = filteredVoltage;

    // Invert signal if channel invert is ON
    if (options.invert) {
      finalV = -finalV;
    }

    // 8-bit ADC Quantization simulation (UTD2025CL has 8-bit A/D converter)
    // 8 divisions * voltsDiv = total vertical range; 256 quantization levels
    const fullScale = options.voltsDiv * 8;
    const lsb = fullScale / 256;
    finalV = Math.round(finalV / lsb) * lsb;

    result[i] = finalV;
  }

  return result;
}
