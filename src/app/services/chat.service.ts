import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { ChatMessage } from '../models/message.model';
import { User } from '../models/user.model';
import { ChatSettings } from '../models/chat-settings.model';
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:20408/api/chat';

  constructor(private http: HttpClient) {}

  getActiveUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/active-users`);
  }

  getChatHistory(userId: string, contactId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/history/${userId}/${contactId}`);
  }

  uploadFile(file: File, type: string): Observable<{filePath: string}> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.http.post<{filePath: string}>(`${this.apiUrl}/upload`, formData);
  }

  getSettings(): Observable<ChatSettings> {
    return this.http.get<ChatSettings>(`${this.apiUrl}/settings`);
  }
}