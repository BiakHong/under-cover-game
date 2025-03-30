import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { FirebaseService, GameRoomWithArray, Player } from '../../services/firebase.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss']
})
export class LobbyComponent implements OnInit, OnDestroy {
  room: GameRoomWithArray | null = null;
  isHost: boolean = false;
  playerName: string = '';
  roomCode: string = '';
  players: Player[] = [];
  inviteLink: string = '';
  private subscription: Subscription | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.firebaseService.currentRoomCode) {
      this.roomCode = this.firebaseService.currentRoomCode;
      this.inviteLink = `${window.location.origin}/join?room=${this.roomCode}`;
      this.firebaseService.subscribeToRoom(this.roomCode);
      this.subscription = this.firebaseService.currentRoom.subscribe((room) => {
        this.room = room;
        if (room) {
          this.players = room.players;

          // Check if current player is host
          const currentPlayer = this.players.find((p) => p.id === this.firebaseService.currentPlayerId);
          this.isHost = currentPlayer?.isHost || false;
          this.playerName = currentPlayer?.name || '';

          // ✅ Navigate to game room if the game starts
          if (room.status === 'playing') {
            this.router.navigate(['/game', this.roomCode]);
          }
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  startGame() {
    if (this.roomCode) {
      this.firebaseService
        .startGame(this.roomCode)
        .then(() => {
          console.log('Game started!');
          // Remove manual navigation - let the subscription handle it
        })
        .catch((error) => {
          console.error('Error starting game:', error);
          alert('Failed to start game. Please try again.');
        });
    }
  }
  
  

  leaveRoom() {
    this.router.navigate(['/']);
  }

  copyInviteLink() {
    navigator.clipboard
      .writeText(this.inviteLink)
      .then(() => {
        alert('Invite link copied to clipboard!');
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
      });
  }
}
