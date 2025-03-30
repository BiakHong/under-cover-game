import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-join-room',
  standalone: true,
  imports: [FormsModule, CommonModule, QRCodeComponent],
  templateUrl: './join-room.component.html',
  styleUrls: ['./join-room.component.scss']
})
export class JoinRoomComponent implements OnInit {
  playerName: string = '';
  roomCode: string = '';
  roomCodeFromUrl: string = '';
  errorMessage: string = '';

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for room code in URL
    this.route.queryParams.subscribe((params) => {
      if (params['room']) {
        this.roomCodeFromUrl = params['room'];
        this.roomCode = params['room'];
      }
    });
  }

  isFormValid(): boolean {
    return this.playerName.trim().length > 0 && this.roomCode.trim().length > 0;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    try {
      await this.firebaseService.joinRoom(this.roomCode, this.playerName);
      this.router.navigate(['/lobby', this.roomCode]);
    } catch (error) {
      console.error('Error joining room:', error);
      this.errorMessage = 'Failed to join room. Please check the room code and try again.';
    }
  }
}
