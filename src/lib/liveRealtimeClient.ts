import { MultiDeviceRoom, MultiDevicePlayer, MultiDeviceAnswer, Question } from '../types';

type RoomCallback = (room: MultiDeviceRoom | null) => void;
type PlayersCallback = (players: MultiDevicePlayer[]) => void;
type AnswersCallback = (answers: MultiDeviceAnswer[]) => void;
type ErrorCallback = (err: Error) => void;

interface RoomSubscription {
  roomCode: string;
  roomCallbacks: Set<RoomCallback>;
  playersCallbacks: Set<PlayersCallback>;
  answersCallbacks: Set<AnswersCallback>;
  errorCallbacks: Set<ErrorCallback>;
  lastRoom: MultiDeviceRoom | null;
  lastPlayers: MultiDevicePlayer[];
  lastAnswers: MultiDeviceAnswer[];
  pollInterval?: any;
}

// Track active subscriptions by roomCode
const subscriptions = new Map<string, RoomSubscription>();

// Shared WebSocket singleton
let socket: WebSocket | null = null;
let reconnectTimer: any = null;
let pingTimer: any = null;
let currentJoinedRoomCode: string | null = null;
let currentJoinedPlayerId: string | null = null;
let currentJoinedAvatar: string | null = null;
let isCurrentHost = false;

// Pending answer promises map: `questionIndex_playerId` -> resolve callback
const pendingAnswerResolvers = new Map<string, (result: { pointsEarned: number; newStreak: number }) => void>();

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/live`;
}

function initWebSocketIfNeeded() {
  if (typeof window === 'undefined') return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    const wsUrl = getWsUrl();
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Re-join current room if active
      if (currentJoinedRoomCode) {
        socket?.send(JSON.stringify({
          type: 'join_room',
          roomCode: currentJoinedRoomCode,
          playerId: currentJoinedPlayerId || 'player',
          avatar: currentJoinedAvatar || '🧑‍🎓',
          isHost: isCurrentHost,
        }));
      }

      // Heartbeat ping every 20s
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pong') return;

        if (msg.type === 'room_sync') {
          const room = msg.room as MultiDeviceRoom;
          const players = (msg.players || []) as MultiDevicePlayer[];
          const answers = (msg.answers || []) as MultiDeviceAnswer[];
          const code = (room?.roomCode || '').toUpperCase();

          const sub = subscriptions.get(code);
          if (sub) {
            sub.lastRoom = room;
            sub.lastPlayers = players;
            sub.lastAnswers = answers;

            sub.roomCallbacks.forEach((cb) => cb(room));
            sub.playersCallbacks.forEach((cb) => cb(players));
            sub.answersCallbacks.forEach((cb) => cb(answers));
          }
        }

        if (msg.type === 'answer_acknowledged') {
          const key = `${msg.questionIndex}_${currentJoinedPlayerId}`;
          const resolver = pendingAnswerResolvers.get(key);
          if (resolver) {
            resolver({ pointsEarned: msg.pointsEarned, newStreak: msg.newStreak });
            pendingAnswerResolvers.delete(key);
          }
        }
      } catch (e) {
        console.warn('Live client WS parse error:', e);
      }
    };

    socket.onerror = (e) => {
      console.warn('Live client WS error:', e);
    };

    socket.onclose = () => {
      clearInterval(pingTimer);
      // Auto reconnect after 2 seconds
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        initWebSocketIfNeeded();
      }, 2000);
    };
  } catch (err) {
    console.warn('Could not initialize WebSocket:', err);
  }
}

// REST fallback polling for robust resilience
async function pollRoomState(roomCode: string) {
  const code = roomCode.toUpperCase();
  const sub = subscriptions.get(code);
  if (!sub) return;

  try {
    const res = await fetch(`/api/live/rooms/${code}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        sub.lastRoom = data.room;
        sub.lastPlayers = data.players || [];
        sub.lastAnswers = data.answers || [];

        sub.roomCallbacks.forEach((cb) => cb(sub.lastRoom));
        sub.playersCallbacks.forEach((cb) => cb(sub.lastPlayers));
        sub.answersCallbacks.forEach((cb) => cb(sub.lastAnswers));
      }
    } else if (res.status === 404) {
      // Room was closed or deleted
      sub.roomCallbacks.forEach((cb) => cb(null));
    }
  } catch (err) {
    // Non-blocking offline or network glitch
  }
}

function getOrCreateSubscription(roomCode: string): RoomSubscription {
  const code = roomCode.toUpperCase();
  let sub = subscriptions.get(code);
  if (!sub) {
    sub = {
      roomCode: code,
      roomCallbacks: new Set(),
      playersCallbacks: new Set(),
      answersCallbacks: new Set(),
      errorCallbacks: new Set(),
      lastRoom: null,
      lastPlayers: [],
      lastAnswers: [],
    };
    subscriptions.set(code, sub);

    // Initial fetch via HTTP
    pollRoomState(code);

    // Poll fallback every 1.5 seconds if socket is not open
    sub.pollInterval = setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        pollRoomState(code);
      }
    }, 1500);
  }
  return sub;
}

/**
 * Host creates a new multi-device live challenge room
 */
export async function createLiveChallengeRoom(params: {
  hostId: string;
  hostName: string;
  title: string;
  subject?: 'all' | 'tauhid' | 'firaq' | 'mantiq';
  questions: Question[];
  timeLimitSeconds?: number;
  avatar?: string;
  hostAvatar?: string;
}): Promise<{ success: boolean; roomCode?: string; error?: string }> {
  try {
    const res = await fetch('/api/live/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Gagal mencipta bilik.' };
    }

    currentJoinedRoomCode = data.roomCode;
    currentJoinedPlayerId = params.hostId;
    currentJoinedAvatar = params.avatar || params.hostAvatar || '🧑‍🏫';
    isCurrentHost = true;

    initWebSocketIfNeeded();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'join_room',
        roomCode: data.roomCode,
        playerId: params.hostId,
        avatar: currentJoinedAvatar,
        isHost: true,
      }));
    }

    return { success: true, roomCode: data.roomCode };
  } catch (err: any) {
    console.error('Error creating live room:', err);
    return { success: false, error: err?.message || 'Ralat pelayan semasa mencipta bilik.' };
  }
}

/**
 * Student / Player joins an existing live room
 */
export async function joinLiveChallengeRoom(params: {
  roomCode: string;
  playerId: string;
  playerName: string;
  schoolOrClass?: string;
  avatar?: string;
}): Promise<{ success: boolean; room?: MultiDeviceRoom; error?: string }> {
  try {
    const cleanCode = params.roomCode.trim().toUpperCase();
    const res = await fetch('/api/live/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: cleanCode,
        playerId: params.playerId,
        playerName: params.playerName,
        schoolOrClass: params.schoolOrClass,
        avatar: params.avatar || '🧑‍🎓',
      }),
    });

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Bilik tidak ditemui.' };
    }

    currentJoinedRoomCode = cleanCode;
    currentJoinedPlayerId = params.playerId;
    currentJoinedAvatar = params.avatar || '🧑‍🎓';
    isCurrentHost = false;

    initWebSocketIfNeeded();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'join_room',
        roomCode: cleanCode,
        playerId: params.playerId,
        avatar: currentJoinedAvatar,
        isHost: false,
      }));
    }

    return { success: true, room: data.room };
  } catch (err: any) {
    console.error('Error joining live room:', err);
    return { success: false, error: err?.message || 'Gagal menyertai bilik.' };
  }
}

/**
 * Host updates room status (start game, next question, question result, finish)
 */
export async function updateChallengeRoomStatus(
  roomCode: string,
  update: Partial<MultiDeviceRoom>
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = roomCode.trim().toUpperCase();

  // Send via WebSocket if connected for zero-latency instant broadcast
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'update_status',
      roomCode: cleanCode,
      ...update,
    }));
  }

  // Also send via HTTP for server state persistence
  try {
    const res = await fetch('/api/live/rooms/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: cleanCode,
        ...update,
      }),
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
    return { success: true }; // Socket already broadcasted
  }
}

/**
 * Player submits an answer for current question
 */
export async function submitLiveChallengeAnswer(params: {
  roomCode: string;
  playerId: string;
  playerName: string;
  questionIndex: number;
  selectedOption: 'a' | 'b' | 'c' | 'd';
  isCorrect: boolean;
  timeTakenSeconds: number;
  timeLimitSeconds: number;
  currentStreak: number;
}): Promise<{ success: boolean; pointsEarned: number; newStreak: number; error?: string }> {
  const cleanCode = params.roomCode.trim().toUpperCase();

  // Optimistically compute locally first
  let pointsEarned = 0;
  let newStreak = 0;
  if (params.isCorrect) {
    newStreak = (Number(params.currentStreak) || 0) + 1;
    const fractionRemaining = Math.max(0, (params.timeLimitSeconds - params.timeTakenSeconds) / params.timeLimitSeconds);
    const speedBonus = Math.round(fractionRemaining * 100);
    const streakBonus = Math.min(newStreak * 15, 45);
    pointsEarned = 100 + speedBonus + streakBonus;
  }

  // Send via WS
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'submit_answer',
      roomCode: cleanCode,
      ...params,
    }));
  }

  // Also post via HTTP to ensure synchronization
  try {
    const res = await fetch('/api/live/rooms/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: cleanCode,
        ...params,
      }),
    });
    const data = await res.json();
    if (data.success) {
      return {
        success: true,
        pointsEarned: data.pointsEarned ?? pointsEarned,
        newStreak: data.newStreak ?? newStreak,
      };
    }
  } catch (err) {
    // Non-blocking if WS succeeded
  }

  return { success: true, pointsEarned, newStreak };
}

/**
 * Subscribe to Live Room changes (realtime state)
 */
export function subscribeToLiveChallengeRoom(
  roomCode: string,
  onRoomUpdate: (room: MultiDeviceRoom | null) => void,
  onError?: (err: Error) => void
): () => void {
  const cleanCode = roomCode.trim().toUpperCase();
  initWebSocketIfNeeded();

  const sub = getOrCreateSubscription(cleanCode);
  sub.roomCallbacks.add(onRoomUpdate);
  if (onError) sub.errorCallbacks.add(onError);

  // If we already have cached room, emit immediately
  if (sub.lastRoom) {
    onRoomUpdate(sub.lastRoom);
  }

  return () => {
    sub.roomCallbacks.delete(onRoomUpdate);
    if (onError) sub.errorCallbacks.delete(onError);
    cleanupSubscriptionIfEmpty(cleanCode);
  };
}

/**
 * Subscribe to Live Players in room
 */
export function subscribeToLiveChallengePlayers(
  roomCode: string,
  onPlayersUpdate: (players: MultiDevicePlayer[]) => void,
  onError?: (err: Error) => void
): () => void {
  const cleanCode = roomCode.trim().toUpperCase();
  initWebSocketIfNeeded();

  const sub = getOrCreateSubscription(cleanCode);
  sub.playersCallbacks.add(onPlayersUpdate);
  if (onError) sub.errorCallbacks.add(onError);

  if (sub.lastPlayers.length > 0) {
    onPlayersUpdate(sub.lastPlayers);
  }

  return () => {
    sub.playersCallbacks.delete(onPlayersUpdate);
    if (onError) sub.errorCallbacks.delete(onError);
    cleanupSubscriptionIfEmpty(cleanCode);
  };
}

/**
 * Subscribe to Live Answers for current question
 */
export function subscribeToLiveChallengeAnswers(
  roomCode: string,
  onAnswersUpdate: (answers: MultiDeviceAnswer[]) => void,
  onError?: (err: Error) => void
): () => void {
  const cleanCode = roomCode.trim().toUpperCase();
  initWebSocketIfNeeded();

  const sub = getOrCreateSubscription(cleanCode);
  sub.answersCallbacks.add(onAnswersUpdate);
  if (onError) sub.errorCallbacks.add(onError);

  if (sub.lastAnswers.length > 0) {
    onAnswersUpdate(sub.lastAnswers);
  }

  return () => {
    sub.answersCallbacks.delete(onAnswersUpdate);
    if (onError) sub.errorCallbacks.delete(onError);
    cleanupSubscriptionIfEmpty(cleanCode);
  };
}

function cleanupSubscriptionIfEmpty(roomCode: string) {
  const sub = subscriptions.get(roomCode);
  if (!sub) return;

  if (
    sub.roomCallbacks.size === 0 &&
    sub.playersCallbacks.size === 0 &&
    sub.answersCallbacks.size === 0
  ) {
    if (sub.pollInterval) {
      clearInterval(sub.pollInterval);
    }
    subscriptions.delete(roomCode);
  }
}
