import { Question } from '../types';

/**
 * Inserts a new question into allQuestions at a specific position within its assigned topic.
 */
export function insertNewQuestionInTopic(
  allQuestions: Question[],
  newQuestion: Question,
  positionOption: 'end' | 'start' | 'custom',
  customPosition: number = 1
): { updatedList: Question[]; positionNumber: number } {
  const topicId = newQuestion.topicId;
  const topicQuestions = allQuestions.filter((q) => q.topicId === topicId);

  // If there are no existing questions in this topic, simply append
  if (topicQuestions.length === 0) {
    return {
      updatedList: [...allQuestions, newQuestion],
      positionNumber: 1,
    };
  }

  if (positionOption === 'start') {
    const firstGlobalIdx = allQuestions.findIndex((q) => q.topicId === topicId);
    const copy = [...allQuestions];
    copy.splice(firstGlobalIdx, 0, newQuestion);
    return {
      updatedList: copy,
      positionNumber: 1,
    };
  }

  if (positionOption === 'end') {
    let lastGlobalIdx = -1;
    for (let i = allQuestions.length - 1; i >= 0; i--) {
      if (allQuestions[i].topicId === topicId) {
        lastGlobalIdx = i;
        break;
      }
    }
    const copy = [...allQuestions];
    copy.splice(lastGlobalIdx + 1, 0, newQuestion);
    return {
      updatedList: copy,
      positionNumber: topicQuestions.length + 1,
    };
  }

  // Custom position (1-based index among questions in this topic)
  const clampedPos = Math.max(1, Math.min(customPosition, topicQuestions.length + 1));
  if (clampedPos === 1) {
    const firstGlobalIdx = allQuestions.findIndex((q) => q.topicId === topicId);
    const copy = [...allQuestions];
    copy.splice(firstGlobalIdx, 0, newQuestion);
    return {
      updatedList: copy,
      positionNumber: 1,
    };
  } else if (clampedPos > topicQuestions.length) {
    let lastGlobalIdx = -1;
    for (let i = allQuestions.length - 1; i >= 0; i--) {
      if (allQuestions[i].topicId === topicId) {
        lastGlobalIdx = i;
        break;
      }
    }
    const copy = [...allQuestions];
    copy.splice(lastGlobalIdx + 1, 0, newQuestion);
    return {
      updatedList: copy,
      positionNumber: topicQuestions.length + 1,
    };
  } else {
    const targetQ = topicQuestions[clampedPos - 1];
    const targetGlobalIdx = allQuestions.findIndex((q) => q.id === targetQ.id);
    const copy = [...allQuestions];
    copy.splice(targetGlobalIdx, 0, newQuestion);
    return {
      updatedList: copy,
      positionNumber: clampedPos,
    };
  }
}

/**
 * Moves an existing question 1 step up or down within its topic.
 */
export function moveQuestionWithinTopic(
  allQuestions: Question[],
  questionId: string,
  direction: 'up' | 'down'
): { updatedList: Question[]; newPos: number; total: number } | null {
  const targetQ = allQuestions.find((q) => q.id === questionId);
  if (!targetQ) return null;

  const topicId = targetQ.topicId;
  const topicQuestions = allQuestions.filter((q) => q.topicId === topicId);
  const currentTopicIdx = topicQuestions.findIndex((q) => q.id === questionId);

  if (currentTopicIdx === -1) return null;
  if (direction === 'up' && currentTopicIdx === 0) return null;
  if (direction === 'down' && currentTopicIdx === topicQuestions.length - 1) return null;

  const swapTopicIdx = direction === 'up' ? currentTopicIdx - 1 : currentTopicIdx + 1;
  const swapQ = topicQuestions[swapTopicIdx];

  const globalIdx1 = allQuestions.findIndex((q) => q.id === targetQ.id);
  const globalIdx2 = allQuestions.findIndex((q) => q.id === swapQ.id);

  if (globalIdx1 === -1 || globalIdx2 === -1) return null;

  const copy = [...allQuestions];
  copy[globalIdx1] = swapQ;
  copy[globalIdx2] = targetQ;

  return {
    updatedList: copy,
    newPos: swapTopicIdx + 1,
    total: topicQuestions.length,
  };
}

/**
 * Moves a question directly to a specific 1-based position within its topic.
 */
export function moveQuestionToPositionInTopic(
  allQuestions: Question[],
  questionId: string,
  target1BasedPos: number
): { updatedList: Question[]; newPos: number; total: number } | null {
  const targetQ = allQuestions.find((q) => q.id === questionId);
  if (!targetQ) return null;

  const topicId = targetQ.topicId;
  const topicQuestions = allQuestions.filter((q) => q.topicId === topicId);
  const currentTopicIdx = topicQuestions.findIndex((q) => q.id === questionId);

  if (currentTopicIdx === -1) return null;
  const clampedTargetIdx = Math.max(0, Math.min(target1BasedPos - 1, topicQuestions.length - 1));
  if (currentTopicIdx === clampedTargetIdx) return null;

  const reordered = [...topicQuestions];
  const [removed] = reordered.splice(currentTopicIdx, 1);
  reordered.splice(clampedTargetIdx, 0, removed);

  let tIdx = 0;
  const updatedList = allQuestions.map((q) => {
    if (q.topicId === topicId) {
      return reordered[tIdx++];
    }
    return q;
  });

  return {
    updatedList,
    newPos: clampedTargetIdx + 1,
    total: topicQuestions.length,
  };
}

/**
 * Reorders all questions of a topic to match the specified array of question IDs.
 */
export function reorderTopicQuestions(
  allQuestions: Question[],
  topicId: string,
  orderedIds: string[]
): Question[] {
  const topicMap = new Map<string, Question>();
  allQuestions.forEach((q) => {
    if (q.topicId === topicId) {
      topicMap.set(q.id, q);
    }
  });

  const reordered: Question[] = [];
  for (const id of orderedIds) {
    const q = topicMap.get(id);
    if (q) {
      reordered.push(q);
      topicMap.delete(id);
    }
  }

  // If any questions were missing from orderedIds, append them
  topicMap.forEach((q) => reordered.push(q));

  let tIdx = 0;
  return allQuestions.map((q) => {
    if (q.topicId === topicId) {
      return reordered[tIdx++];
    }
    return q;
  });
}

/**
 * Calculates a question's 1-based position and total count within its topic.
 */
export function getQuestionTopicPosition(
  allQuestions: Question[],
  questionId: string
): { position: number; total: number } {
  const targetQ = allQuestions.find((q) => q.id === questionId);
  if (!targetQ) return { position: 1, total: 1 };

  const topicQuestions = allQuestions.filter((q) => q.topicId === targetQ.topicId);
  const idx = topicQuestions.findIndex((q) => q.id === questionId);
  return {
    position: idx >= 0 ? idx + 1 : 1,
    total: Math.max(1, topicQuestions.length),
  };
}
