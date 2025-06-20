import { Component, OnInit, OnDestroy } from '@angular/core';
import { SignalRService } from '../../services/signal-r.service';
import { ChatService } from '../../services/chat.service';
import { User } from '../../models/user.model';
import { ChatMessage, MessageType } from '../../models/message.model';
import { ChatSettings } from '../../models/chat-settings.model';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule,CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})

export class AdminDashboardComponent implements OnInit, OnDestroy {
  activeUsers: User[] = [];
  selectedUser: User | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  settings: ChatSettings = { maxCharacters: 500, maxVoiceMinutes: 5, inactivityTimeoutMinutes: 1 };
  isRecording = false;
  recordingTimer = 0;
  apiUrl= environment.apiUrl;
  
  private subscriptions: Subscription[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private recordingInterval: any;

  constructor(
    private signalRService: SignalRService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.initializeAdmin();
    this.setupSubscriptions();
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.signalRService.stopConnection();
  }

  private async initializeAdmin(): Promise<void> {
    await this.signalRService.startConnection('admin', true);
  }

  private setupSubscriptions(): void {
    const usersSub = this.signalRService.activeUsers$.subscribe(users => {
      this.activeUsers = users;
    });

    const messagesSub = this.signalRService.messages$.subscribe(messages => {
      if (this.selectedUser) {
        this.messages = messages.filter(m => 
          (m.senderId === this.selectedUser!.id) || 
          (m.receiverId === this.selectedUser!.id)
        );
      }
    });

    this.subscriptions.push(usersSub, messagesSub);
  }

  private loadSettings(): void {
    const settingsSub = this.chatService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
    this.subscriptions.push(settingsSub);
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.loadChatHistory(user.id);
  }

  private loadChatHistory(userId:string): void {
    const historySub = this.chatService.getChatHistory('55f810d5-138f-43db-ae79-32b4519a5929', userId).subscribe(messages => {
      this.messages = messages;
      this.signalRService.setMessages(messages);
    });
    this.subscriptions.push(historySub);
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || !this.selectedUser) return;

    await this.signalRService.sendMessage(this.selectedUser.userName, this.newMessage, 'Text');
    this.newMessage = '';
  }

  onFileSelected(event: any, type: string): void {
    const file = event.target.files[0];
    if (!file || !this.selectedUser) return;

    const uploadSub = this.chatService.uploadFile(file, type).subscribe(response => {
      this.signalRService.sendMessage(this.selectedUser!.userName, response.filePath, type);
    });
    this.subscriptions.push(uploadSub);
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], 'voice-message.wav', { type: 'audio/wav' });
        
        if (this.selectedUser) {
          const uploadSub = this.chatService.uploadFile(file, 'voice').subscribe(response => {
            this.signalRService.sendMessage(this.selectedUser!.userName, response.filePath, 'Voice');
          });
          this.subscriptions.push(uploadSub);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingTimer = 0;
      
      this.recordingInterval = setInterval(() => {
        this.recordingTimer++;
        if (this.recordingTimer >= this.settings.maxVoiceMinutes * 60) {
          this.stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      clearInterval(this.recordingInterval);
      this.recordingTimer = 0;
    }
  }

  markAsSeen(message: ChatMessage): void {
    if (!message.isSeen) {
      this.signalRService.markMessageSeen(message.id);
    }
  }

  getMessageTypeLabel(type: MessageType): string {
    switch (type) {
      case MessageType.Text: return 'Text';
      case MessageType.Image: return 'Image';
      case MessageType.Document: return 'Document';
      case MessageType.Voice: return 'Voice';
      case MessageType.System: return 'System';
      default: return 'Unknown';
    }
  }

  formatRecordingTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
