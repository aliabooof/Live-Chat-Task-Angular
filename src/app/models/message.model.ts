import { User } from "./user.model";

export enum MessageType {
  Text = 0,
  Image = 1,
  Document = 2,
  Voice = 3,
  System = 4
}
export interface ChatMessage {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  isSent?: boolean;
  isSeen?: boolean;
  senderId: string;
  receiverId: string;
  sender?: User;
  receiver: User;
  fileName?: string;
  filePath?: string;
  voiceDurationSeconds?: number;
}