/**
 * Signal Generator & Lab Testbench Control Rack
 * Provides comprehensive signal generation, noise injector,
 * probe compensation trimmer, and one-click laboratory experiment presets.
 */

import React from 'react';
import { SignalGeneratorSource } from '../types/oscilloscope';
import { Activity, Sliders, Zap, ShieldAlert, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface SignalSourceRackProps {
  ch1Source: SignalGeneratorSource;
  ch2Source: SignalGeneratorSource;
  onUpdateCh1: (partial: Partial<SignalGeneratorSource>) => void;
  onUpdateCh2: (partial: Partial<SignalGeneratorSource>) => void;
  onApplyPreset: (presetKey: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const SignalSourceRack: React.FC<SignalSourceRackProps> = ({
  ch1Source,
  ch2Source,
  onUpdateCh1,
  onUpdateCh2,
  onApplyPreset,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <div className="bg-[#121926] border border-[#1e293b] rounded-xl p-4 shadow-xl text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Laboratory Signal Generator & Testbench
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                Continuous Physics Engine
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Inject realistic analog waveforms, thermal noise, jitter, and probe compensation trimmer physics.
            </p>
          </div>
        </div>

        {/* Global Controls & Mute */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleSound}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              soundEnabled
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundEnabled ? 'Relay Audio ON' : 'Audio Muted'}
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="mb-4">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
          Laboratory Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onApplyPreset('probe_comp')}
            className="px-2.5 py-1.5 bg-[#1a2333] hover:bg-cyan-950/60 border border-cyan-800/60 hover:border-cyan-500 rounded text-xs font-medium text-cyan-300 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            1. Probe Compensation (1kHz 3Vpp)
          </button>

          <button
            type="button"
            onClick={() => onApplyPreset('noisy_sine')}
            className="px-2.5 py-1.5 bg-[#1a2333] hover:bg-amber-950/60 border border-amber-800/60 hover:border-amber-500 rounded text-xs font-medium text-amber-300 transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            2. High Noise (Test BW Limit & Average Mode)
          </button>

          <button
            type="button"
            onClick={() => onApplyPreset('lissajous')}
            className="px-2.5 py-1.5 bg-[#1a2333] hover:bg-emerald-950/60 border border-emerald-800/60 hover:border-emerald-500 rounded text-xs font-medium text-emerald-300 transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            3. XY Lissajous 90° Phase
          </button>

          <button
            type="button"
            onClick={() => onApplyPreset('math_demo')}
            className="px-2.5 py-1.5 bg-[#1a2333] hover:bg-rose-950/60 border border-rose-800/60 hover:border-rose-500 rounded text-xs font-medium text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            4. Dual Waves (CH1 + CH2 Centered Math)
          </button>

          <button
            type="button"
            onClick={() => onApplyPreset('glitch_single')}
            className="px-2.5 py-1.5 bg-[#1a2333] hover:bg-purple-950/60 border border-purple-800/60 hover:border-purple-500 rounded text-xs font-medium text-purple-300 transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            5. Pulse with Glitch (Single Shot Trigger)
          </button>
        </div>
      </div>

      {/* Dual Channel Signal Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CH1 Signal Generator */}
        <div className="bg-[#172030] p-3.5 rounded-lg border border-cyan-900/60 shadow-inner">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-950 pb-2">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
              CH1 Input Signal Generator
            </span>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
              BNC Input X
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                Waveform Type:
              </label>
              <select
                value={ch1Source.waveform}
                onChange={(e) => onUpdateCh1({ waveform: e.target.value as any })}
                className="w-full bg-[#0d1420] border border-cyan-800/60 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="probe_comp">Probe Comp 1kHz 3Vpp (Calibration Terminal)</option>
                <option value="sine">Sinusoidal AC Wave</option>
                <option value="square">Square Wave / Clock</option>
                <option value="triangle">Triangle Wave</option>
                <option value="pulse">Narrow Pulse (Glitch test)</option>
                <option value="noise_sensor">Sensor + 60Hz Mains Ripple</option>
                <option value="am_signal">AM Modulated Signal (10kHz)</option>
                <option value="dual_quadrature">Sine 90° Phase (Lissajous)</option>
              </select>
            </div>

            {/* Probe Compensation Interactive Trimmer */}
            {ch1Source.waveform === 'probe_comp' && (
              <div className="bg-[#0f1724] p-2.5 rounded border border-cyan-700/50">
                <span className="text-[11px] font-bold text-cyan-300 block mb-1">
                  Probe Compensation Trimmer (Screwdriver adjustment):
                </span>
                <p className="text-[10px] text-gray-400 mb-2">
                  Reference: Manual Page 13 Fig 1-5. Adjust RC capacitor trimmer on probe:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateCh1({ probeCompTrimmer: 'under' })}
                    className={`py-1 text-xs rounded font-medium border ${
                      ch1Source.probeCompTrimmer === 'under'
                        ? 'bg-amber-900/60 border-amber-400 text-amber-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    Under-Comp (Rounded)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateCh1({ probeCompTrimmer: 'correct' })}
                    className={`py-1 text-xs rounded font-medium border ${
                      ch1Source.probeCompTrimmer === 'correct'
                        ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    Correct (Flat 3Vpp)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateCh1({ probeCompTrimmer: 'over' })}
                    className={`py-1 text-xs rounded font-medium border ${
                      ch1Source.probeCompTrimmer === 'over'
                        ? 'bg-rose-900/60 border-rose-400 text-rose-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    Over-Comp (Overshoot)
                  </button>
                </div>
              </div>
            )}

            {/* Frequency & Amplitude */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[11px] font-medium text-gray-400 mb-1">
                  <span>Frequency</span>
                  <span className="text-cyan-300 font-mono">
                    {ch1Source.frequency >= 1e6
                      ? `${(ch1Source.frequency / 1e6).toFixed(2)} MHz`
                      : ch1Source.frequency >= 1e3
                      ? `${(ch1Source.frequency / 1e3).toFixed(2)} kHz`
                      : `${ch1Source.frequency.toFixed(0)} Hz`}
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100000"
                  step="50"
                  value={ch1Source.frequency}
                  onChange={(e) => onUpdateCh1({ frequency: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-gray-400 mb-1">
                  <span>Amplitude (Vpp)</span>
                  <span className="text-cyan-300 font-mono">{ch1Source.amplitude.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={ch1Source.amplitude}
                  onChange={(e) => onUpdateCh1({ amplitude: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Realistic Noise Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-medium text-gray-400 mb-1">
                <span>Thermal Noise & Jitter</span>
                <span className="text-cyan-300 font-mono">{(ch1Source.noiseLevel * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={ch1Source.noiseLevel}
                onChange={(e) => onUpdateCh1({ noiseLevel: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Turn on BW Limit (20MHz) or Average Acquisition (N=32) on the scope to clean up noise.
              </span>
            </div>
          </div>
        </div>

        {/* CH2 Signal Generator */}
        <div className="bg-[#172030] p-3.5 rounded-lg border border-amber-900/60 shadow-inner">
          <div className="flex items-center justify-between mb-3 border-b border-amber-950 pb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#ffd600]" />
              CH2 Input Signal Generator
            </span>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
              BNC Input Y
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                Waveform Type:
              </label>
              <select
                value={ch2Source.waveform}
                onChange={(e) => onUpdateCh2({ waveform: e.target.value as any })}
                className="w-full bg-[#0d1420] border border-amber-800/60 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="sine">Sinusoidal AC Wave</option>
                <option value="dual_quadrature">Cosine 90° Phase (XY Lissajous)</option>
                <option value="square">Square Wave / Clock</option>
                <option value="triangle">Triangle Wave</option>
                <option value="probe_comp">Probe Comp 1kHz 3Vpp</option>
                <option value="am_signal">AM Modulated Signal</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[11px] font-medium text-gray-400 mb-1">
                  <span>Frequency</span>
                  <span className="text-amber-300 font-mono">
                    {ch2Source.frequency >= 1e6
                      ? `${(ch2Source.frequency / 1e6).toFixed(2)} MHz`
                      : ch2Source.frequency >= 1e3
                      ? `${(ch2Source.frequency / 1e3).toFixed(2)} kHz`
                      : `${ch2Source.frequency.toFixed(0)} Hz`}
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100000"
                  step="50"
                  value={ch2Source.frequency}
                  onChange={(e) => onUpdateCh2({ frequency: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-gray-400 mb-1">
                  <span>Amplitude (Vpp)</span>
                  <span className="text-amber-300 font-mono">{ch2Source.amplitude.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={ch2Source.amplitude}
                  onChange={(e) => onUpdateCh2({ amplitude: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-gray-400 mb-1">
                <span>Phase Shift</span>
                <span className="text-amber-300 font-mono">{((ch2Source.phase * 180) / Math.PI).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.PI * 2}
                step="0.1"
                value={ch2Source.phase}
                onChange={(e) => onUpdateCh2({ phase: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
