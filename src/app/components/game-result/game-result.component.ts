import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameRoomWithArray, Player } from '../../services/firebase.service';

@Component({
  selector: 'app-game-result',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-result-overlay">
      <div class="game-result-content">
        <div *ngIf="room?.gameResult === 'second_chance'" class="second-chance">
          <h2>Second Chance!</h2>
          <p>{{ eliminatedPlayer?.name }} was eliminated!</p>
          <p>The Undercover survived!</p>
          <p>You have one more chance to find them!</p>
          <p class="countdown">Starting in {{ countdown }}...</p>
        </div>
        <div *ngIf="room?.gameResult === 'undercover_eliminated'" class="game-over">
          <h2>Game Over!</h2>
          <p>{{ undercoverPlayer?.name }} was the Undercover!</p>
          <p>Redirecting to home page...</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .game-result-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease-in-out;
    }

    .game-result-content {
      background-color: white;
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
      max-width: 90%;
      width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-in-out;
    }

    h2 {
      color: #2c3e50;
      margin-bottom: 1rem;
    }

    p {
      color: #34495e;
      margin: 0.5rem 0;
      font-size: 1.1rem;
    }

    .second-chance {
      color: #e74c3c;
    }

    .game-over {
      color: #27ae60;
    }

    .countdown {
      font-weight: bold;
      color: #e74c3c;
      margin-top: 1rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class GameResultComponent implements OnInit {
  @Input() room: GameRoomWithArray | null = null;
  eliminatedPlayer: Player | undefined;
  undercoverPlayer: Player | undefined;
  countdown: number = 3;

  constructor(private router: Router) {}

  ngOnInit() {
    if (this.room) {
      this.eliminatedPlayer = this.room.players.find(p => p.id === this.room?.eliminatedPlayerId);
      this.undercoverPlayer = this.room.players.find(p => p.isUndercover);

      if (this.room.gameResult === 'undercover_eliminated') {
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 3000);
      } else if (this.room.gameResult === 'second_chance') {
        // Start countdown for second chance
        const interval = setInterval(() => {
          this.countdown--;
          if (this.countdown <= 0) {
            clearInterval(interval);
          }
        }, 1000);
      }
    }
  }
} 