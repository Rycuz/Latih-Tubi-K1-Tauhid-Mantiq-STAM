import React from 'react';
import { Question } from '../types';
import { QUESTIONS_DATA } from '../data/questions';
import { MultiDeviceLiveChallenge } from './MultiDeviceLiveChallenge';

interface GroupChallengeViewProps {
  onUnlockGroupBadge: () => void;
  languageMode: 'bilingual' | 'arabic' | 'malay';
  questions?: Question[];
  currentStudent?: {
    id: string;
    name: string;
    schoolOrClass?: string;
  };
  onClose?: () => void;
}

export const GroupChallengeView: React.FC<GroupChallengeViewProps> = ({
  onUnlockGroupBadge,
  languageMode,
  questions = QUESTIONS_DATA,
  currentStudent = { id: 'std-user', name: 'Pelajar STAM', schoolOrClass: 'SMKA' },
  onClose,
}) => {
  return (
    <MultiDeviceLiveChallenge
      questions={questions}
      languageMode={languageMode}
      currentStudent={currentStudent}
      onUnlockGroupBadge={onUnlockGroupBadge}
      onClose={onClose}
    />
  );
};
