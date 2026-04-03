export interface DiaryEntry {
  id: number;
  userId: number;
  title: string;
  content: string;
  mood: string | null;
  tags: string[];
  isFavorite: boolean;
  entryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDiaryEntryInput {
  title: string;
  content: string;
  mood: string | null;
  tags: string[];
  isFavorite: boolean;
  entryDate: Date;
}

export interface UpdateDiaryEntryInput {
  title: string;
  content: string;
  mood: string | null;
  tags: string[];
  isFavorite: boolean;
  entryDate: Date;
}

export interface DiaryEntryQuery {
  search?: string;
  mood?: string;
  tag?: string;
  favoriteOnly?: boolean;
  fromDate?: Date;
  toDate?: Date;
  limit: number;
  offset: number;
}
