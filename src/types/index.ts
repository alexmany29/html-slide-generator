export interface Slide {
  id: string;
  title: string;
  htmlContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlideEditorProps {
  slides: Slide[];
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  onSlideUpdate: (slideId: string, updates: Partial<Slide>) => void;
  onSlideAdd: () => void;
  onSlideDelete: (slideId: string) => void;
  onSlideDuplicate: (slideId: string) => void;
}

export interface EditableTextProps {
  content: string;
  onChange: (content: string) => void;
  tag?: string;
  className?: string;
}