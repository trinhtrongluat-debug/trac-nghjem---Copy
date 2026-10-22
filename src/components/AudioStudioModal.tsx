import React, { useState } from 'react';
import { 
  Headphones, 
  Volume2, 
  Sparkles, 
  User, 
  Users, 
  Play, 
  Pause, 
  Check, 
  RotateCcw, 
  Mic, 
  Sliders, 
  Layers
} from 'lucide-react';
import { ExamPart } from '../types/exam';

interface AudioStudioModalProps {
  part: ExamPart;
  customApiKey: string;
  onClose: () => void;
  onApplyAudio: (audioUrl: string, scriptText: string) => void;
}

interface CharacterVoice {
  name: string;
  voiceName: string;
  role: string;
}

const AVAILABLE_VOICES = [
  { id: 'Kore', label: 'Kore (Nữ - Trong trẻo, Chuẩn sư phạm)' },
  { id: 'Puck', label: 'Puck (Nam - Trẻ trung, Năng động, Thân thiện)' },
  { id: 'Zephyr', label: 'Zephyr (Nữ - Dịu dàng, Kể chuyện diễn cảm)' },
  { id: 'Charon', label: 'Charon (Nam - Trầm ấm, Chuẩn mực)' },
  { id: 'Fenrir', label: 'Fenrir (Nam - Dứt khoát, Mạnh mẽ)' },
];

export const AudioStudioModal: React.FC<AudioStudioModalProps> = ({
  part,
  customApiKey,
  onClose,
  onApplyAudio,
}) => {
  const [mode, setMode] = useState<'single' | 'dialogue_2' | 'dialogue_3'>('dialogue_2');
  const [contextPrompt, setContextPrompt] = useState(
    'Tiếng Anh giọng chuẩn Mỹ cho học sinh tiểu học, phát âm tròn vành rõ chữ, nhịp điệu tự nhiên và vui tươi.'
  );

  // Script text
  const [scriptText, setScriptText] = useState(
    part.audioScript ||
      part.description ||
      `Boy: Hi, I am Ben. I am eight years old.
Girl: Look at my school bag! It is blue and yellow.
Boy: This is my living room. There is a big TV on the table.`
  );

  // Characters setup
  const [characters, setCharacters] = useState<CharacterVoice[]>([
    { name: 'Boy', voiceName: 'Puck', role: 'Học sinh nam' },
    { name: 'Girl', voiceName: 'Kore', role: 'Học sinh nữ' },
    { name: 'Teacher', voiceName: 'Charon', role: 'Giáo viên hướng dẫn' },
  ]);

  const [singleVoice, setSingleVoice] = useState('Kore');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState(part.audioUrl || '');
  const [errorMessage, setErrorMessage] = useState('');

  // Presets
  const applyPreset = (presetText: string) => {
    setContextPrompt(presetText);
  };

  const handleGenerateAudio = async () => {
    if (!scriptText.trim()) {
      alert('Vui lòng nhập nội dung kịch bản phát âm trước khi tạo audio!');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/gemini/tts-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          mode,
          voiceName: singleVoice,
          characters: characters.slice(0, mode === 'dialogue_2' ? 2 : 3),
          contextPrompt,
          customApiKey: customApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tạo audio');

      if (data.audioDataUrl) {
        setGeneratedAudioUrl(data.audioDataUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi xử lý âm thanh AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!generatedAudioUrl) {
      alert('Chưa có file audio nào được tạo!');
      return;
    }
    onApplyAudio(generatedAudioUrl, scriptText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Máy Tạo Audio AI Phòng Thu Chuyên Nghiệp</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini TTS Studio
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tạo giọng đọc chuẩn quốc tế cho {part.title} (Đơn thoại hoặc Đối thoại đa nhân vật)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg px-2 py-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Mode Switcher */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>1. Chọn Hình Thức Phát Âm:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  mode === 'single'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1 text-xs">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>1 Người Đọc (Đơn thoại)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Phù hợp bài đọc diễn cảm, đọc chính tả, bài văn mẫu hoặc thông báo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('dialogue_2')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  mode === 'dialogue_2'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1 text-xs">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Hội Thoại 2 Người (Dialogue)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Phù hợp bài nghe giao tiếp giữa 2 nhân vật (Nam - Nữ / Bạn bè / Thầy trò).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('dialogue_3')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  mode === 'dialogue_3'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1 text-xs">
                  <Layers className="w-4 h-4 text-pink-400" />
                  <span>Hội Thoại 3 Người (Trio Studio)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Phù hợp kịch bản có Người dẫn chuyện (Narrator) + 2 nhân vật thoại.
                </p>
              </button>
            </div>
          </div>

          {/* Context Prompt For AI */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>2. Prompt Ngữ Cảnh Cho AI (Tone, Nhịp độ, Độ tuổi):</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset(
                      'Phát âm tiếng Anh chậm, rõ từng âm tiết, giọng vui tươi cho học sinh lớp 3'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[10px]"
                >
                  Tiểu học (Chậm rõ)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset(
                      'American natural conversational tone, friendly and energetic pace'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[10px]"
                >
                  Tự nhiên THCS
                </button>
              </div>
            </div>
            <input
              type="text"
              value={contextPrompt}
              onChange={(e) => setContextPrompt(e.target.value)}
              placeholder="Ví dụ: Giọng chuẩn Anh-Mỹ, nhịp độ vừa phải, ngữ điệu thân thiện..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Character & Voice Selectors */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            <span className="font-semibold text-slate-300 block">
              3. Chọn Nhân Vật & Gán Giọng Đọc:
            </span>

            {mode === 'single' ? (
              <div>
                <label className="block text-slate-400 mb-1">Giọng Đọc Chính:</label>
                <select
                  value={singleVoice}
                  onChange={(e) => setSingleVoice(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-medium"
                >
                  {AVAILABLE_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {characters.slice(0, mode === 'dialogue_2' ? 2 : 3).map((char, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300 text-[11px]">
                        Nhân Vật {cIdx + 1}:
                      </span>
                      <span className="text-[10px] text-slate-400">{char.role}</span>
                    </div>

                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setCharacters((prev) =>
                          prev.map((c, i) => (i === cIdx ? { ...c, name: newName } : c))
                        );
                      }}
                      placeholder="Tên nhân vật (ví dụ: Boy, Girl)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white font-semibold text-xs"
                    />

                    <select
                      value={char.voiceName}
                      onChange={(e) => {
                        const newV = e.target.value;
                        setCharacters((prev) =>
                          prev.map((c, i) => (i === cIdx ? { ...c, voiceName: newV } : c))
                        );
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white text-[11px]"
                    >
                      {AVAILABLE_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Script Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>4. Kịch Bản Lời Thoại (Script Text):</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Định dạng: <code className="text-indigo-400">Tên_Nhân_Vật: Câu nói</code>
              </span>
            </div>
            <textarea
              rows={4}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Boy: Hello, how are you?&#10;Girl: I'm fine, thank you."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          {errorMessage && (
            <p className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
              {errorMessage}
            </p>
          )}

          {/* Audio Output Preview */}
          {generatedAudioUrl && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">File Âm Thanh Đã Sẵn Sàng</span>
                  <span className="text-[11px] text-emerald-300">
                    Phát thử để kiểm tra ngữ điệu và phát âm trước khi áp dụng.
                  </span>
                </div>
              </div>
              <audio controls src={generatedAudioUrl} className="h-8 max-w-xs" />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Hủy Bỏ
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAudio}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Phòng thu đang tạo giọng đọc...' : 'Bắt Đầu Sinh Audio AI'}</span>
            </button>

            {generatedAudioUrl && (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Áp Dụng Vào Part</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
