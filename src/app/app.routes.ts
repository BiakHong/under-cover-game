import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { CreateRoomComponent } from './components/create-room/create-room.component';
import { JoinRoomComponent } from './components/join-room/join-room.component';
import { GameRoomComponent } from './components/game-room/game-room.component';
import { LobbyComponent } from './components/lobby/lobby.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'create', component: CreateRoomComponent },
  { path: 'join', component: JoinRoomComponent },
  { path: 'lobby/:roomCode', component: LobbyComponent },
  { path: 'game/:roomCode', component: GameRoomComponent },
  { path: '**', redirectTo: '' }
];
