import { Injectable } from '@angular/core';
import {HubConnection, HubConnectionBuilder} from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { ChatMessage } from '../models/message.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {

  private currentUser!: User;
  private hubConnection!: HubConnection;
  private isConnected = false;

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
   private activeUsersSubject = new BehaviorSubject<User[]>([]);
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);

  public messages$ = this.messagesSubject.asObservable();
  public activeUsers$ = this.activeUsersSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor() { 
    this.createConnection();
  }
private createConnection(): void {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl('http://localhost:20408/chathub')
      .build();

    this.setupEventListeners();
  }


  private setupEventListeners(): void {
    this.hubConnection.on('ReceiveMessage', (message: ChatMessage) => {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
    });

    this.hubConnection.on('MessageSent', (message: ChatMessage) => {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
    });

    this.hubConnection.on('MessageSeen', (messageId: string) => {
      const currentMessages = this.messagesSubject.value;
      const updatedMessages = currentMessages.map(msg => 
        msg.id === messageId ? { ...msg, isSeen: true } : msg
      );
      this.messagesSubject.next(updatedMessages);
    });


    this.hubConnection.on('UserJoined', (user: User) => {
      const currentUsers = this.activeUsersSubject.value;
      const existingUserIndex = currentUsers.findIndex(u => u.id === user.id);
      
      if (existingUserIndex >= 0) {
        currentUsers[existingUserIndex] = user;
      } else {
        currentUsers.push(user);
      }
      
      this.activeUsersSubject.next([...currentUsers]);
    });


     this.hubConnection.on('UserLeft', (user: User) => {
      const currentUsers = this.activeUsersSubject.value;
      const filteredUsers = currentUsers.filter(u => u.id !== user.id);
      this.activeUsersSubject.next(filteredUsers);
    });

    this.hubConnection.on('InactivityWarning', (message: string) => {
      alert(message);
    });

  }

  public async startConnection(username: string, isAdmin: boolean = false): Promise<User> {
  if (this.isConnected) return this.currentUser;

  try {
    await this.hubConnection.start();
    this.isConnected = true;
    this.connectionStatusSubject.next(true);

    const user: User = await this.hubConnection.invoke('JoinChat', username, isAdmin);
    this.currentUser = user;

    console.log('Connected as:', user);
    return user;

  } catch (error) {
    console.error('Error starting SignalR connection:', error);
    this.connectionStatusSubject.next(false);
    throw error;
  }
}

  public async sendMessage(receiverUsername: string, content: string, messageType: string): Promise<void> {
    if (!this.isConnected) {
    console.warn("SignalR is not connected.");
    return;
  }

  
  if (!receiverUsername || !content || !messageType) {
    console.error("Invalid parameters for sendMessage", {
      receiverUsername, content, messageType
    });
    return;
  }

  const payload = {
    receiverUsername,
    content,
    messageType
  };

  try {
    // Try to stringify before sending (client-side validation)
    const json = JSON.stringify(payload);
    console.log("Sending message payload:", json);

    await this.hubConnection.invoke('SendMessage', receiverUsername, content, messageType);
  } catch (err) {
    console.error("Error while preparing or sending message:", err);
  }


    
  }

  public async markMessageSeen(messageId: string): Promise<void> {
    if (this.isConnected) {
      await this.hubConnection.invoke('MarkMessageSeen', messageId);
    }
  }

  public async stopConnection(): Promise<void> {
    if (this.isConnected) {
      await this.hubConnection.stop();
      this.isConnected = false;
      this.connectionStatusSubject.next(false);
    }
  }

  
}
