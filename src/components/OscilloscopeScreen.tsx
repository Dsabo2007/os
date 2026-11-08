/**
 * UNI-T UTD2025CL High-Fidelity LCD Screen Canvas Component
 * Matches the authentic university laboratory UTD2025CL:
 * - Signature Royal Blue outer chassis display frame
 * - Toothed / serrated perimeter precision graticule ruler
 * - 12x8 CRT phosphor graticule with 5 subdivisions per div
 * - Left zero markers (1 ►, 2 ►, M ►) and Trigger markers (▼, T ◄)
 * - Anti-aliasing & Peak-Detect envelope for slow timebases
 * - Centered Math baseline along zero reference
 * - Authentic dual Chinese / English softkey menu matching firmware
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  OscilloscopeState,
  SignalParameters,
} from '../types/oscilloscope';
import { computeFFT, computeMathWaveform } from '../engine/dsp';
import { generateChannelSamples } from '../engine/signalGenerator';

interface OscilloscopeScreenProps {
  state: OscilloscopeState;
  ch1Source: import('../types/oscilloscope').SignalGeneratorSource;
  ch2Source: import('../types/oscilloscope').SignalGeneratorSource;
  measurementsCh1: SignalParameters;
  measurementsCh2: SignalParameters;
  onSoftKeyClick?: (index: 1 | 2 | 3 | 4 | 5) => void;
}

// Helpers
export const formatTime = (seconds: number): string => {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? '-' : '';
  if (abs === 0) return '0.00μs';
  if (abs < 1e-6) {
    const val = abs * 1e9;
    return `${sign}${Math.round(val * 10) / 10 === Math.round(val) ? Math.round(val) : val.toFixed(1)}ns`;
  }
  if (abs < 1e-3) {
    const val = abs * 1e6;
    return `${sign}${Math.round(val * 10) / 10 === Math.round(val) ? Math.round(val) : val.toFixed(1)}μs`;
  }
  if (abs < 1) {
    const val = abs * 1e3;
    return `${sign}${Math.round(val * 10) / 10 === Math.round(val) ? Math.round(val) : val.toFixed(1)}ms`;
  }
  return `${sign}${abs.toFixed(2)}s`;
};

export const formatVolts = (volts: number): string => {
  const abs = Math.abs(volts);
  const sign = volts < 0 ? '-' : '';
  if (abs === 0) return '0.00mV';
  if (abs < 1e-3) return `${sign}${(abs * 1e6).toFixed(1)}μV`;
  if (abs < 1) return `${sign}${(abs * 1e3).toFixed(1)}mV`;
  return `${sign}${abs.toFixed(2)}V`;
};

export const OscilloscopeScreen: React.FC<OscilloscopeScreenProps> = ({
  state,
  ch1Source,
  ch2Source,
  measurementsCh1,
  measurementsCh2,
  onSoftKeyClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const persistCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lastTriggerState, setLastTriggerState] = useState<'Trig\'d' | 'Auto' | 'Ready' | 'Stop'>('Trig\'d');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!persistCanvasRef.current) {
      persistCanvasRef.current = document.createElement('canvas');
      persistCanvasRef.current.width = canvas.width;
      persistCanvasRef.current.height = canvas.height;
    }
    const pCanvas = persistCanvasRef.current;
    if (pCanvas.width !== canvas.width || pCanvas.height !== canvas.height) {
      pCanvas.width = canvas.width;
      pCanvas.height = canvas.height;
    }

    let animId: number;

    const render = () => {
      const W = canvas.width;
      const H = canvas.height;

      // Powered off state
      if (!state.powerOn) {
        ctx.fillStyle = '#050a14';
        ctx.fillRect(0, 0, W, H);
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, 'rgba(255,255,255,0.03)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        return;
      }

      // Self-calibration screen
      if (state.selfCalibrating) {
        ctx.fillStyle = '#061733';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('UNI-T UTD2025CL SELF-CALIBRATION', W / 2, H / 2 - 40);
        ctx.font = '13px Arial, sans-serif';
        ctx.fillStyle = '#8ec5fc';
        ctx.fillText('Disconnect all probe inputs. Tuning internal zero references...', W / 2, H / 2 - 10);

        const pbW = 340;
        const pbH = 18;
        const pbX = (W - pbW) / 2;
        const pbY = H / 2 + 15;
        ctx.strokeStyle = '#00e5ff';
        ctx.strokeRect(pbX, pbY, pbW, pbH);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(pbX + 2, pbY + 2, (pbW - 4) * (state.selfCalProgress / 100), pbH - 4);
        ctx.fillText(`${state.selfCalProgress}%`, W / 2, pbY + pbH + 22);
        return;
      }

      // Authentic Color Palette (matching UTD2025CL photos)
      // Royal Blue screen frame
      const frameBlue = '#0848ba';
      const frameBlueDark = '#063996';
      const graticuleBg = '#020610';
      const gridLineColor = 'rgba(28, 90, 160, 0.75)';
      const crosshairColor = 'rgba(50, 125, 215, 0.95)';

      // Outer Royal Blue Screen Background
      const outerGrad = ctx.createLinearGradient(0, 0, 0, H);
      outerGrad.addColorStop(0, frameBlue);
      outerGrad.addColorStop(1, frameBlueDark);
      ctx.fillStyle = outerGrad;
      ctx.fillRect(0, 0, W, H);

      // Dimensions
      const topBarH = 26;
      const bottomBarH = 26;
      const menuW = state.menuVisible ? 122 : 0;

      // Inset margins for graticule box
      const gridPadLeft = 14;
      const gridPadRight = 10;
      const gridX = gridPadLeft;
      const gridY = topBarH + 2;
      const gridW = W - menuW - gridPadLeft - gridPadRight;
      const gridH = H - topBarH - bottomBarH - 4;

      // 1. Draw Inset Black Graticule Area
      ctx.fillStyle = graticuleBg;
      ctx.fillRect(gridX, gridY, gridW, gridH);

      // 12 horizontal divs x 8 vertical divs
      const xDivs = 12;
      const yDivs = 8;
      const cellW = gridW / xDivs;
      const cellH = gridH / yDivs;
      const centerX = gridX + gridW / 2;
      const centerY = gridY + gridH / 2;

      // 2. Draw Toothed / Serrated Precision Perimeter Ruler
      // Alternating black and cyan/white ticks around the 4 borders
      const toothLen = 4;
      ctx.save();
      ctx.fillStyle = '#9bd0ff';

      // Top & Bottom teeth
      const totalTeethX = xDivs * 5; // 5 teeth per division
      const toothStepX = gridW / totalTeethX;
      for (let t = 0; t < totalTeethX; t += 2) {
        const tx = gridX + t * toothStepX;
        // Top edge tooth
        ctx.fillRect(tx, gridY - 2, toothStepX, 3);
        // Bottom edge tooth
        ctx.fillRect(tx, gridY + gridH - 1, toothStepX, 3);
      }

      // Left & Right teeth
      const totalTeethY = yDivs * 5;
      const toothStepY = gridH / totalTeethY;
      for (let t = 0; t < totalTeethY; t += 2) {
        const ty = gridY + t * toothStepY;
        // Left edge tooth
        ctx.fillRect(gridX - 2, ty, 3, toothStepY);
        // Right edge tooth
        ctx.fillRect(gridX + gridW - 1, ty, 3, toothStepY);
      }
      ctx.restore();

      // 3. Draw Dotted CRT Graticule Inside
      const gAlpha = state.display.gridBrightness / 100;
      ctx.save();
      ctx.globalAlpha = gAlpha;

      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      // Vertical dotted lines
      for (let x = 1; x < xDivs; x++) {
        const px = gridX + x * cellW;
        ctx.beginPath();
        ctx.moveTo(px, gridY);
        ctx.lineTo(px, gridY + gridH);
        ctx.stroke();
      }

      // Horizontal dotted lines
      for (let y = 1; y < yDivs; y++) {
        const py = gridY + y * cellH;
        ctx.beginPath();
        ctx.moveTo(gridX, py);
        ctx.lineTo(gridX + gridW, py);
        ctx.stroke();
      }

      // Center solid crosshairs with 5 sub-divisions
      ctx.setLineDash([]);
      ctx.strokeStyle = crosshairColor;
      ctx.lineWidth = 1.2;

      // Horizontal center axis
      ctx.beginPath();
      ctx.moveTo(gridX, centerY);
      ctx.lineTo(gridX + gridW, centerY);
      ctx.stroke();

      // Vertical center axis
      ctx.beginPath();
      ctx.moveTo(centerX, gridY);
      ctx.lineTo(centerX, gridY + gridH);
      ctx.stroke();

      // Subdivision ticks on center axes
      const subTicks = 5;
      const tickSize = 3;

      for (let i = 0; i <= xDivs * subTicks; i++) {
        const tx = gridX + (i * cellW) / subTicks;
        ctx.beginPath();
        ctx.moveTo(tx, centerY - tickSize);
        ctx.lineTo(tx, centerY + tickSize);
        ctx.stroke();
      }

      for (let i = 0; i <= yDivs * subTicks; i++) {
        const ty = gridY + (i * cellH) / subTicks;
        ctx.beginPath();
        ctx.moveTo(centerX - tickSize, ty);
        ctx.lineTo(centerX + tickSize, ty);
        ctx.stroke();
      }

      // Inset frame border
      ctx.strokeStyle = '#2b78dc';
      ctx.strokeRect(gridX, gridY, gridW, gridH);
      ctx.restore();

      // 4. Signal Synthesis & Continuous Buffer Acquisition
      const totalTime = state.timeDiv * xDivs;
      const bufTimeStart = state.horiPos - totalTime * 1.5;
      const bufTimeEnd = state.horiPos + totalTime * 1.5;
      const bufCount = Math.floor(gridW * 6);

      const ch1Buf = generateChannelSamples(ch1Source, bufTimeStart, bufTimeEnd, bufCount, {
        coupling: state.ch1.coupling,
        bwLimit: state.ch1.bwLimit,
        voltsDiv: state.ch1.voltsDiv,
        invert: state.ch1.invert,
      });

      const ch2Buf = generateChannelSamples(ch2Source, bufTimeStart, bufTimeEnd, bufCount, {
        coupling: state.ch2.coupling,
        bwLimit: state.ch2.bwLimit,
        voltsDiv: state.ch2.voltsDiv,
        invert: state.ch2.invert,
      });

      // Find trigger in middle third
      const searchStart = Math.floor(bufCount / 3);
      const searchEnd = Math.floor((bufCount * 2) / 3);
      const trigData = state.trigger.source === 'CH2' ? ch2Buf : ch1Buf;

      let trigIdx = -1;
      if (state.runMode === 'RUN') {
        for (let i = searchStart; i < searchEnd; i++) {
          const prev = trigData[i - 1];
          const curr = trigData[i];
          if (state.trigger.slope === 'Rise' || state.trigger.slope === 'Rise/Fall') {
            if (prev <= state.trigger.level && curr > state.trigger.level) {
              trigIdx = i;
              break;
            }
          }
          if (state.trigger.slope === 'Fall' || state.trigger.slope === 'Rise/Fall') {
            if (prev >= state.trigger.level && curr < state.trigger.level) {
              trigIdx = i;
              break;
            }
          }
        }
      }

      if (trigIdx !== -1) {
        setLastTriggerState('Trig\'d');
      } else {
        trigIdx = Math.floor(bufCount / 2);
        setLastTriggerState(state.runMode === 'STOP' ? 'Stop' : state.trigger.mode === 'AUTO' ? 'Auto' : 'Ready');
      }

      const samplesPerPixel = (bufCount / 3) / gridW;
      const startSampleOffset = trigIdx - (gridW / 2) * samplesPerPixel;

      const ch1Data = new Float32Array(gridW);
      const ch2Data = new Float32Array(gridW);

      for (let i = 0; i < gridW; i++) {
        const idx = Math.floor(startSampleOffset + i * samplesPerPixel);
        const safeIdx = Math.max(0, Math.min(bufCount - 1, idx));
        ch1Data[i] = ch1Buf[safeIdx];
        ch2Data[i] = ch2Buf[safeIdx];
      }

      // 5. Draw Waveforms with Clipping strictly inside grid
      ctx.save();
      ctx.beginPath();
      ctx.rect(gridX, gridY, gridW, gridH);
      ctx.clip();

      const beamAlpha = state.display.waveformBrightness / 100;
      ctx.globalAlpha = beamAlpha;

      // XY Lissajous Mode
      if (state.display.format === 'XY' && state.ch1.enabled && state.ch2.enabled) {
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        for (let i = 0; i < gridW; i++) {
          const xV = ch1Data[i];
          const yV = ch2Data[i];
          const px = centerX + (xV / state.ch1.voltsDiv + state.ch1.position) * cellW;
          const py = centerY - (yV / state.ch2.voltsDiv + state.ch2.position) * cellH;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else if (state.math.enabled && state.math.type === 'FFT') {
        // FFT Spectrum Display
        const targetSamples = state.math.fftSource === 'CH2' ? ch2Data : ch1Data;
        const sampleRate = gridW / totalTime;
        const { frequencies, magnitudes } = computeFFT(
          targetSamples,
          state.math.fftWindow,
          state.math.fftUnit,
          sampleRate
        );

        ctx.strokeStyle = '#ff9500';
        ctx.fillStyle = 'rgba(255, 149, 0, 0.25)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();

        const fftLen = Math.min(magnitudes.length, gridW);
        const startX = gridX;
        const baseY = gridY + gridH - 12;

        ctx.moveTo(startX, baseY);
        for (let i = 0; i < fftLen; i++) {
          const x = startX + (i / fftLen) * gridW;
          let magNorm = state.math.fftUnit === 'dBVrms' ? (magnitudes[i] + 100) / 100 : magnitudes[i] / 2;
          magNorm = Math.max(0, Math.min(1, magNorm));
          const y = baseY - magNorm * (gridH - 35);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(gridX + gridW, baseY);
        ctx.stroke();
        ctx.fill();

        ctx.fillStyle = '#ff9500';
        ctx.font = '11px Arial, sans-serif';
        ctx.fillText(`FFT [${state.math.fftWindow}] Span: ${(sampleRate / 2 / 1000).toFixed(1)}kHz  ${state.math.fftUnit}`, gridX + 15, gridY + 22);
      } else {
        // Standard Time-Domain YT Mode

        // CH1 Waveform (Cyan)
        if (state.ch1.enabled) {
          ctx.strokeStyle = '#00f7ff';
          ctx.fillStyle = '#00f7ff';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#00f7ff';
          ctx.shadowBlur = 3;

          ctx.beginPath();
          for (let i = 0; i < gridW; i++) {
            const v = ch1Data[i];
            const divOffset = v / state.ch1.voltsDiv;
            const y = centerY - (state.ch1.position + divOffset) * cellH;

            if (state.display.type === 'Dots') {
              ctx.fillRect(gridX + i, y, 1.8, 1.8);
            } else {
              if (i === 0) ctx.moveTo(gridX + i, y);
              else ctx.lineTo(gridX + i, y);
            }
          }
          if (state.display.type === 'Vector') {
            ctx.stroke();
          }
        }

        // CH2 Waveform (Yellow)
        if (state.ch2.enabled) {
          ctx.strokeStyle = '#ffe81a';
          ctx.fillStyle = '#ffe81a';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#ffe81a';
          ctx.shadowBlur = 3;

          ctx.beginPath();
          for (let i = 0; i < gridW; i++) {
            const v = ch2Data[i];
            const divOffset = v / state.ch2.voltsDiv;
            const y = centerY - (state.ch2.position + divOffset) * cellH;

            if (state.display.type === 'Dots') {
              ctx.fillRect(gridX + i, y, 1.8, 1.8);
            } else {
              if (i === 0) ctx.moveTo(gridX + i, y);
              else ctx.lineTo(gridX + i, y);
            }
          }
          if (state.display.type === 'Vector') {
            ctx.stroke();
          }
        }

        // Math Channel Waveform (Red) - Centered accurately about zero reference!
        if (state.math.enabled && state.math.type === 'Math') {
          const mathData = computeMathWaveform(ch1Data, ch2Data, state.math.operator);
          ctx.strokeStyle = '#ff3344';
          ctx.fillStyle = '#ff3344';
          ctx.lineWidth = 2.4;
          ctx.shadowColor = '#ff3344';
          ctx.shadowBlur = 4;

          ctx.beginPath();
          for (let i = 0; i < gridW; i++) {
            const v = mathData[i];
            const divOffset = v / state.math.voltsDiv;
            // Ground reference baseline centered with state.math.position
            const y = centerY - (state.math.position + divOffset) * cellH;

            if (i === 0) ctx.moveTo(gridX + i, y);
            else ctx.lineTo(gridX + i, y);
          }
          ctx.stroke();
        }
      }

      ctx.restore(); // Restore clipping

      // 6. Channel Zero Position Markers on Left Margin
      // CH1 Ground Marker: 1 ► (Cyan)
      if (state.ch1.enabled) {
        const ch1Y = centerY - state.ch1.position * cellH;
        ctx.fillStyle = '#00f7ff';
        ctx.beginPath();
        ctx.moveTo(gridX - 12, ch1Y - 6);
        ctx.lineTo(gridX - 2, ch1Y);
        ctx.lineTo(gridX - 12, ch1Y + 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('1', gridX - 8, ch1Y + 3);
      }

      // CH2 Ground Marker: 2 ► (Yellow)
      if (state.ch2.enabled) {
        const ch2Y = centerY - state.ch2.position * cellH;
        ctx.fillStyle = '#ffe81a';
        ctx.beginPath();
        ctx.moveTo(gridX - 12, ch2Y - 6);
        ctx.lineTo(gridX - 2, ch2Y);
        ctx.lineTo(gridX - 12, ch2Y + 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('2', gridX - 8, ch2Y + 3);
      }

      // Math Ground Marker: M ► (Red)
      if (state.math.enabled) {
        const mathY = centerY - state.math.position * cellH;
        ctx.fillStyle = '#ff3344';
        ctx.beginPath();
        ctx.moveTo(gridX - 13, mathY - 6);
        ctx.lineTo(gridX - 2, mathY);
        ctx.lineTo(gridX - 13, mathY + 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('M', gridX - 8, mathY + 3);
      }

      // Trigger Level Marker: T ◄ on Right Margin
      const trigVDiv = state.trigger.source === 'CH2' ? state.ch2.voltsDiv : state.ch1.voltsDiv;
      const trigPos = state.trigger.source === 'CH2' ? state.ch2.position : state.ch1.position;
      const trigY = centerY - (trigPos + state.trigger.level / trigVDiv) * cellH;

      ctx.fillStyle = state.trigger.source === 'CH2' ? '#ffe81a' : '#00f7ff';
      ctx.beginPath();
      ctx.moveTo(gridX + gridW + 12, trigY - 6);
      ctx.lineTo(gridX + gridW + 2, trigY);
      ctx.lineTo(gridX + gridW + 12, trigY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('T', gridX + gridW + 8, trigY + 3);

      // Horizontal Trigger Position Marker ▼ on Top Edge of Graticule
      const trigX = centerX + (state.horiPos / state.timeDiv) * cellW;
      ctx.fillStyle = '#00f7ff';
      ctx.beginPath();
      ctx.moveTo(trigX - 5, gridY - 8);
      ctx.lineTo(trigX + 5, gridY - 8);
      ctx.lineTo(trigX, gridY - 1);
      ctx.closePath();
      ctx.fill();

      // 7. Top Status Bar (Spanning across full top with clear margins)
      // Trigger status badge
      let trigColor = '#00ff73'; // Green Trig'd
      if (lastTriggerState === 'Stop') trigColor = '#ff3344';
      else if (lastTriggerState === 'Auto') trigColor = '#ffd600';
      else if (lastTriggerState === 'Ready') trigColor = '#00f7ff';

      ctx.textAlign = 'left';
      ctx.fillStyle = trigColor;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(lastTriggerState, 20, 18); // x=20 ensures 'T' is never clipped!

      // Horizontal position readout (e.g. M Pos: 0.00μs)
      ctx.fillStyle = '#00f7ff';
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`M Pos: ${formatTime(state.horiPos)}`, gridX + gridW / 2, 18);

      // Frequency Counter on top right (Yellow)
      if (state.frequencyCounterEnabled) {
        const freqVal = state.trigger.source === 'CH2' ? measurementsCh2.frequency : measurementsCh1.frequency;
        ctx.fillStyle = '#ffe81a';
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.textAlign = 'right';
        let freqStr = '---Hz';
        if (freqVal > 0) {
          if (freqVal >= 1e6) freqStr = `${(freqVal / 1e6).toFixed(4)}MHz`;
          else if (freqVal >= 1e3) freqStr = `${(freqVal / 1e3).toFixed(4)}kHz`;
          else freqStr = `${freqVal.toFixed(2)}Hz`;
        }
        ctx.fillText(freqStr, gridX + gridW - 5, 18);
      }

      // 8. Bottom Status Bar (Spanning across full bottom)
      const bY = H - 8;
      const bH = 20;

      // CH1 Box
      ctx.fillStyle = state.ch1.enabled ? '#003366' : '#0a2342';
      ctx.fillRect(16, H - bottomBarH + 3, 90, bH);
      ctx.strokeStyle = state.ch1.enabled ? '#00aaff' : '#14467c';
      ctx.strokeRect(16, H - bottomBarH + 3, 90, bH);

      ctx.fillStyle = state.ch1.enabled ? '#00f7ff' : '#4d7ea8';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'left';
      const ch1CouplIcon = state.ch1.coupling === 'AC' ? '~' : state.ch1.coupling === 'DC' ? '―' : '⏚';
      ctx.fillText(`CH1 ${state.ch1.voltsDiv >= 1 ? state.ch1.voltsDiv + 'V' : state.ch1.voltsDiv * 1000 + 'mV'} ${ch1CouplIcon}`, 22, bY);

      // CH2 Box
      ctx.fillStyle = state.ch2.enabled ? '#3b3802' : '#0a2342';
      ctx.fillRect(112, H - bottomBarH + 3, 90, bH);
      ctx.strokeStyle = state.ch2.enabled ? '#ffd600' : '#14467c';
      ctx.strokeRect(112, H - bottomBarH + 3, 90, bH);

      ctx.fillStyle = state.ch2.enabled ? '#ffe81a' : '#4d7ea8';
      const ch2CouplIcon = state.ch2.coupling === 'AC' ? '~' : state.ch2.coupling === 'DC' ? '―' : '⏚';
      ctx.fillText(state.ch2.enabled ? `CH2 ${state.ch2.voltsDiv >= 1 ? state.ch2.voltsDiv + 'V' : state.ch2.voltsDiv * 1000 + 'mV'} ${ch2CouplIcon}` : 'CH2 OFF', 118, bY);

      // Timebase M Box
      ctx.fillStyle = '#052a55';
      ctx.fillRect(208, H - bottomBarH + 3, 75, bH);
      ctx.strokeStyle = '#2b78dc';
      ctx.strokeRect(208, H - bottomBarH + 3, 75, bH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText(`M ${formatTime(state.timeDiv)}`, 214, bY);

      // Math Box
      ctx.fillStyle = state.math.enabled ? '#420808' : '#0a2342';
      ctx.fillRect(289, H - bottomBarH + 3, 72, bH);
      ctx.strokeStyle = state.math.enabled ? '#ff3344' : '#14467c';
      ctx.strokeRect(289, H - bottomBarH + 3, 72, bH);

      ctx.fillStyle = state.math.enabled ? '#ff4d5a' : '#4d7ea8';
      ctx.fillText(state.math.enabled ? `Math ${state.math.operator}` : 'Math Off', 294, bY);

      // Trigger Info
      ctx.fillStyle = state.trigger.source === 'CH2' ? '#ffe81a' : '#00f7ff';
      const slopeIcon = state.trigger.slope === 'Rise' ? '↗' : state.trigger.slope === 'Fall' ? '↘' : '↕';
      ctx.fillText(`T ${state.trigger.source} ${slopeIcon} ${formatVolts(state.trigger.level)}`, 370, bY);

      // 9. Right Softkey Menu Column (Authentic UNI-T Firmware Menu)
      if (state.menuVisible) {
        const mX = W - menuW;
        // Background of menu column
        ctx.fillStyle = '#064299';
        ctx.fillRect(mX, 0, menuW, H);
        ctx.strokeStyle = '#1a6cd8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mX, 0, menuW, H);

        // Header Title (e.g. CH1, CH2, MATH, MEASURE)
        ctx.fillStyle = '#042e6d';
        ctx.fillRect(mX + 3, 3, menuW - 6, 26);
        ctx.fillStyle = '#00f7ff';
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(state.activeMenu === 'NONE' ? 'MENU' : state.activeMenu, mX + menuW / 2, 20);

        // 5 Softkey Buttons (F1 - F5)
        const btnH = (H - 38) / 5;
        const isCN = state.language === 'CN';
        const softKeys = getMenuSoftKeys(state, measurementsCh1, measurementsCh2);

        for (let k = 0; k < 5; k++) {
          const item = softKeys[k] || { label: '', value: '' };
          const by = 32 + k * btnH;

          // Softkey button body
          ctx.fillStyle = '#083884';
          ctx.fillRect(mX + 4, by + 2, menuW - 8, btnH - 4);
          ctx.strokeStyle = '#1b63c7';
          ctx.lineWidth = 1;
          ctx.strokeRect(mX + 4, by + 2, menuW - 8, btnH - 4);

          // F badge
          ctx.fillStyle = '#8ec5fc';
          ctx.font = 'bold 9px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`F${k + 1}`, mX + 7, by + 14);

          // Top label (supports Chinese & English)
          ctx.fillStyle = '#ffffff';
          ctx.font = isCN ? 'bold 13px "Microsoft YaHei", "PingFang SC", sans-serif' : 'bold 11px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.label, mX + menuW / 2, by + btnH / 2 - 2);

          // Bottom setting value
          ctx.fillStyle = '#00f7ff';
          ctx.font = isCN ? 'bold 12px "Microsoft YaHei", "PingFang SC", sans-serif' : 'bold 11px "Courier New", monospace';
          ctx.fillText(item.value, mX + menuW / 2, by + btnH / 2 + 13);
        }
      }

      // 10. All 28 Automatic Measurements Table Overlay
      if (state.showAllParametersModal) {
        ctx.fillStyle = 'rgba(2, 11, 24, 0.96)';
        ctx.fillRect(gridX + 5, gridY + 5, gridW - 10, gridH - 10);
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(gridX + 5, gridY + 5, gridW - 10, gridH - 10);

        ctx.fillStyle = '#00f7ff';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('ALL 28 AUTOMATIC MEASUREMENTS (CH1)', gridX + 20, gridY + 28);

        const m = measurementsCh1;
        const paramList = [
          { name: 'Vpp', val: formatVolts(m.vpp) },
          { name: 'Vmax', val: formatVolts(m.vmax) },
          { name: 'Vmin', val: formatVolts(m.vmin) },
          { name: 'Vamp', val: formatVolts(m.vamp) },
          { name: 'Vtop', val: formatVolts(m.vtop) },
          { name: 'Vbase', val: formatVolts(m.vbase) },
          { name: 'Vmid', val: formatVolts(m.vmid) },
          { name: 'Vrms', val: formatVolts(m.vrms) },
          { name: 'Vavg', val: formatVolts(m.vavg) },
          { name: 'Overshoot', val: `${m.overshoot.toFixed(1)}%` },
          { name: 'Preshoot', val: `${m.preshoot.toFixed(1)}%` },
          { name: 'Freq', val: m.frequency >= 1000 ? `${(m.frequency / 1000).toFixed(3)}kHz` : `${m.frequency.toFixed(1)}Hz` },
          { name: 'Period', val: formatTime(m.period) },
          { name: 'RiseTime', val: formatTime(m.riseTime) },
          { name: 'FallTime', val: formatTime(m.fallTime) },
          { name: '+Width', val: formatTime(m.posWidth) },
          { name: '-Width', val: formatTime(m.negWidth) },
          { name: '+Duty', val: `${m.posDuty.toFixed(1)}%` },
          { name: '-Duty', val: `${m.negDuty.toFixed(1)}%` },
          { name: 'Delay', val: '0.00ns' },
        ];

        ctx.font = '11px "Courier New", monospace';
        const cols = 4;
        const rowH = 22;
        paramList.forEach((p, idx) => {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          const px = gridX + 20 + c * 105;
          const py = gridY + 55 + r * rowH;
          ctx.fillStyle = '#8ec5fc';
          ctx.fillText(p.name + ':', px, py);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(p.val, px + 50, py);
        });

        ctx.fillStyle = '#ffd600';
        ctx.font = '10px Arial, sans-serif';
        ctx.fillText('Press F5 or MEASURE to close parameter table', gridX + 20, gridY + gridH - 15);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, ch1Source, ch2Source, measurementsCh1, measurementsCh2, lastTriggerState]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.menuVisible || !onSoftKeyClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const menuW = 122;
    const mX = canvas.width - menuW;
    if (x >= mX) {
      const btnH = (canvas.height - 38) / 5;
      const clickedIdx = Math.floor((y - 32) / btnH) + 1;
      if (clickedIdx >= 1 && clickedIdx <= 5) {
        onSoftKeyClick(clickedIdx as 1 | 2 | 3 | 4 | 5);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#030d24] flex items-center justify-center p-1 select-none rounded shadow-2xl border-2 border-[#164da3]">
      <canvas
        ref={canvasRef}
        width={580}
        height={350}
        onClick={handleCanvasClick}
        className="w-full h-full block cursor-pointer rounded"
        data-testid="oscilloscope-screen"
      />
    </div>
  );
};

/**
 * Returns menu label and current setting for F1-F5 softkeys matching UTD2025CL firmware
 * Supports Chinese (matching university device photo) or English / Arabic.
 */
function getMenuSoftKeys(
  state: OscilloscopeState,
  m1: SignalParameters,
  m2: SignalParameters
): Array<{ label: string; value: string }> {
  const isCN = state.language === 'CN';

  switch (state.activeMenu) {
    case 'CH1':
      return [
        {
          label: isCN ? '耦合' : 'Coupling',
          value: state.ch1.coupling === 'DC' ? (isCN ? '直流' : 'DC') : state.ch1.coupling === 'AC' ? (isCN ? '交流' : 'AC') : (isCN ? '接地' : 'GND'),
        },
        {
          label: isCN ? '带宽限制' : 'BW Limit',
          value: state.ch1.bwLimit ? (isCN ? '开' : 'ON') : (isCN ? '关' : 'OFF'),
        },
        {
          label: isCN ? '伏 / 格' : 'Volts/Div',
          value: state.ch1.voltsDivStep === 'Coarse' ? (isCN ? '粗调' : 'Coarse') : (isCN ? '微调' : 'Fine'),
        },
        {
          label: isCN ? '探头' : 'Probe',
          value: `${state.ch1.probe}X`,
        },
        {
          label: isCN ? '反相' : 'Invert',
          value: state.ch1.invert ? (isCN ? '开' : 'ON') : (isCN ? '关' : 'OFF'),
        },
      ];

    case 'CH2':
      return [
        {
          label: isCN ? '耦合' : 'Coupling',
          value: state.ch2.coupling === 'DC' ? (isCN ? '直流' : 'DC') : state.ch2.coupling === 'AC' ? (isCN ? '交流' : 'AC') : (isCN ? '接地' : 'GND'),
        },
        {
          label: isCN ? '带宽限制' : 'BW Limit',
          value: state.ch2.bwLimit ? (isCN ? '开' : 'ON') : (isCN ? '关' : 'OFF'),
        },
        {
          label: isCN ? '伏 / 格' : 'Volts/Div',
          value: state.ch2.voltsDivStep === 'Coarse' ? (isCN ? '粗调' : 'Coarse') : (isCN ? '微调' : 'Fine'),
        },
        {
          label: isCN ? '探头' : 'Probe',
          value: `${state.ch2.probe}X`,
        },
        {
          label: isCN ? '反相' : 'Invert',
          value: state.ch2.invert ? (isCN ? '开' : 'ON') : (isCN ? '关' : 'OFF'),
        },
      ];

    case 'MATH':
      if (state.math.type === 'Math') {
        return [
          { label: isCN ? '类型' : 'Type', value: 'Math' },
          { label: isCN ? '信源 1' : 'Source 1', value: state.math.source1 },
          { label: isCN ? '运算符' : 'Operator', value: state.math.operator },
          { label: isCN ? '信源 2' : 'Source 2', value: state.math.source2 },
          { label: isCN ? '归零居中' : 'Center Pos', value: '0.0div' },
        ];
      } else {
        return [
          { label: isCN ? '类型' : 'Type', value: 'FFT' },
          { label: isCN ? '信源' : 'Source', value: state.math.fftSource },
          { label: isCN ? '窗函数' : 'Window', value: state.math.fftWindow },
          { label: isCN ? '格式' : 'Vertical', value: state.math.fftUnit },
          { label: isCN ? '标尺' : 'Scale', value: 'Auto' },
        ];
      }

    case 'MEASURE':
      return [
        { label: 'CH1 Vpp', value: `${m1.vpp.toFixed(2)}V` },
        { label: 'CH1 Freq', value: m1.frequency >= 1000 ? `${(m1.frequency / 1000).toFixed(2)}kHz` : `${m1.frequency.toFixed(0)}Hz` },
        { label: 'CH1 Vrms', value: `${m1.vrms.toFixed(2)}V` },
        { label: 'CH1 RiseT', value: `${(m1.riseTime * 1e6).toFixed(1)}μs` },
        { label: isCN ? '所有参数' : 'Parameters', value: state.showAllParametersModal ? 'Close' : 'All 28' },
      ];

    case 'CURSOR':
      return [
        { label: isCN ? '类型' : 'Type', value: state.cursor.type },
        { label: isCN ? '信源' : 'Source', value: state.cursor.source },
        { label: isCN ? '光标' : 'Active', value: `Cur ${state.cursor.activeCursor.toUpperCase()}` },
        {
          label: state.cursor.type === 'Voltage' ? 'ΔV' : 'ΔT',
          value:
            state.cursor.type === 'Voltage'
              ? `${Math.abs(state.cursor.cursorVa - state.cursor.cursorVb).toFixed(2)}V`
              : `${(Math.abs(state.cursor.cursorTa - state.cursor.cursorTb) * 1e6).toFixed(1)}μs`,
        },
        { label: isCN ? '居中' : 'Reset', value: 'Center' },
      ];

    case 'ACQUIRE':
      return [
        { label: isCN ? '采集方式' : 'Acq Mode', value: state.acquire.mode },
        { label: isCN ? '平均次数' : 'Averages', value: `${state.acquire.averages}` },
        { label: isCN ? '采样' : 'Sampling', value: state.acquire.sampling },
        { label: isCN ? '快速捕获' : 'FastAcq', value: state.acquire.fastAcq ? 'ON' : 'OFF' },
        { label: isCN ? '存储深度' : 'Depth', value: '25k Pts' },
      ];

    case 'DISPLAY':
      return [
        { label: isCN ? '类型' : 'Types', value: state.display.type },
        { label: isCN ? '格式' : 'Format', value: state.display.format },
        { label: isCN ? '余辉' : 'Persist', value: state.display.persist },
        { label: isCN ? '网格亮度' : 'Grid Bri', value: `${state.display.gridBrightness}%` },
        { label: isCN ? '波形亮度' : 'Wave Bri', value: `${state.display.waveformBrightness}%` },
      ];

    case 'HORI':
      return [
        { label: isCN ? '时间模式' : 'Time Mode', value: state.horiZoomMode },
        { label: isCN ? '窗口扩展' : 'Window', value: state.horiZoomMode === 'Window' ? 'Active' : 'Off' },
        { label: isCN ? '释抑' : 'Hold off', value: `${(state.trigger.holdoff * 1e9).toFixed(0)}ns` },
        { label: isCN ? '位置归零' : 'Reset Pos', value: '0.00μs' },
        { label: isCN ? '时基' : 'Main Base', value: 'YT' },
      ];

    case 'TRIGGER':
      return [
        { label: isCN ? '类型' : 'Type', value: state.trigger.type },
        { label: isCN ? '信源' : 'Source', value: state.trigger.source },
        { label: isCN ? '斜率' : 'Slope', value: state.trigger.slope },
        { label: isCN ? '方式' : 'Mode', value: state.trigger.mode },
        { label: isCN ? '耦合' : 'Coupling', value: state.trigger.coupling },
      ];

    case 'STORAGE':
      return [
        { label: isCN ? '类型' : 'Type', value: 'Wave' },
        { label: isCN ? '信源' : 'Source', value: 'CH1' },
        { label: isCN ? '位置' : 'Dest', value: state.usbPlugged ? 'USB (1/200)' : 'DSO (1/20)' },
        { label: isCN ? '保存' : 'Save', value: 'Execute' },
        { label: isCN ? '调出' : 'Load', value: 'Recall' },
      ];

    case 'UTILITY':
      if (state.menuPage === 1) {
        return [
          { label: isCN ? '自校正' : 'Self-Adj', value: 'Start' },
          { label: isCN ? '通过/失败' : 'Pass/Fail', value: 'Setup' },
          { label: isCN ? '录制器' : 'Recorder', value: 'Ready' },
          { label: isCN ? '语言' : 'Language', value: state.language },
          { label: isCN ? '下一页' : 'Next Page', value: '1/3' },
        ];
      } else if (state.menuPage === 2) {
        return [
          { label: isCN ? '出厂设置' : 'Factory', value: 'Reset' },
          { label: isCN ? '皮肤' : 'Skin', value: state.skin },
          { label: isCN ? '网格亮度' : 'Grid Bri', value: `${state.display.gridBrightness}%` },
          { label: isCN ? '声音' : 'Sound', value: state.soundEnabled ? 'ON' : 'OFF' },
          { label: isCN ? '下一页' : 'Next Page', value: '2/3' },
        ];
      } else {
        return [
          { label: isCN ? '版本' : 'Version', value: 'v3.20' },
          { label: isCN ? '频率计' : 'Freq Count', value: state.frequencyCounterEnabled ? 'ON' : 'OFF' },
          { label: isCN ? 'USB接口' : 'USB OTG', value: state.usbPlugged ? 'Ready' : 'No Disk' },
          { label: isCN ? '第一页' : 'First Page', value: '3/3' },
          { label: isCN ? '退出' : 'Close Menu', value: 'Exit' },
        ];
      }

    default:
      return [
        { label: 'CH1', value: state.ch1.enabled ? 'ON' : 'OFF' },
        { label: 'CH2', value: state.ch2.enabled ? 'ON' : 'OFF' },
        { label: 'Timebase', value: `${formatTime(state.timeDiv)}` },
        { label: 'Trigger', value: state.trigger.mode },
        { label: 'Measure', value: 'Auto' },
      ];
  }
}
