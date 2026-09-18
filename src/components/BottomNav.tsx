import React from 'react';
import { BookOpen, Users, Trophy, BarChart3, Award } from 'lucide-react';
import { soundEffects } from '../utils/audio';

export type TabType = 'practice' | 'group' | 'leaderboard' | 'analytics' | 'badges';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  unclaimedBadgesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  unclaimedBadgesCount = 0,
}) => {
  const tabs = [
    { id: 'practice' as TabType, label: 'Latihan', icon: BookOpen },
    { id: 'group' as TabType, label: 'Kumpulan', icon: Users },
    { id: 'leaderboard' as TabType, label: 'Ranking', icon: Trophy },
    { id: 'analytics' as TabType, label: 'Prestasi', icon: BarChart3 },
    { id: 'badges' as TabType, label: 'Lencana', icon: Award, badge: unclaimedBadgesCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundEffects.playClick();
                onChangeTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="w-1 h-1 bg-emerald-400 rounded-full mt-0.5 shadow-sm shadow-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
