import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { FirebaseService, GameRoomWithArray, Player } from '../../services/firebase.service';
import { Subscription } from 'rxjs';
import { GameResultComponent } from '../game-result/game-result.component';

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent, GameResultComponent],
  templateUrl: './game-room.component.html',
  styleUrls: ['./game-room.component.scss']
})
export class GameRoomComponent implements OnInit, OnDestroy {
  roomCode: string = '';
  players: Player[] = [];
  currentWord: string = '';
  isUndercover: boolean = false;
  hasVoted: boolean = false;
  timeRemaining: number = 60;
  currentPlayerId: string = '';
  isLoading: boolean = true;
  room: GameRoomWithArray | null = null;
  showResult: boolean = false;
  private subscription: Subscription | null = null;
  private timerInterval: any;

  constructor(
    private firebaseService: FirebaseService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.roomCode = this.route.snapshot.params['roomCode'] || this.firebaseService.currentRoomCode || '';
    this.currentPlayerId = this.firebaseService.currentPlayerId || '';
    
    if (!this.roomCode) {
      this.router.navigate(['/']);
      return;
    }

    // Subscribe to room updates
    this.firebaseService.subscribeToRoom(this.roomCode);
    this.subscription = this.firebaseService.currentRoom.subscribe(room => {
      this.isLoading = false;
      if (room) {
        this.room = room;
        this.players = room.players;
        
        // Find current player
        const currentPlayer = room.players.find(p => p.id === this.currentPlayerId);
        if (currentPlayer) {
          this.isUndercover = currentPlayer.isUndercover || false;
          this.currentWord = this.isUndercover ? room.undercoverWord || '' : room.currentWord || '';
        }

        // Start timer based on server time
        if (room.status === 'playing') {
          if (room.startTime) {
            const elapsedTime = Math.floor((Date.now() - room.startTime) / 1000);
            this.timeRemaining = Math.max(0, 60 - elapsedTime);
          }
          this.startTimer();
        }

        // Check if current player has voted
        if (room.votes && room.votes[this.currentPlayerId]) {
          this.hasVoted = true;
        } else {
          this.hasVoted = false;
        }

        // Handle game end or second chance
        if (room.status === 'finished' || room.gameResult === 'second_chance') {
          this.handleGameEnd(room);
        }
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  async submitVote(votedForId: string): Promise<void> {
    try {
      await this.firebaseService.submitVote(this.roomCode, this.currentPlayerId, votedForId);
      this.hasVoted = true;
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to submit vote. Please try again.');
    }
  }

  private handleGameEnd(room: GameRoomWithArray): void {
    clearInterval(this.timerInterval);
    this.showResult = true;

    if (room.gameResult === 'second_chance') {
      // Reset for second chance
      this.hasVoted = false;
      this.timeRemaining = 60;
      this.startTimer();
      
      // Hide result after 3 seconds only if it's a second chance
      setTimeout(() => {
        this.showResult = false;
      }, 3000);
    } else if (room.status === 'finished') {
      // Show final results when game ends
      this.showResult = true;
    }
  }

  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
      } else {
        clearInterval(this.timerInterval);
        // When timer reaches 0, enable voting if not already voted
        if (!this.hasVoted) {
          this.hasVoted = false;
        }
      }
    }, 1000);
  }
}
