import { MultiDeviceRoom, MultiDevicePlayer, MultiDeviceAnswer, Question } from '../types';
import * as fbLive from './firebase';

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
  fbUnsubRoom?: () => void;
  fbUnsubPlayers?: () => void;
  fbUnsubAnswers?: () => void;
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

// Static hosting detection
export function detectIsStaticHosting(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.includes('vercel.app') || host.includes('netlify.app') || host.includes('github.io');
}

/**
 * Returns the base URL for the backend server (e.g. Render server or local development).
 * Priority:
 * 1. Saved custom URL in localStorage ('stam_custom_live_server_url')
 * 2. Vite environment variable ('VITE_LIVE_SERVER_URL')
 * 3. window.location.origin (if running in AI Studio or locally with server.ts)
 */
export function getLiveServerBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('stam_custom_live_server_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  const envUrl = (import.meta as any).env?.VITE_LIVE_SERVER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (!detectIsStaticHosting()) {
    return window.location.origin;
  }
  return '';
}

export function setCustomLiveServerUrl(url: string) {
  if (typeof window === 'undefined') return;
  const clean = url.trim().replace(/\/+$/, '');
  if (clean) {
    localStorage.setItem('stam_custom_live_server_url', clean);
    activeMode = 'server';
  } else {
    localStorage.removeItem('stam_custom_live_server_url');
    activeMode = detectIsStaticHosting() ? 'firebase' : 'auto';
  }
  if (socket) {
    try {
      socket.close();
    } catch {}
    socket = null;
  }
  initWebSocketIfNeeded();
}

export function hasLiveServerConfigured(): boolean {
  const url = getLiveServerBaseUrl();
  return Boolean(url && url.length > 0);
}

function determineInitialMode(): 'auto' | 'server' | 'firebase' {
  if (typeof window === 'undefined') return 'auto';
  const serverUrl = getLiveServerBaseUrl();
  if (serverUrl) {
    return 'server';
  }
  return detectIsStaticHosting() ? 'firebase' : 'auto';
}

let activeMode: 'auto' | 'server' | 'firebase' = determineInitialMode();

export function getActiveLiveMode(): 'server' | 'firebase' {
  return activeMode === 'server' ? 'server' : 'firebase';
}

// Pending answer promises map: `questionIndex_playerId` -> resolve callback
const pendingAnswerResolvers = new Map<string, (result: { pointsEarned: number; newStreak: number }) => void>();

export function getHttpUrl(path: string): string {
  const base = getLiveServerBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

export function getWsUrl(): string {
  if (typeof window === 'undefined') return '';
  const base = getLiveServerBaseUrl();
  if (base) {
    try {
      const parsed = new URL(base);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${parsed.host}/ws/live`;
    } catch {
      // fallback
    }
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/live`;
}

export function initWebSocketIfNeeded() {
  if (typeof window === 'undefined') return;
  if (activeMode === 'firebase') return; // Do not open WS in pure Firestore mode
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const serverUrl = getLiveServerBaseUrl();
  if (!serverUrl && detectIsStaticHosting()) {
    activeMode = 'firebase';
    return;
  }

  try {
    const wsUrl = getWsUrl();
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      activeMode = 'server';
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

    socket.onerror = () => {
      // Handled silently
    };

    socket.onclose = () => {
      clearInterval(pingTimer);
      // Auto reconnect after 2 seconds if still in server mode
      if (activeMode !== 'firebase') {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          initWebSocketIfNeeded();
        }, 2000);
      }
    };
  } catch (err) {
    console.warn('Could not initialize WebSocket:', err);
  }
}

// REST fallback polling for server mode
async function pollRoomState(roomCode: string) {
  if (activeMode === 'firebase') return;
  const code = roomCode.toUpperCase();
  const sub = subscriptions.get(code);
  if (!sub) return;

  try {
    const res = await fetch(getHttpUrl(`/api/live/rooms/${code}`));
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html') || !contentType.includes('application/json')) {
      switchToFirebaseMode(code);
      return;
    }
    const data = await res.json();
    if (data.success) {
      sub.lastRoom = data.room;
      sub.lastPlayers = data.players || [];
      sub.lastAnswers = data.answers || [];

      sub.roomCallbacks.forEach((cb) => cb(sub.lastRoom));
      sub.playersCallbacks.forEach((cb) => cb(sub.lastPlayers));
      sub.answersCallbacks.forEach((cb) => cb(sub.lastAnswers));
    } else if (res.status === 404) {
      // Room was closed or deleted
      sub.roomCallbacks.forEach((cb) => cb(null));
    }
  } catch (err) {
    // Non-blocking offline or network glitch
  }
}

function switchToFirebaseMode(roomCode?: string) {
  activeMode = 'firebase';
  if (socket) {
    try {
      socket.close();
    } catch {}
    socket = null;
  }
  clearInterval(pingTimer);
  clearTimeout(reconnectTimer);

  if (roomCode) {
    const code = roomCode.toUpperCase();
    const sub = subscriptions.get(code);
    if (sub) {
      if (sub.pollInterval) {
        clearInterval(sub.pollInterval);
        sub.pollInterval = null;
      }
      // Attach Firebase live listeners if not already attached
      if (!sub.fbUnsubRoom) {
        sub.fbUnsubRoom = fbLive.subscribeToLiveChallengeRoom(
          code,
          (room) => {
            sub.lastRoom = room;
            sub.roomCallbacks.forEach((cb) => cb(room));
          },
          (err) => sub.errorCallbacks.forEach((cb) => cb(err))
        );
      }
      if (!sub.fbUnsubPlayers) {
        sub.fbUnsubPlayers = fbLive.subscribeToLiveChallengePlayers(
          code,
          (players) => {
            sub.lastPlayers = players;
            sub.playersCallbacks.forEach((cb) => cb(players));
          },
          (err) => sub.errorCallbacks.forEach((cb) => cb(err))
        );
      }
      if (!sub.fbUnsubAnswers) {
        sub.fbUnsubAnswers = fbLive.subscribeToLiveChallengeAnswers(
          code,
          (answers) => {
            sub.lastAnswers = answers;
            sub.answersCallbacks.forEach((cb) => cb(answers));
          },
          (err) => sub.errorCallbacks.forEach((cb) => cb(err))
        );
      }
    }
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

    if (activeMode === 'firebase') {
      switchToFirebaseMode(code);
    } else {
      // Initial fetch via HTTP
      pollRoomState(code);

      // Poll fallback every 1.5 seconds if socket is not open
      sub.pollInterval = setInterval(() => {
        if (activeMode === 'firebase') {
          clearInterval(sub?.pollInterval);
          return;
        }
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          pollRoomState(code);
        }
      }, 1500);
    }
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
  // If no server configured on static hosting or in Firebase mode, use Firestore directly
  const serverUrl = getLiveServerBaseUrl();
  if (activeMode === 'firebase' || (!serverUrl && detectIsStaticHosting())) {
    return fbLive.createLiveChallengeRoom(params);
  }

  try {
    const res = await fetch(getHttpUrl('/api/live/rooms/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const contentType = res.headers.get('content-type') || '';
    // If Vercel or any static host rewrote the request to HTML or endpoint is missing
    if (!res.ok || contentType.includes('text/html') || !contentType.includes('application/json')) {
      console.warn('Server live endpoint unavailable or returned HTML, switching to Firebase mode.');
      switchToFirebaseMode();
      return fbLive.createLiveChallengeRoom(params);
    }

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Gagal mencipta bilik.' };
    }

    activeMode = 'server';
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
    console.warn('Server live create failed, falling back to Firebase mode:', err);
    switchToFirebaseMode();
    return fbLive.createLiveChallengeRoom(params);
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
  const cleanCode = params.roomCode.trim().toUpperCase();
  const serverUrl = getLiveServerBaseUrl();

  if (activeMode === 'firebase' || (!serverUrl && detectIsStaticHosting())) {
    return fbLive.joinLiveChallengeRoom({
      roomCode: cleanCode,
      playerId: params.playerId,
      playerName: params.playerName,
      schoolOrClass: params.schoolOrClass,
      avatar: params.avatar || '🧑‍🎓',
    });
  }

  try {
    const res = await fetch(getHttpUrl('/api/live/rooms/join'), {
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

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html') || !contentType.includes('application/json')) {
      console.warn('Server join endpoint unavailable or returned HTML, switching to Firebase mode.');
      switchToFirebaseMode(cleanCode);
      return fbLive.joinLiveChallengeRoom({
        roomCode: cleanCode,
        playerId: params.playerId,
        playerName: params.playerName,
        schoolOrClass: params.schoolOrClass,
        avatar: params.avatar || '🧑‍🎓',
      });
    }

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Bilik tidak ditemui.' };
    }

    activeMode = 'server';
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
    console.warn('Server live join failed, falling back to Firebase mode:', err);
    switchToFirebaseMode(cleanCode);
    return fbLive.joinLiveChallengeRoom({
      roomCode: cleanCode,
      playerId: params.playerId,
      playerName: params.playerName,
      schoolOrClass: params.schoolOrClass,
      avatar: params.avatar || '🧑‍🎓',
    });
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

  if (activeMode === 'firebase') {
    return fbLive.updateChallengeRoomStatus(cleanCode, update);
  }

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
    const res = await fetch(getHttpUrl('/api/live/rooms/status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: cleanCode,
        ...update,
      }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html') || !contentType.includes('application/json')) {
      switchToFirebaseMode(cleanCode);
      return fbLive.updateChallengeRoomStatus(cleanCode, update);
    }
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch {
    switchToFirebaseMode(cleanCode);
    return fbLive.updateChallengeRoomStatus(cleanCode, update);
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

  if (activeMode === 'firebase') {
    return fbLive.submitLiveChallengeAnswer(params);
  }

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
    const res = await fetch(getHttpUrl('/api/live/rooms/answer'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: cleanCode,
        ...params,
      }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html') || !contentType.includes('application/json')) {
      switchToFirebaseMode(cleanCode);
      return fbLive.submitLiveChallengeAnswer(params);
    }
    const data = await res.json();
    if (data.success) {
      return {
        success: true,
        pointsEarned: data.pointsEarned ?? pointsEarned,
        newStreak: data.newStreak ?? newStreak,
      };
    }
  } catch {
    switchToFirebaseMode(cleanCode);
    return fbLive.submitLiveChallengeAnswer(params);
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

  if (activeMode === 'firebase') {
    return fbLive.subscribeToLiveChallengeRoom(cleanCode, onRoomUpdate, onError);
  }

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

  if (activeMode === 'firebase') {
    return fbLive.subscribeToLiveChallengePlayers(cleanCode, onPlayersUpdate, onError);
  }

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

  if (activeMode === 'firebase') {
    return fbLive.subscribeToLiveChallengeAnswers(cleanCode, onAnswersUpdate, onError);
  }

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
    if (sub.fbUnsubRoom) sub.fbUnsubRoom();
    if (sub.fbUnsubPlayers) sub.fbUnsubPlayers();
    if (sub.fbUnsubAnswers) sub.fbUnsubAnswers();
    subscriptions.delete(roomCode);
  }
}
