import React, { useState } from 'react';
import { Trophy, Medal, Flame, Sparkles, Award, Users, Search, Heart } from 'lucide-react';
import { LeaderboardUser } from '../types';
import { soundEffects } from '../utils/audio';

interface LeaderboardViewProps {
  users: LeaderboardUser[];
  currentStudentXp: number;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  users,
  currentStudentXp,
}) => {
  const [filterCategory, setFilterCategory] = useState<'overall' | 'tauhid' | 'firaq' | 'mantiq'>('overall');
  const [cheeredIds, setCheeredIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort by XP with current student's real-time updated XP
  const updatedUsers = users.map((u) => {
    if (u.isCurrentUser) {
      return { ...u, totalXp: currentStudentXp };
    }
    return u;
  });

  const sortedUsers = [...updatedUsers].sort((a, b) => b.totalXp - a.totalXp);
  
  // Assign ranks
  const rankedUsers = sortedUsers.map((u, idx) => ({
    ...u,
    rank: idx + 1,
  }));

  const currentUser = rankedUsers.find((u) => u.isCurrentUser);

  const filteredUsers = rankedUsers.filter((u) => {
    return u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.schoolOrClass.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const topThree = rankedUsers.slice(0, 3);

  const handleCheer = (userId: string) => {
    soundEffects.playClick();
    if (!cheeredIds.includes(userId)) {
      setCheeredIds((prev) => [...prev, userId]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
      {/* Header Banner */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-1">
          <Trophy className="w-3.5 h-3.5" />
          <span>Persaingan Sihat Thulab Al-Ilm</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Papan Pendahulu Kecemerlangan
        </h2>
        <p className="text-xs text-slate-400 font-arabic text-sm">
          وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ
        </p>
      </div>

      {/* Top 3 Podium Visual */}
      <div className="grid grid-cols-3 gap-2 items-end pt-8 pb-4">
        {/* Rank 2 (Silver) */}
        {topThree[1] && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <span className="text-3xl filter drop-shadow">{topThree[1].avatar}</span>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-300 text-slate-950 font-black rounded-full flex items-center justify-center text-[10px] shadow">
                2
              </span>
            </div>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[90px] text-center">
              {topThree[1].name.split(' ')[0]}
            </span>
            <span className="text-[11px] font-extrabold text-amber-400">
              {topThree[1].totalXp} XP
            </span>
            <div className="w-full h-20 mt-2 bg-gradient-to-t from-slate-800 to-slate-700/60 rounded-t-2xl border-t-2 border-slate-400/80 flex items-center justify-center">
              <Medal className="w-6 h-6 text-slate-300" />
            </div>
          </div>
        )}

        {/* Rank 1 (Gold) */}
        {topThree[0] && (
          <div className="flex flex-col items-center -mt-4">
            <div className="relative mb-2">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce">
                👑
              </div>
              <span className="text-4xl filter drop-shadow">{topThree[0].avatar}</span>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 text-slate-950 font-black rounded-full flex items-center justify-center text-xs shadow-md">
                1
              </span>
            </div>
            <span className="text-xs font-bold text-amber-300 truncate max-w-[100px] text-center">
              {topThree[0].name.split(' ')[0]}
            </span>
            <span className="text-xs font-black text-amber-400 flex items-center gap-0.5">
              <Sparkles className="w-3 h-3" /> {topThree[0].totalXp} XP
            </span>
            <div className="w-full h-28 mt-2 bg-gradient-to-t from-amber-950/80 via-amber-900/40 to-amber-700/60 rounded-t-2xl border-t-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
          </div>
        )}

        {/* Rank 3 (Bronze) */}
        {topThree[2] && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <span className="text-3xl filter drop-shadow">{topThree[2].avatar}</span>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-700 text-white font-black rounded-full flex items-center justify-center text-[10px] shadow">
                3
              </span>
            </div>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[90px] text-center">
              {topThree[2].name.split(' ')[0]}
            </span>
            <span className="text-[11px] font-extrabold text-amber-400">
              {topThree[2].totalXp} XP
            </span>
            <div className="w-full h-16 mt-2 bg-gradient-to-t from-slate-800 to-amber-950/50 rounded-t-2xl border-t-2 border-amber-700/80 flex items-center justify-center">
              <Medal className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        )}
      </div>

      {/* Pinned Current Student Card */}
      {currentUser && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/50 rounded-2xl p-3.5 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold flex items-center justify-center text-sm shrink-0 border border-emerald-500/40">
              #{currentUser.rank}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">{currentUser.name}</span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500 text-slate-950 rounded">
                  Anda
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block">
                {currentUser.accuracy}% ketepatan • {currentUser.badgesCount} lencana
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-black text-emerald-400 block">
              {currentUser.totalXp} XP
            </span>
            {currentUser.rank && currentUser.rank > 1 && (
              <span className="text-[10px] text-slate-400">
                +{rankedUsers[currentUser.rank - 2]?.totalXp - currentUser.totalXp + 10} XP ke #{currentUser.rank - 1}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama rakan atau sekolah..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Full Leaderboard List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Kedudukan Pelajar ({filteredUsers.length})
        </h3>

        <div className="space-y-1.5">
          {filteredUsers.map((user) => {
            const isCurrentUser = user.isCurrentUser;
            const hasCheered = cheeredIds.includes(user.id);

            return (
              <div
                key={user.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
                  isCurrentUser
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-7 text-center font-extrabold text-xs ${
                    user.rank === 1 ? 'text-amber-400 text-sm' :
                    user.rank === 2 ? 'text-slate-300' :
                    user.rank === 3 ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    #{user.rank}
                  </span>

                  <span className="text-xl shrink-0">{user.avatar}</span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {user.name}
                      </span>
                      {isCurrentUser && (
                        <span className="px-1 py-0.2 text-[8px] font-bold bg-emerald-500 text-slate-950 rounded">
                          Saya
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {user.schoolOrClass}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400 block">
                      {user.totalXp} XP
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                      <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                      {user.streakDays}h
                    </span>
                  </div>

                  {!isCurrentUser && (
                    <button
                      onClick={() => handleCheer(user.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        hasCheered 
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-400'
                      }`}
                      title={hasCheered ? 'Doa kejayaan dikirim!' : 'Kirim ucapan tahniah'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasCheered ? 'fill-rose-400 text-rose-400' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
