
export enum Language {
  ENGLISH = 'English',
  HAUSA = 'Hausa',
  IGBO = 'Igbo',
  YORUBA = 'Yoruba',
  PIDGIN = 'Nigerian Pidgin'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface NavAction {
  name: string;
  url: string;
}
