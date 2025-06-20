export interface User {
  id: string;
  userName: string;
  isAdmin: boolean;
  isOnline: boolean;
  lastSeen: Date;
  connectionId?: string;
}