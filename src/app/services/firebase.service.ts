import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  get,
  remove,
  update
} from 'firebase/database';
import { BehaviorSubject } from 'rxjs';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  hasVoted: boolean;
  vote: string | null;
  isUndercover: boolean;
}

export interface GameRoom {
  roomCode: string;
  host: string;
  players: {
    [key: string]: {
      name: string;
      isHost: boolean;
      hasVoted: boolean;
      vote: string | null;
      isUndercover: boolean;
    };
  };
  status: 'waiting' | 'playing' | 'finished';
  category: string;
  currentWord?: string;
  undercoverWord?: string;
  round: number;
  votes: {
    [key: string]: string;
  };
  undercoverId?: string;
  startTime?: number;
  gameResult?: 'undercover_eliminated' | 'second_chance';
  eliminatedPlayerId?: string;
  undercoverEliminated?: boolean;
}

export interface GameRoomWithArray extends Omit<GameRoom, 'players'> {
  players: Player[];
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private database: any;
  currentRoom = new BehaviorSubject<GameRoomWithArray | null>(null);
  currentPlayerId: string | null = null;
  currentRoomCode: string | null = null;

  constructor() {
    const firebaseConfig = {
      apiKey: 'AIzaSyDqGHaKPyrwBaB4BMxWXkMy6NLvL9kNPTU',
      authDomain: 'undercover-game-7f461.firebaseapp.com',
      projectId: 'undercover-game-7f461',
      storageBucket: 'undercover-game-7f461.firebasestorage.app',
      messagingSenderId: '45464305326',
      appId: '1:45464305326:web:cb915c42c682b9d46b773f'
    };

    const app = initializeApp(firebaseConfig);
    this.database = getDatabase(app);
  }

  // ✅ Create Room (Host)
  createRoom(hostName: string, category: string): Promise<string> {
    const roomCode = this.generateRoomCode();
    const roomRef = ref(this.database, `rooms/${roomCode}`);
    const roomId = push(ref(this.database, 'rooms')).key;

    const newRoom: GameRoom = {
      roomCode,
      host: hostName,
      players: {
        [roomId!]: {
          name: hostName,
          isHost: true,
          hasVoted: false,
          vote: null,
          isUndercover: false
        }
      },
      status: 'waiting',
      category,
      round: 1,
      votes: {}
    };

    this.currentPlayerId = roomId!;
    this.currentRoomCode = roomCode;

    return set(roomRef, newRoom).then(() => roomCode);
  }

  // ✅ Join Room
  async joinRoom(roomCode: string, playerName: string): Promise<void> {
    const roomRef = ref(this.database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      throw new Error('Room not found. Please check the room code and try again.');
    }

    const room = snapshot.val();
    if (room.status !== 'waiting') {
      throw new Error('Game has already started. Please create a new room.');
    }

    // Generate unique ID for new player
    const playerId = push(ref(this.database, `rooms/${roomCode}/players`)).key!;
    const playerRef = ref(this.database, `rooms/${roomCode}/players/${playerId}`);

    await set(playerRef, {
      name: playerName,
      isHost: false,
      hasVoted: false,
      vote: null,
      isUndercover: false
    });

    this.currentPlayerId = playerId;
    this.currentRoomCode = roomCode;
  }

  // ✅ Start Game
  async startGame(roomCode: string): Promise<void> {
    const roomRef = ref(this.database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      throw new Error('Room not found.');
    }

    const roomData = snapshot.val() as GameRoom;
    const playerIds = Object.keys(roomData.players);

    // Randomly select an undercover player
    const undercoverIndex = Math.floor(Math.random() * playerIds.length);
    const undercoverId = playerIds[undercoverIndex];

    // Assign words to all players
    const { currentWord, undercoverWord } = this.assignWords(roomData.category);

    // Update players to mark one as the undercover
    const updatedPlayers = Object.entries(roomData.players).reduce(
      (acc, [id, player]) => {
        acc[id] = {
          ...player,
          isUndercover: id === undercoverId
        };
        return acc;
      },
      {} as GameRoom['players']
    );

    // Update game state
    await update(roomRef, {
      status: 'playing',
      currentWord,
      undercoverWord,
      undercoverId,
      startTime: Date.now(),
      players: updatedPlayers,
      votes: {}
    });
  }

  // ✅ Submit Vote
  async submitVote(roomCode: string, playerId: string, votedForId: string): Promise<void> {
    try {
      const roomRef = ref(this.database, `rooms/${roomCode}`);
      const roomSnapshot = await get(roomRef);
      
      if (roomSnapshot.exists()) {
        const roomData = roomSnapshot.val() as GameRoom;
        const votes = roomData.votes || {};
        votes[playerId] = votedForId;
        
        // Check if all players have voted
        const playerIds = Object.keys(roomData.players);
        const votedPlayerIds = Object.keys(votes);

        // Check if all players except eliminated have voted
        const allVoted = playerIds.every((id) => {
          // Skip eliminated player
          if (roomData.eliminatedPlayerId === id) {
            return true;
          }
          return votedPlayerIds.includes(id);
        });
        
        if (allVoted) {
          // Count votes
          const voteCounts: { [key: string]: number } = {};
          Object.values(votes).forEach(votedId => {
            voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
          });
          
          // Find player with most votes
          let maxVotes = 0;
          let eliminatedPlayerId = '';
          Object.entries(voteCounts).forEach(([playerId, count]) => {
            if (count > maxVotes) {
              maxVotes = count;
              eliminatedPlayerId = playerId;
            }
          });
          
          // Check if undercover was eliminated
          const undercoverEliminated = eliminatedPlayerId === roomData.undercoverId;
          
          if (undercoverEliminated) {
            // Undercover eliminated - game over
            await update(roomRef, {
              votes,
              status: 'finished',
              eliminatedPlayerId,
              undercoverEliminated,
              gameResult: 'undercover_eliminated'
            });
          } else if (roomData.round === 1) {
            // Give second chance - clear votes and reset
            await update(roomRef, {
              votes: {}, // Reset votes for second chance
              round: 2, // Move to second round
              startTime: Date.now(),
              eliminatedPlayerId,
              undercoverEliminated,
              gameResult: 'second_chance'
            });
          } else {
            // End the game after the second round
            await update(roomRef, {
              votes,
              status: 'finished',
              eliminatedPlayerId,
              undercoverEliminated,
              gameResult: 'undercover_eliminated'
            });
          }
        } else {
          // Just update votes
          await update(roomRef, { votes });
        }
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  }

  // ✅ Subscribe to Room Updates
  subscribeToRoom(roomCode: string): void {
    const roomRef = ref(this.database, `rooms/${roomCode}`);

    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert players object to array if it exists
        const playersArray = data.players
          ? Object.entries(data.players).map(([id, player]: [string, any]) => ({
              id,
              name: player.name,
              isHost: player.isHost,
              hasVoted: player.hasVoted || false,
              vote: player.vote || null,
              isUndercover: player.isUndercover || false
            }))
          : [];

        const roomWithArray: GameRoomWithArray = {
          ...data,
          players: playersArray
        };

        this.currentRoom.next(roomWithArray);
      } else {
        this.currentRoom.next(null);
      }
    });
  }

  // ✅ End Game and Reveal Results
  async endGame(roomCode: string): Promise<void> {
    const roomRef = ref(this.database, `rooms/${roomCode}`);
    await update(roomRef, { status: 'finished' });
  }

  // ✅ Generate Room Code
  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  resetVotes(roomCode: string): Promise<void> {
    const roomRef = ref(this.database, `rooms/${roomCode}/votes`);
    return set(roomRef, {});
  }
  
  // ✅ Assign Words Based on Category
  private assignWords(category: string): { currentWord: string; undercoverWord: string } {
    const words = {
      'Bible Characters': [
        { currentWord: 'Moses', undercoverWord: 'Abraham' },
        { currentWord: 'David', undercoverWord: 'Solomon' }
      ],
      Fun: [
        { currentWord: 'Beach', undercoverWord: 'Pool' },
        { currentWord: 'Pizza', undercoverWord: 'Burger' }
      ],
      Celebrities: [
        { currentWord: 'Cin Bawi', undercoverWord: 'Moses Pau' },
        { currentWord: 'Mah Suh', undercoverWord: 'YZK Pau' }
      ],
      Places: [
        { currentWord: 'Paris', undercoverWord: 'London' },
        { currentWord: 'New York', undercoverWord: 'Zogam' }
      ],
      CMC_Youth: [
        { currentWord: 'Mary', undercoverWord: 'Mangno' },
        { currentWord: 'Biak Hong', undercoverWord: 'Mangno' },
        { currentWord: 'Niang Sian Nem', undercoverWord: 'Mangno' },
        { currentWord: 'Nuam Ba-wee', undercoverWord: 'Mangno' },
        { currentWord: 'Little Sungsung', undercoverWord: 'Mangno' },
        { currentWord: 'Sungsung (not the pretty one)', undercoverWord: 'Mangno' },
        { currentWord: 'Koppi', undercoverWord: 'Mangno' },
        { currentWord: 'Khaipi', undercoverWord: 'Mangno' },
        { currentWord: 'Lunnu', undercoverWord: 'Mangno' },
        { currentWord: 'Muamuan', undercoverWord: 'Mangno' },
        { currentWord: 'Thangpi', undercoverWord: 'Mangno' },
        { currentWord: 'Nempi', undercoverWord: 'Mangno' },
        { currentWord: 'BenBen', undercoverWord: 'Mangno' }
      ],
      CMC_Papi: [
        { currentWord: 'Sawm Pau', undercoverWord: 'Singpi' },
        { currentWord: 'Pau Piang', undercoverWord: 'Singpi' },
        { currentWord: 'Pa Piang', undercoverWord: 'Singpi' },
        { currentWord: 'Pa Thawngpi', undercoverWord: 'Singpi' },
        { currentWord: 'Pa Mangno', undercoverWord: 'Singpi' },
        { currentWord: 'Pa Mung (U Mung)', undercoverWord: 'Singpi' },
        { currentWord: 'Pa piang', undercoverWord: 'Singpi' },
        { currentWord: 'Pa Cin Tawng', undercoverWord: 'Singpi' },
        { currentWord: 'Pa Lian Bawi', undercoverWord: 'Singpi' },
        { currentWord: 'Sia Pau Tawng', undercoverWord: 'Singpi' }
      ],
      Food: [
        { currentWord: 'Sushi', undercoverWord: 'Vaimim' },
        { currentWord: 'Gatam', undercoverWord: 'Ngapik' }
      ]
    };

    const categoryWords = words[category as keyof typeof words] || words['Fun'];
    return categoryWords[Math.floor(Math.random() * categoryWords.length)];
  }
}
