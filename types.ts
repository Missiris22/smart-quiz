export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  phoneNumber: string;
  role: UserRole;
  expiryDate?: string; // ISO date string
  name?: string;
}

export enum QuestionType {
  SINGLE = 'SINGLE',
  MULTIPLE = 'MULTIPLE'
}

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: Option[];
  correctOptionIds: string[];
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  sourceFileName: string;
  createdAt: string;
  questions: Question[];
}

export interface PDFDocument {
  id: string;
  name: string;
  uploadDate: string;
  base64Data?: string; // Stored in IndexedDB to avoid localStorage quota limits
  associatedQuizId?: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  documents: PDFDocument[];
  quizzes: Quiz[];
}