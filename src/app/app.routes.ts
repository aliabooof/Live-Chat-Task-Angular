import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { UserChatComponent } from './components/user-chat/user-chat.component';

export const routes: Routes = [
    { path: '', redirectTo: '/chat', pathMatch: 'full' },
  { path: 'admin', component: AdminDashboardComponent },
  { path: 'chat', component: UserChatComponent },
  { path: '**', redirectTo: '/chat' }
];
