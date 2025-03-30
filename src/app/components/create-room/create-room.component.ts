import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [FormsModule, CommonModule, QRCodeComponent],
  templateUrl: './create-room.component.html',
  styleUrls: ['./create-room.component.scss']
})
export class CreateRoomComponent {
  hostName: string = '';
  selectedCategory: string = '';
  roomCode: string = '';
  inviteLink: string = '';
  
  categories = [
    'Bible Characters',
    'CMC_Youth',
    'CMC_Papi',
    'Fun',
    'Celebrities',
    'Places',
    'Food'
  ];

  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  isFormValid(): boolean {
    return this.hostName.trim().length > 0 && this.selectedCategory.length > 0;
  }

  async onSubmit() {
    if (!this.isFormValid()) {
      return;
    }
  
    this.firebaseService.createRoom(this.hostName, this.selectedCategory).then((roomCode) => {
      this.roomCode = roomCode;
      this.inviteLink = `${window.location.origin}/join?room=${this.roomCode}`;
      
      // ✅ Navigate the host to the lobby after creating the room
      this.router.navigate(['/lobby', this.roomCode]);
    });
  }
  

  copyInviteLink(): void {
    navigator.clipboard.writeText(this.inviteLink)
      .then(() => {
        // Show success message
        alert('Invite link copied to clipboard!');
      })
      .catch(error => {
        console.error('Error copying to clipboard:', error);
      });
  }

  async startGame() {
    if (this.roomCode) {
      this.firebaseService.startGame(this.roomCode).then(() => {
        console.log('Game started!');
        // ✅ Navigate to game room after starting
        this.router.navigate(['/game', this.roomCode]);
      }).catch((error) => {
        console.error('Error starting game:', error);
        alert('Failed to start game. Please try again.');
      });
    }
  }
  
} 