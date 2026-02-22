// DB format (snake_case) — matches Supabase schema
export interface DbSlide {
  id: string;
  presentation_id: string;
  title: string;
  html_content: string;
  slide_order: number;
  created_at: string;
  updated_at: string;
}

// UI format (camelCase) — used in components
export interface Slide {
  id: string;
  title: string;
  htmlContent: string;
  createdAt: Date;
  updatedAt: Date;
}

// Converters
export function dbSlideToUi(s: DbSlide): Slide {
  return {
    id: s.id,
    title: s.title,
    htmlContent: s.html_content || '',
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
  };
}

export function uiSlideToDbUpdates(updates: Partial<Slide>): Partial<DbSlide> {
  const db: Partial<DbSlide> = {};
  if (updates.title !== undefined) db.title = updates.title;
  if (updates.htmlContent !== undefined) db.html_content = updates.htmlContent;
  return db;
}

export interface EditableTextProps {
  content: string;
  onChange: (content: string) => void;
  tag?: string;
  className?: string;
}