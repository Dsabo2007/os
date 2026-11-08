/**
 * Quick Help & Operation Guide Modal (UNI-T UTD2025CL)
 * Interactive instructions in English and Arabic for university students and engineers.
 */

import React, { useState } from 'react';
import { X, BookOpen, Sliders, Activity, Zap, CheckCircle2 } from 'lucide-react';

interface QuickHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickHelpModal: React.FC<QuickHelpModalProps> = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState<'AR' | 'EN'>('AR');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-[#101726] border border-cyan-800/80 rounded-2xl shadow-2xl text-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 bg-[#141f33]">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              {lang === 'AR'
                ? 'دليل استخدام جهاز راسم الإشارة UNI-T UTD2025CL'
                : 'UNI-T UTD2025CL Oscilloscope User Guide'}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {/* Lang switch */}
            <div className="flex bg-[#0b121e] rounded-lg p-0.5 border border-cyan-900">
              <button
                type="button"
                onClick={() => setLang('AR')}
                className={`px-2.5 py-1 text-xs font-bold rounded ${
                  lang === 'AR' ? 'bg-cyan-600 text-white' : 'text-gray-400'
                }`}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setLang('EN')}
                className={`px-2.5 py-1 text-xs font-bold rounded ${
                  lang === 'EN' ? 'bg-cyan-600 text-white' : 'text-gray-400'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm leading-relaxed" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
          {lang === 'AR' ? (
            <>
              <div className="bg-[#172338] border border-cyan-700/40 p-4 rounded-xl">
                <h3 className="font-bold text-cyan-300 text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  مرحباً بك في المحاكي الواقعي لجهاز UTD2025CL المستخدم في المختبرات والجامعات
                </h3>
                <p className="text-gray-300 text-xs">
                  تمت برمجة هذا النظام بدقة متناهية ليطابق جهاز UNI-T UTD2025CL الحقيقي في كافة التفاصيل: القوائم، الأزرار، محاذاة الصفر لقناة الرياضيات (Math)، محاكاة الضوضاء والتشويش الفيزيائي، ومعايرة مسبار الفحص (Probe Compensation).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#121a2a] p-4 rounded-xl border border-gray-800">
                  <h4 className="font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    التحكم في العجلات والأزرار
                  </h4>
                  <ul className="space-y-1.5 text-gray-300 text-xs list-disc pr-4">
                    <li><b>العجلات (Knobs):</b> يمكنك تدويرها بالسحب للأعلى/الأسفل بالماوس، أو بعجلة الماوس (Mouse Wheel).</li>
                    <li><b>عجلة MULTIPURPOSE:</b> للتنقل وضبط المؤشرات (Cursors) وتعديل الإضاءة والـ Holdoff، والضغط عليها للتبديل بين المؤشرين.</li>
                    <li><b>أزرار F1 إلى F5:</b> تقع بجانب الشاشة مباشرة لتغيير خيارات القائمة المعروضة حالياً.</li>
                    <li><b>AUTO:</b> لضبط الإشارة ومقياس الجهد والزمن تلقائياً.</li>
                    <li><b>RUN/STOP:</b> يضيء بالأخضر أثناء التشغيل وبالأحمر عند إيقاف التحديث.</li>
                  </ul>
                </div>

                <div className="bg-[#121a2a] p-4 rounded-xl border border-gray-800">
                  <h4 className="font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    نظام الرياضيات MATH و FFT
                  </h4>
                  <ul className="space-y-1.5 text-gray-300 text-xs list-disc pr-4">
                    <li><b>MATH (+, -, ×, ÷):</b> يظهر باللون الأحمر، وخط الأساس يبدأ من خط الصفر في المنتصف تماماً مع مؤشر <b>M ▶</b>.</li>
                    <li><b>تحليل FFT:</b> اضغط F1 في قائمة MATH للتحويل إلى مجال التردد مع نوافذ Hanning, Hamming, Blackman, Rectangle.</li>
                    <li><b>MEASURE:</b> يعرض القياسات الخمسة الرئيسية، وبزر <b>Parameters</b> يعرض جدول جميع المعاملات الـ 28 معاً!</li>
                  </ul>
                </div>
              </div>

              <div className="bg-[#121a2a] p-4 rounded-xl border border-gray-800">
                <h4 className="font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  محاكاة معايرة المسبار (Probe Compensation)
                </h4>
                <p className="text-gray-300 text-xs mb-2">
                  في جهاز الجامعة، عند ربط المسبار بمخرج <b>PROBE COMP (1kHz 3Vpp)</b>، يتم ضبط المكثف المتغير:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-rose-950/40 border border-rose-800 rounded">
                    <span className="font-bold text-rose-300 block">Over-Compensated</span>
                    ارتفاع حاد وتذبذب عند الحواف
                  </div>
                  <div className="p-2 bg-emerald-950/40 border border-emerald-800 rounded">
                    <span className="font-bold text-emerald-300 block">Correct</span>
                    موجة مربعة نقية ومستقيمة
                  </div>
                  <div className="p-2 bg-amber-950/40 border border-amber-800 rounded">
                    <span className="font-bold text-amber-300 block">Under-Compensated</span>
                    حواف منحنية دائرية
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#172338] border border-cyan-700/40 p-4 rounded-xl">
                <h3 className="font-bold text-cyan-300 text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Realistic UNI-T UTD2025CL Digital Storage Oscilloscope
                </h3>
                <p className="text-gray-300 text-xs">
                  Built to accurately simulate the real university laboratory device down to every menu, hardware rotary knob, math baseline centering, analog noise characteristics, and probe compensation trimmer.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#121a2a] p-4 rounded-xl border border-gray-800">
                  <h4 className="font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    Hardware Knobs & Buttons
                  </h4>
                  <ul className="space-y-1.5 text-gray-300 text-xs list-disc pl-4">
                    <li><b>Knobs:</b> Drag up/down or rotate with mouse wheel.</li>
                    <li><b>MULTIPURPOSE Knob:</b> Adjusts active cursors, grid/wave brightness, and hold-off. Push to switch active cursor.</li>
                    <li><b>F1-F5 Softkeys:</b> Situated beside the LCD screen to toggle the active on-screen menu options.</li>
                    <li><b>AUTO Button:</b> Optimizes vertical/horizontal scales and trigger automatically.</li>
                    <li><b>RUN/STOP:</b> Green LED indicates live sweep; Red LED indicates frozen capture.</li>
                  </ul>
                </div>

                <div className="bg-[#121a2a] p-4 rounded-xl border border-gray-800">
                  <h4 className="font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Math & FFT Spectral Engine
                  </h4>
                  <ul className="space-y-1.5 text-gray-300 text-xs list-disc pl-4">
                    <li><b>Math (+, -, ×, ÷):</b> Renders in red with zero baseline properly aligned to grid center and labeled with <b>M ▶</b>.</li>
                    <li><b>FFT:</b> Converts time-domain to frequency spectrum with Hanning, Hamming, Blackman, and Rectangle windows.</li>
                    <li><b>28 Automatic Measurements:</b> Click MEASURE then F5 to view all 28 parameters simultaneously.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 px-6 py-3 bg-[#141f33] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors"
          >
            {lang === 'AR' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
