export enum SpeakerType {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Transcript {
  id: string;
  text: string;
  speaker: SpeakerType;
  timestamp: Date;
  isPartial?: boolean;
}

export interface LiveState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}