
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

  const htmlContent = (slide as any).htmlContent || (slide as any).html_content || '';
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
        className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 group relative ${
          isActive
            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md transform scale-[1.02]'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start space-x-4">
          {/* Drag handle */}
          {!readOnly && (
            <div
              {...attributes}
              {...listeners}
              className={`flex-shrink-0 w-6 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing transition-all ${
                isActive 
                  ? 'text-blue-600 hover:text-blue-700' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Arrastra para reordenar"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="2" cy="2" r="1"/>
                <circle cx="6" cy="2" r="1"/>
                <circle cx="10" cy="2" r="1"/>
                <circle cx="2" cy="6" r="1"/>
                <circle cx="6" cy="6" r="1"/>
                <circle cx="10" cy="6" r="1"/>
                <circle cx="2" cy="10" r="1"/>
                <circle cx="6" cy="10" r="1"/>
                <circle cx="10" cy="10" r="1"/>
              </svg>
            </div>
          )}
          
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            isActive 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-gray-200 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700'
          }`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold truncate mb-1 ${
              isActive ? 'text-blue-900' : 'text-gray-900'
            }`}>
              {slide.title}
            </h3>
            <p className={`text-xs leading-relaxed ${
              isActive ? 'text-blue-700' : 'text-gray-600'
            }`}>
              {truncatedText || 'Slide vacía'}
            </p>
            <div className={`text-xs mt-2 ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`}>
              Actualizada: {new Date((slide as any).updatedAt || (slide as any).updated_at).toLocaleDateString()}
            </div>
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
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <span>Slides ({slides.length})</span>
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {readOnly ? 'Haz clic para navegar' : 'Haz clic para navegar • Arrastra para reordenar'}
        </p>
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