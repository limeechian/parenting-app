export interface UserInput {
  email: string;
  password: string;
  username: string;
}

export interface ChatInput {
  query: string;
  child_age?: number;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface ParentProfile {
  full_name: string;
  gender: string;
  age: number;
  phone_number?: string;
  education_level?: string;
  relationship_with_child: string;
  relationship_status: string;
  birthdate?: string;
  location?: string;
  occupation?: string;
  parenting_style?: string;
}

export interface ChildProfile {
  id?: string;
  name: string;
  gender: string;
  age: number;
  birthdate: string;
  education_level?: string;
  developmental_stage: string;
  special_needs?: string[];
  characteristics?: string[];
  current_challenges?: string[];
  special_notes?: string;
}