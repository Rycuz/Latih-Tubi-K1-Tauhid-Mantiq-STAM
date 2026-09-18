import React, { useState } from 'react';
import { 
  Share2, 
  X, 
  Check, 
  Copy, 
  MessageCircle, 
  Send, 
  Sparkles, 
  BookOpen, 
  ExternalLink 
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Resolve current public link or fallback
  const currentUrl = typeof window !== 'undefined' 
    ? window.location.href.split('?')[0] 
    : 'https://ais-pre-vmldpkm6ke4wsknadvfg7k-611743785875.asia-east1.run.app';

  // Include version parameter to ensure cache busting on social platforms
  const shareableUrl = `${currentUrl}?v=stam2025`;

  const appTitle = 'Aplikasi Latih Tubi Tauhid Mantiq STAM';
  const appTagline = 'Aplikasi Latihan Interaktif Subjek Tauhid, Firaq & Mantiq Sukatan STAM';
  
  const formattedMessage = 
`📚 *${appTitle}*
${appTagline}

✨ *Ciri-ciri Utama:*
• Latihan aneka pilihan (MCQ) lengkap 3 subjek
• Mod Arab & Dwi-Bahasa (BM)
• Pemarkahan segera, semakan pantas & lencana
• Dashboard Guru masa nyata & rekod markah

👉 *Jom mulakan latihan anda sekarang:*
${shareableUrl}`;

  const handleCopy = async () => {
    soundEffects.playClick();
    try {
      await navigator.clipboard.writeText(formattedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback manual copy
      const textarea = document.createElement('textarea');
      textarea.value = formattedMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    soundEffects.playClick();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareTelegram = () => {
    soundEffects.playClick();
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareableUrl)}&text=${encodeURIComponent(`📚 *${appTitle}*\n${appTagline}\n\nJom buat latih tubi STAM bersama!`)}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <div 
      id="share-app-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div 
        id="share-app-modal-card"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle Decorative Gradient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Kongsi Aplikasi ke Pelajar & Guru</span>
              </h2>
              <p className="text-xs text-emerald-400 font-medium">
                {appTitle}
              </p>
            </div>
          </div>
          <button
            id="btn-close-share-modal"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            <span>Format Mesej Bersama Tajuk Rasmi:</span>
          </label>
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto selection:bg-emerald-500 selection:text-white">
            {formattedMessage}
          </div>
        </div>

        {/* Instant Action Share Buttons */}
        <div className="space-y-2.5 mb-5">
          <button
            id="btn-share-whatsapp-instant"
            onClick={handleShareWhatsApp}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/40 active:scale-[0.98]"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Hantar Terus ke WhatsApp (Tajuk Rasmi Disertakan)</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="btn-share-telegram-instant"
              onClick={handleShareTelegram}
              className="py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Hantar ke Telegram</span>
            </button>

            <button
              id="btn-copy-share-text"
              onClick={handleCopy}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Teks & Pautan Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salin Mesej & Pautan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Technical Explanatory Note */}
        <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-[11px] text-slate-400 leading-normal flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Tip Guru:</strong> Pautan sandbox Google AI Studio dilindungi oleh tapisan keselamatan pelayan (*Google Cookie Check*), menyebabkan sebahagian bot WhatsApp/Telegram tidak dapat menjana pratonton automatik. Butang di atas menyertakan tajuk <strong>&quot;Aplikasi Latih Tubi Tauhid Mantiq STAM&quot;</strong> terus ke dalam teks mesej secara kemas.
          </p>
        </div>
      </div>
    </div>
  );
};
