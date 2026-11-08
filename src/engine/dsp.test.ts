import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMathWaveform, findTriggerIndex, calculateMeasurements, computeFFT } from './dsp';

test('Math waveform (+ operator) sums channels accurately and preserves baseline', () => {
  const ch1 = new Float32Array([1.0, 2.0, -1.0, 0.0]);
  const ch2 = new Float32Array([0.5, -0.5, 1.5, 0.0]);
  const result = computeMathWaveform(ch1, ch2, '+');

  assert.equal(result.length, 4);
  assert.equal(result[0], 1.5);
  assert.equal(result[1], 1.5);
  assert.equal(result[2], 0.5);
  assert.equal(result[3], 0.0);
});

test('Math waveform (- operator) subtracts CH2 from CH1', () => {
  const ch1 = new Float32Array([2.0, 1.0]);
  const ch2 = new Float32Array([0.5, 1.5]);
  const result = computeMathWaveform(ch1, ch2, '-');

  assert.equal(result[0], 1.5);
  assert.equal(result[1], -0.5);
});

test('Trigger edge detection locates rising threshold crossing', () => {
  const samples = new Float32Array([
    -1.0, -0.5, -0.1, 0.2, 0.8, 1.0, 0.5, 0.0, -0.5, -1.0,
    -1.0, -0.5, -0.1, 0.2, 0.8, 1.0, 0.5, 0.0, -0.5, -1.0,
    -1.0, -0.5, -0.1, 0.2, 0.8, 1.0, 0.5, 0.0, -0.5, -1.0
  ]);
  const idx = findTriggerIndex(samples, 0.0, 'Rise');
  assert.equal(idx, 3);
  assert.ok(samples[idx - 1] <= 0.0 && samples[idx] > 0.0);
});

test('Calculate measurements accurately extracts Vpp, Vmax, Vmin, Vrms, and frequency for a pure sine wave', () => {
  const N = 1000;
  const dt = 1e-5; // 10 microseconds step
  const freq = 1000; // 1kHz sine wave
  const amplitude = 2.0; // 2Vpp (-1V to +1V)
  const samples = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    samples[i] = (amplitude / 2) * Math.sin(2 * Math.PI * freq * (i * dt));
  }

  const meas = calculateMeasurements(samples, dt);
  assert.ok(Math.abs(meas.vpp - 2.0) < 0.05, `Vpp ${meas.vpp} should be close to 2.0`);
  assert.ok(Math.abs(meas.vmax - 1.0) < 0.05, `Vmax ${meas.vmax} should be close to 1.0`);
  assert.ok(Math.abs(meas.vmin - (-1.0)) < 0.05, `Vmin ${meas.vmin} should be close to -1.0`);
  assert.ok(Math.abs(meas.vrms - 1.0 / Math.SQRT2) < 0.05, `Vrms ${meas.vrms} should be close to 0.707`);
  assert.ok(Math.abs(meas.frequency - 1000) < 30, `Frequency ${meas.frequency} should be close to 1000Hz`);
});

test('computeFFT produces expected frequency peak for 1kHz sine wave', () => {
  const N = 1024;
  const sampleRate = 50000; // 50kHz sample rate
  const dt = 1 / sampleRate;
  const freq = 1000; // 1kHz
  const samples = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    samples[i] = Math.sin(2 * Math.PI * freq * i * dt);
  }

  const { frequencies, magnitudes } = computeFFT(samples, 'Hanning', 'Vrms', sampleRate);
  
  let peakMag = -Infinity;
  let peakFreq = 0;
  for (let i = 0; i < frequencies.length; i++) {
    if (magnitudes[i] > peakMag) {
      peakMag = magnitudes[i];
      peakFreq = frequencies[i];
    }
  }

  assert.ok(Math.abs(peakFreq - 1000) < 100, `FFT peak should be near 1000Hz, found ${peakFreq}Hz`);
});
