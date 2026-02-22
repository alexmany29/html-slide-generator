import { Plus, Copy, Trash2, Code, Play, Save, Layers, Edit3 } from 'lucide-react';

interface ToolbarProps {
  onAddSlide?: () => void;
  onDuplicateSlide?: () => void;
  onDeleteSlide?: () => void;
  onEditHTML?: () => void;
  onPresentationMode: () => void;
  onSave?: () => void;
  canDelete: boolean;
  readOnly?: boolean;
  onToggleVisualEdit?: () => void;
  isVisualEditMode?: boolean;
}

export default function Toolbar({
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onEditHTML,
  onPresentationMode,
  onSave,
  canDelete,
  readOnly = false,
  onToggleVisualEdit,
  isVisualEditMode = false
}: ToolbarProps) {
  const btn = "flex items-center space-x-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors";

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          {!readOnly && onAddSlide && (
            <button onClick={onAddSlide} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700`} title="Nueva slide">
              <Plus size={15} /><span>Nueva</span>
            </button>
          )}

          {!readOnly && onDuplicateSlide && (
            <button onClick={onDuplicateSlide} className={`${btn} text-gray-700 bg-gray-100 hover:bg-gray-200`} title="Duplicar slide">
              <Copy size={15} /><span>Duplicar</span>
            </button>
          )}

          {!readOnly && onDeleteSlide && (
            <button
              onClick={onDeleteSlide}
              disabled={!canDelete}
              className={`${btn} ${canDelete ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-50'}`}
              title="Eliminar slide"
            >
              <Trash2 size={15} /><span>Eliminar</span>
            </button>
          )}

          {!readOnly && <div className="w-px h-6 bg-gray-200 mx-1.5" />}

          {!readOnly && onToggleVisualEdit && (
            <button
              onClick={onToggleVisualEdit}
              className={`${btn} ${isVisualEditMode ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'}`}
              title={isVisualEditMode ? 'Desactivar edicion visual' : 'Activar edicion visual'}
            >
              <Edit3 size={15} />
              <span>{isVisualEditMode ? 'Finalizar Visual' : 'Edicion Visual'}</span>
            </button>
          )}

          {!readOnly && onEditHTML && (
            <button onClick={onEditHTML} className={`${btn} text-gray-700 bg-gray-100 hover:bg-gray-200`} title="Editar HTML">
              <Code size={15} /><span>HTML</span>
            </button>
          )}

          {readOnly && (
            <div className={`${btn} text-amber-700 bg-amber-50`}>
              <Layers size={15} /><span>Solo lectura</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          {!readOnly && onSave && (
            <button onClick={onSave} className={`${btn} text-gray-700 bg-gray-100 hover:bg-gray-200`} title="Guardar cambios">
              <Save size={15} /><span>Guardar</span>
            </button>
          )}

          <button onClick={onPresentationMode} className={`${btn} text-white bg-emerald-600 hover:bg-emerald-700`} title="Modo presentacion">
            <Play size={15} /><span>Presentar</span>
          </button>
        </div>
      </div>
    </div>
  );
}