import test from 'node:test';
import assert from 'node:assert/strict';
import { OscilloscopeCoreEngine } from './OscilloscopeCore';
import { SignalGeneratorSource } from '../types/oscilloscope';

test('OscilloscopeCoreEngine initializes with 500us/div and centered position', () => {
  const engine = new OscilloscopeCoreEngine();
  const state = engine.getState();
  assert.equal(state.timeDiv, 500e-6);
  assert.equal(state.horiPos, 0.0);
  assert.equal(state.ch1.position, 0.0);
  assert.equal(state.ch1.voltsDiv, 1.0);
  assert.equal(state.math.position, 0.0);
});

test('OscilloscopeCoreEngine autoset optimizes timebase and vertical scale for 1kHz 3Vpp signal', () => {
  const engine = new OscilloscopeCoreEngine();
  // Simulate 1kHz 3Vpp probe comp signal
  engine.performAutoset(1000, 3.0);
  const state = engine.getState();

  // Optimal timebase for ~2.5 periods over 12 div of 1kHz (T = 1ms) is ~200us or ~500us
  assert.ok(state.timeDiv >= 1e-4 && state.timeDiv <= 1e-3);
  // Optimal volts/div for 3Vpp over ~4 div is ~0.5V to 1V
  assert.ok(state.ch1.voltsDiv >= 0.5 && state.ch1.voltsDiv <= 1.0);
  assert.equal(state.horiPos, 0.0);
  assert.equal(state.trigger.mode, 'AUTO');
});

test('OscilloscopeCoreEngine acquires clean data without flatline clamping', () => {
  const engine = new OscilloscopeCoreEngine();
  const ch1Source: SignalGeneratorSource = {
    waveform: 'probe_comp',
    frequency: 1000,
    amplitude: 3.0,
    offset: 0,
    phase: 0,
    dutyCycle: 50,
    noiseLevel: 0.05,
    probeCompTrimmer: 'correct',
    glitchEnabled: false,
  };
  const ch2Source: SignalGeneratorSource = {
    waveform: 'sine',
    frequency: 1000,
    amplitude: 2.0,
    offset: 0,
    phase: 0,
    dutyCycle: 50,
    noiseLevel: 0.05,
    probeCompTrimmer: 'correct',
    glitchEnabled: false,
  };

  const result = engine.acquireWaveforms(ch1Source, ch2Source, 400);
  assert.equal(result.ch1Data.length, 400);
  assert.equal(result.ch2Data.length, 400);
  assert.ok(result.measurementsCh1.vpp > 2.5);
  assert.ok(result.measurementsCh1.frequency > 900 && result.measurementsCh1.frequency < 1100);
});
