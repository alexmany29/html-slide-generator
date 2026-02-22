
import { Slide } from '../types';
import { extractTextFromHtml } from '../utils/htmlParser';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarProps {
  slides: Slide[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
  onReorderSlides?: (slides: Slide[]) => void;
  readOnly?: boolean;
}

interface SortableSlideItemProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  onSlideSelect: (index: number) => void;
  readOnly?: boolean;
}

function SortableSlideItem({ slide, index, isActive, onSlideSelect, readOnly }: SortableSlideItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const htmlContent = slide.htmlContent || '';
  const previewText = extractTextFromHtml(htmlContent);
  const truncatedText = previewText.length > 120 
    ? previewText.substring(0, 120) + '...' 
    : previewText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full ${isDragging ? 'z-50' : ''}`}
    >
      <button
        onClick={() => onSlideSelect(index)}
        className={`w-full p-3 text-left rounded-lg border transition-all group relative ${
          isActive
            ? 'border-indigo-300 bg-indigo-50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-start space-x-3">
          {!readOnly && (
            <div
              {...attributes}
              {...listeners}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 mt-0.5"
              title="Arrastra para reordenar"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <circle cx="2" cy="2" r="1"/><circle cx="2" cy="5" r="1"/><circle cx="2" cy="8" r="1"/>
                <circle cx="6" cy="2" r="1"/><circle cx="6" cy="5" r="1"/><circle cx="6" cy="8" r="1"/>
              </svg>
            </div>
          )}

          <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
            isActive
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
          }`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-xs font-semibold truncate ${
              isActive ? 'text-indigo-900' : 'text-gray-900'
            }`}>
              {slide.title}
            </h3>
            <p className={`text-[11px] leading-relaxed mt-0.5 line-clamp-2 ${
              isActive ? 'text-indigo-600' : 'text-gray-500'
            }`}>
              {truncatedText || 'Slide vacia'}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

export default function Sidebar({ slides, currentSlideIndex, onSlideSelect, onReorderSlides, readOnly = false }: SidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id && onReorderSlides && !readOnly) {
      const oldIndex = slides.findIndex(slide => slide.id === active.id);
      const newIndex = slides.findIndex(slide => slide.id === over?.id);
      
      const reorderedSlides = arrayMove(slides, oldIndex, newIndex);
      
      // Update slide_order for each slide
      const slidesWithNewOrder = reorderedSlides.map((slide, index) => ({
        ...slide,
        slide_order: index
      }));
      
      onReorderSlides(slidesWithNewOrder);
      
      // Adjust current slide index if needed
      if (oldIndex === currentSlideIndex) {
        onSlideSelect(newIndex);
      } else if (oldIndex < currentSlideIndex && newIndex >= currentSlideIndex) {
        onSlideSelect(currentSlideIndex - 1);
      } else if (oldIndex > currentSlideIndex && newIndex <= currentSlideIndex) {
        onSlideSelect(currentSlideIndex + 1);
      }
    }
  }

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Slides</h2>
          <span className="text-xs text-gray-400 tabular-nums">{slides.length} slides</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={slides.map(slide => slide.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {slides.map((slide, index) => {
                const isActive = index === currentSlideIndex;
                return (
                  <SortableSlideItem
                    key={slide.id}
                    slide={slide}
                    index={index}
                    isActive={isActive}
                    onSlideSelect={onSlideSelect}
                    readOnly={readOnly}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}