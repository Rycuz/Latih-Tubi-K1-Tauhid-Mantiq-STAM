import { WebSocketServer, WebSocket } from 'ws';
import express, { Request, Response } from 'express';

export interface LivePlayer {
  id: string;
  name: string;
  schoolOrClass?: string;
  avatar?: string;
  joinedAt: string;
  score: number;
  streak: number;
  lastAnswerOption?: 'a' | 'b' | 'c' | 'd';
  lastAnswerTimeMs?: number;
  lastPointsEarned?: number;
  isHost?: boolean;
}

export interface LiveAnswer {
  playerId: string;
  playerName: string;
  questionIndex: number;
  selectedOption: 'a' | 'b' | 'c' | 'd';
  isCorrect: boolean;
  timeTakenSeconds: number;
  scoreEarned: number;
  answeredAt: string;
}

export interface LiveRoom {
  roomCode: string;
  title: string;
  subject?: 'all' | 'tauhid' | 'firaq' | 'mantiq';
  hostId: string;
  hostName: string;
  status: 'lobby' | 'active' | 'question_result' | 'finished';
  currentQuestionIndex: number;
  questionStartTime: number;
  timeLimitSeconds: number;
  questions: any[];
  createdAt: string;
  totalQuestions: number;
  lastActive: number;
  settledRanks?: Record<string, { rank: number; score: number }>;
}

interface RoomData {
  room: LiveRoom;
  players: Map<string, LivePlayer>;
  answers: Map<string, LiveAnswer>;
}

// In-memory multi-room storage
const activeRooms = new Map<string, RoomData>();
// Sockets per room
const roomSockets = new Map<string, Set<WebSocket>>();
// WeakMap to track client metadata
const socketInfo = new WeakMap<WebSocket, { roomCode?: string; playerId?: string; isHost?: boolean }>();

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure uniqueness
  if (activeRooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function getSortedPlayers(roomData: RoomData): LivePlayer[] {
  const list = Array.from(roomData.players.values());
  return list.sort((a, b) => b.score - a.score);
}

function broadcastToRoom(roomCode: string, payload: any) {
  const code = roomCode.toUpperCase();
  const sockets = roomSockets.get(code);
  if (!sockets) return;
  const data = JSON.stringify(payload);
  for (const client of sockets) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.warn('Error broadcasting to client:', err);
      }
    }
  }
}

export function broadcastRoomFullSync(roomCode: string) {
  const code = roomCode.toUpperCase();
  const roomData = activeRooms.get(code);
  if (!roomData) return;
  broadcastToRoom(code, {
    type: 'room_sync',
    room: roomData.room,
    players: getSortedPlayers(roomData),
    answers: Array.from(roomData.answers.values()),
  });
}

// Clean up stale rooms older than 3 hours
setInterval(() => {
  const now = Date.now();
  const THREE_HOURS = 3 * 60 * 60 * 1000;
  for (const [code, data] of activeRooms.entries()) {
    if (now - data.room.lastActive > THREE_HOURS) {
      activeRooms.delete(code);
      roomSockets.delete(code);
    }
  }
}, 30 * 60 * 1000);

export function setupLiveRoomEndpoints(app: express.Express) {
  // CREATE ROOM
  app.post('/api/live/rooms/create', (req: Request, res: Response) => {
    try {
      const { hostId, hostName, title, subject, questions, timeLimitSeconds, hostAvatar, avatar } = req.body;
      const roomCode = generateRoomCode();

      const newRoom: LiveRoom = {
        roomCode,
        title: title || 'Piala Dirasat Islamiyyah STAM',
        subject: subject || 'all',
        hostId: hostId || `host-${Date.now()}`,
        hostName: hostName || 'Guru Pembimbing',
        status: 'lobby',
        currentQuestionIndex: 0,
        questionStartTime: 0,
        timeLimitSeconds: Number(timeLimitSeconds) || 25,
        questions: Array.isArray(questions) ? questions : [],
        createdAt: new Date().toISOString(),
        totalQuestions: Array.isArray(questions) ? questions.length : 0,
        lastActive: Date.now(),
      };

      const playersMap = new Map<string, LivePlayer>();
      // Add host as first player/participant
      playersMap.set(newRoom.hostId, {
        id: newRoom.hostId,
        name: `${newRoom.hostName} (Host)`,
        avatar: hostAvatar || avatar || '🧑‍🏫',
        joinedAt: new Date().toISOString(),
        score: 0,
        streak: 0,
        isHost: true,
      });

      const roomData: RoomData = {
        room: newRoom,
        players: playersMap,
        answers: new Map<string, LiveAnswer>(),
      };

      activeRooms.set(roomCode, roomData);
      roomSockets.set(roomCode, new Set<WebSocket>());

      res.json({ success: true, roomCode, room: newRoom });
    } catch (err: any) {
      console.error('Failed to create live room:', err);
      res.status(500).json({ success: false, error: err.message || 'Gagal mencipta bilik live.' });
    }
  });

  // JOIN ROOM
  app.post('/api/live/rooms/join', (req: Request, res: Response) => {
    try {
      const { roomCode, playerId, playerName, schoolOrClass, avatar } = req.body;
      const cleanCode = (roomCode || '').trim().toUpperCase();
      const roomData = activeRooms.get(cleanCode);

      if (!roomData) {
        res.status(404).json({ success: false, error: 'Bilik tidak dijumpai atau telah tamat.' });
        return;
      }

      roomData.room.lastActive = Date.now();

      // Check existing or create player
      let player = roomData.players.get(playerId);
      if (!player) {
        player = {
          id: playerId,
          name: (playerName || 'Pelajar').trim(),
          schoolOrClass: (schoolOrClass || '').trim(),
          avatar: avatar || '🧑‍🎓',
          joinedAt: new Date().toISOString(),
          score: 0,
          streak: 0,
          isHost: false,
        };
        roomData.players.set(playerId, player);
      } else {
        player.name = (playerName || player.name).trim();
        if (schoolOrClass) player.schoolOrClass = schoolOrClass.trim();
        if (avatar) player.avatar = avatar;
      }

      broadcastRoomFullSync(cleanCode);

      res.json({
        success: true,
        room: roomData.room,
        players: getSortedPlayers(roomData),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Gagal menyertai bilik.' });
    }
  });

  // GET ROOM SNAPSHOT
  app.get('/api/live/rooms/:code', (req: Request, res: Response) => {
    const cleanCode = (req.params.code || '').trim().toUpperCase();
    const roomData = activeRooms.get(cleanCode);
    if (!roomData) {
      res.status(404).json({ success: false, error: 'Bilik tidak wujud.' });
      return;
    }
    res.json({
      success: true,
      room: roomData.room,
      players: getSortedPlayers(roomData),
      answers: Array.from(roomData.answers.values()),
    });
  });

  // UPDATE STATUS
  app.post('/api/live/rooms/status', (req: Request, res: Response) => {
    try {
      const { roomCode, status, currentQuestionIndex, questionStartTime, settledRanks } = req.body;
      const cleanCode = (roomCode || '').trim().toUpperCase();
      const roomData = activeRooms.get(cleanCode);

      if (!roomData) {
        res.status(404).json({ success: false, error: 'Bilik tidak dijumpai.' });
        return;
      }

      if (status) roomData.room.status = status;
      if (typeof currentQuestionIndex === 'number') roomData.room.currentQuestionIndex = currentQuestionIndex;
      if (typeof questionStartTime === 'number') roomData.room.questionStartTime = questionStartTime;
      if (settledRanks && typeof settledRanks === 'object') {
        roomData.room.settledRanks = settledRanks;
      }
      roomData.room.lastActive = Date.now();

      // If moved to a new question, optionally clear current answers pool for the new question
      if (status === 'active' && typeof currentQuestionIndex === 'number') {
        // Keep previous answers in memory or keep all answers
      }

      broadcastRoomFullSync(cleanCode);
      res.json({ success: true, room: roomData.room });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // SUBMIT ANSWER
  app.post('/api/live/rooms/answer', (req: Request, res: Response) => {
    try {
      const {
        roomCode,
        playerId,
        playerName,
        questionIndex,
        selectedOption,
        isCorrect,
        timeTakenSeconds,
        timeLimitSeconds,
        currentStreak,
      } = req.body;

      const cleanCode = (roomCode || '').trim().toUpperCase();
      const roomData = activeRooms.get(cleanCode);
      if (!roomData) {
        res.status(404).json({ success: false, error: 'Bilik tidak ditemui.' });
        return;
      }

      let pointsEarned = 0;
      let newStreak = 0;

      if (isCorrect) {
        newStreak = (Number(currentStreak) || 0) + 1;
        const totalLimit = Number(timeLimitSeconds) || roomData.room.timeLimitSeconds || 25;
        const fractionRemaining = Math.max(0, (totalLimit - Number(timeTakenSeconds || 0)) / totalLimit);
        const speedBonus = Math.round(fractionRemaining * 100);
        const streakBonus = Math.min(newStreak * 15, 45);
        pointsEarned = 100 + speedBonus + streakBonus;
      }

      const answerId = `${questionIndex}_${playerId}`;
      if (roomData.answers.has(answerId)) {
        const existing = roomData.answers.get(answerId)!;
        res.json({
          success: true,
          pointsEarned: existing.scoreEarned,
          newStreak: roomData.players.get(playerId)?.streak || 0,
          answer: existing,
        });
        return;
      }

      const answerData: LiveAnswer = {
        playerId,
        playerName,
        questionIndex,
        selectedOption,
        isCorrect: Boolean(isCorrect),
        timeTakenSeconds: Math.round((Number(timeTakenSeconds) || 0) * 10) / 10,
        scoreEarned: pointsEarned,
        answeredAt: new Date().toISOString(),
      };

      roomData.answers.set(answerId, answerData);

      // Update player score authoritatively by summing all answers for this player
      const player = roomData.players.get(playerId);
      if (player) {
        let totalPlayerScore = 0;
        for (const ans of roomData.answers.values()) {
          if (ans.playerId === playerId) {
            totalPlayerScore += (ans.scoreEarned || 0);
          }
        }
        player.score = totalPlayerScore;
        player.streak = newStreak;
        player.lastAnswerOption = selectedOption;
        player.lastPointsEarned = pointsEarned;
        player.lastAnswerTimeMs = Date.now();
      }

      roomData.room.lastActive = Date.now();

      broadcastRoomFullSync(cleanCode);

      res.json({
        success: true,
        pointsEarned,
        newStreak,
        answer: answerData,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

export function setupLiveWebSocketServer(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (message: string) => {
      try {
        const payload = JSON.parse(message.toString());
        const { type } = payload;

        if (type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (type === 'join_room') {
          const roomCode = String(payload.roomCode || '').trim().toUpperCase();
          const roomData = activeRooms.get(roomCode);
          if (!roomData) {
            ws.send(JSON.stringify({ type: 'error', message: 'Bilik tidak dijumpai.' }));
            return;
          }

          let sockets = roomSockets.get(roomCode);
          if (!sockets) {
            sockets = new Set<WebSocket>();
            roomSockets.set(roomCode, sockets);
          }
          sockets.add(ws);

          socketInfo.set(ws, {
            roomCode,
            playerId: payload.playerId,
            isHost: Boolean(payload.isHost),
          });

          if (payload.avatar && payload.playerId) {
            const p = roomData.players.get(payload.playerId);
            if (p) {
              p.avatar = payload.avatar;
            }
          }

          // Sync immediately to this client
          ws.send(JSON.stringify({
            type: 'room_sync',
            room: roomData.room,
            players: getSortedPlayers(roomData),
            answers: Array.from(roomData.answers.values()),
          }));
          return;
        }

        if (type === 'update_status') {
          const roomCode = String(payload.roomCode || '').trim().toUpperCase();
          const roomData = activeRooms.get(roomCode);
          if (roomData) {
            if (payload.status) roomData.room.status = payload.status;
            if (typeof payload.currentQuestionIndex === 'number') {
              roomData.room.currentQuestionIndex = payload.currentQuestionIndex;
            }
            if (typeof payload.questionStartTime === 'number') {
              roomData.room.questionStartTime = payload.questionStartTime;
            }
            roomData.room.lastActive = Date.now();
            broadcastRoomFullSync(roomCode);
          }
          return;
        }

        if (type === 'submit_answer') {
          const roomCode = String(payload.roomCode || '').trim().toUpperCase();
          const roomData = activeRooms.get(roomCode);
          if (roomData) {
            let pointsEarned = 0;
            let newStreak = 0;

            if (payload.isCorrect) {
              newStreak = (Number(payload.currentStreak) || 0) + 1;
              const totalLimit = Number(payload.timeLimitSeconds) || roomData.room.timeLimitSeconds || 25;
              const fractionRemaining = Math.max(0, (totalLimit - Number(payload.timeTakenSeconds || 0)) / totalLimit);
              const speedBonus = Math.round(fractionRemaining * 100);
              const streakBonus = Math.min(newStreak * 15, 45);
              pointsEarned = 100 + speedBonus + streakBonus;
            }

            const answerId = `${payload.questionIndex}_${payload.playerId}`;
            if (roomData.answers.has(answerId)) {
              return;
            }

            const answerData: LiveAnswer = {
              playerId: payload.playerId,
              playerName: payload.playerName,
              questionIndex: payload.questionIndex,
              selectedOption: payload.selectedOption,
              isCorrect: Boolean(payload.isCorrect),
              timeTakenSeconds: Math.round((Number(payload.timeTakenSeconds) || 0) * 10) / 10,
              scoreEarned: pointsEarned,
              answeredAt: new Date().toISOString(),
            };

            roomData.answers.set(answerId, answerData);

            const player = roomData.players.get(payload.playerId);
            if (player) {
              let totalPlayerScore = 0;
              for (const ans of roomData.answers.values()) {
                if (ans.playerId === payload.playerId) {
                  totalPlayerScore += (ans.scoreEarned || 0);
                }
              }
              player.score = totalPlayerScore;
              player.streak = newStreak;
              player.lastAnswerOption = payload.selectedOption;
              player.lastPointsEarned = pointsEarned;
              player.lastAnswerTimeMs = Date.now();
            }

            roomData.room.lastActive = Date.now();

            // Notify submitter of calculated points
            ws.send(JSON.stringify({
              type: 'answer_acknowledged',
              pointsEarned,
              newStreak,
              questionIndex: payload.questionIndex,
            }));

            broadcastRoomFullSync(roomCode);
          }
          return;
        }
      } catch (err) {
        console.warn('WS message error:', err);
      }
    });

    ws.on('close', () => {
      const info = socketInfo.get(ws);
      if (info && info.roomCode) {
        const sockets = roomSockets.get(info.roomCode);
        if (sockets) {
          sockets.delete(ws);
        }
      }
    });
  });
}
