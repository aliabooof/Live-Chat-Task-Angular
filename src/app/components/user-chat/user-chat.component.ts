import { Component, OnInit, OnDestroy } from '@angular/core';
import { SignalRService } from '../../services/signal-r.service';
import { ChatService } from '../../services/chat.service';
import { ChatMessage, MessageType } from '../../models/message.model';
import { ChatSettings } from '../../models/chat-settings.model';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-user-chat',
  standalone:true,
  imports: [FormsModule,CommonModule],
  templateUrl: './user-chat.component.html',
  styleUrl: './user-chat.component.css'
})


export class UserChatComponent implements OnInit, OnDestroy {

  username = '';
  isConnected = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  settings: ChatSettings = { maxCharacters: 500, maxVoiceMinutes: 5, inactivityTimeoutMinutes: 1 };
  isRecording = false;
  recordingTimer = 0;
  apiUrl=environment.apiUrl;
  private currentUserId = '';
  private subscriptions: Subscription[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private recordingInterval: any;

  constructor(
    private signalRService: SignalRService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.signalRService.stopConnection();
  }

  private setupSubscriptions(): void {
    const messagesSub = this.signalRService.messages$.subscribe(messages => {
      this.messages = messages;
    });

    const connectionSub = this.signalRService.connectionStatus$.subscribe(status => {
      this.isConnected = status;
    });

    this.subscriptions.push(messagesSub, connectionSub);
  }

  private loadSettings(): void {
    const settingsSub = this.chatService.getSettings().subscribe(settings => {
      this.settings = settings;
    });
    this.subscriptions.push(settingsSub);
  }

  private loadChatHistory(userId:string): void {
    const historySub = this.chatService.getChatHistory(userId,'55f810d5-138f-43db-ae79-32b4519a5929',).subscribe(messages => {
      this.messages = messages;
      this.signalRService.setMessages(messages); 
    });
    
    this.subscriptions.push(historySub);
  }
  
  async joinChat(): Promise<void> {
  if (!this.username.trim()) return;

  try {
    const user = await this.signalRService.startConnection(this.username, false);
    this.isConnected = true;

    
    this.loadChatHistory(user.id);
  } catch (error) {
    console.error("Failed to join chat:", error);
  }
}

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || !this.isConnected || this.newMessage.length > this.settings.maxCharacters) return;

    await this.signalRService.sendMessage('admin', this.newMessage, 'Text');
    this.newMessage = '';
  }

  onFileSelected(event: any, type: string): void {
    const file = event.target.files[0];
    if (!file || !this.isConnected) return;

    const uploadSub = this.chatService.uploadFile(file, type).subscribe(response => {
      this.signalRService.sendMessage('admin', response.filePath, type);
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
        
        const uploadSub = this.chatService.uploadFile(file, 'voice').subscribe(response => {
          this.signalRService.sendMessage('admin', response.filePath, 'Voice');
        });
        this.subscriptions.push(uploadSub);
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

  formatRecordingTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}