import React, { useState, useEffect } from 'react';
import { 
  User, 
  School, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

export interface StudentProfileData {
  studentId: string;
  name: string;
  school: string;
  studentClass: string;
}

interface StudentProfileModalProps {
  isOpen: boolean;
  isMandatoryOnboarding?: boolean;
  initialProfile: StudentProfileData;
  onSave: (profile: StudentProfileData) => Promise<void> | void;
  onClose?: () => void;
}

const COMMON_SCHOOL_SUGGESTIONS = [
  'Maahad Yaakubiah (MAYA)',
  'Maahad Muhammadi Rantau Panjang',
  'Maahad Muhammadi (L)',
  'Maahad Muhammadi (P)',
  'SMKA Maahad Hamidiah',
];

const COMMON_CLASS_SUGGESTIONS = [
  '6 Syukur',
  '6 Sabar',
  '6 Ikhlas',
  '6 Tawaduk',
  '6 Redha',
];

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  isMandatoryOnboarding = false,
  initialProfile,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialProfile.name || '');
  const [school, setSchool] = useState(initialProfile.school || '');
  const [studentClass, setStudentClass] = useState(initialProfile.studentClass || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialProfile.name || '');
      setSchool(initialProfile.school || '');
      setStudentClass(initialProfile.studentClass || '');
      setErrorMsg('');
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSchool = school.trim();
    const cleanClass = studentClass.trim();

    if (!cleanName) {
      setErrorMsg('Sila masukkan nama penuh sebenar anda.');
      return;
    }
    if (cleanName.length < 3) {
      setErrorMsg('Nama terlalu pendek. Sila masukkan nama penuh anda.');
      return;
    }
    if (!cleanSchool) {
      setErrorMsg('Sila pilih atau masukkan nama sekolah anda.');
      return;
    }
    if (!cleanClass) {
      setErrorMsg('Sila pilih atau masukkan kelas / tingkatan anda.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      soundEffects.playCorrect();
      await onSave({
        studentId: initialProfile.studentId || `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        school: cleanSchool,
        studentClass: cleanClass,
      });
      if (onClose && !isMandatoryOnboarding) {
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setErrorMsg(err?.message || 'Ralat semasa menyimpan profil. Sila cuba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isMandatoryOnboarding ? 'Pendaftaran Calon STAM' : 'Kemaskini Profil Pelajar'}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {isMandatoryOnboarding ? 'Wajib' : 'Profil'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isMandatoryOnboarding
                  ? 'Sila lengkapkan profil sebelum mula mengakses soalan latih tubi.'
                  : 'Pastikan maklumat anda tepat mengikut rekod sekolah.'}
              </p>
            </div>
          </div>

          {!isMandatoryOnboarding && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Important Notice on Real Names */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Gunakan Nama Penuh Sebenar (Bukan Nama Samaran)</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed pl-5.5">
              Guru anda memantau prestasi dan skor latihan melalui sistem ini. Sekiranya anda menggunakan nama samaran sebelum ini, sila tukar kepada nama penuh rasmi anda sekarang.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Field 1: Nama Penuh */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200">
              Nama Penuh Sebenar Pelajar <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cth: Muhammad Alif bin Danial"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <span className="text-[10px] text-slate-500 block">
              Nama ini akan dipaparkan dalam papan markah guru dan slip peperiksaan.
            </span>
          </div>

          {/* Field 2: Nama Sekolah */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200">
              Nama Sekolah / Pusat Pengajian <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <School className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Cth: Maahad Yaakubiah (MAYA)"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Quick School Chips */}
            <div className="pt-1">
              <span className="text-[10px] font-semibold text-slate-400 block mb-1">Pilihan Cepat:</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SCHOOL_SUGGESTIONS.map((sch) => (
                  <button
                    key={sch}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setSchool(sch);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                      school === sch
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {sch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Field 3: Kelas / Tingkatan */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200">
              Kelas / Tingkatan <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder="Cth: 6 Syukur / 6 Sabar"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            {/* Quick Class Chips */}
            <div className="pt-1">
              <span className="text-[10px] font-semibold text-slate-400 block mb-1">Pilihan Cepat:</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_CLASS_SUGGESTIONS.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setStudentClass(cls);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                      studentClass === cls
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-3">
            {!isMandatoryOnboarding && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving || !name.trim() || !school.trim() || !studentClass.trim()}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-98"
            >
              {isSaving ? (
                <span>Sedang Menyimpan...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isMandatoryOnboarding ? 'Sahkan & Mula Akses' : 'Simpan Profil'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
