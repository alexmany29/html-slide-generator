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
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!readOnly && onAddSlide && (
            <button
              onClick={onAddSlide}
              className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
              title="Nueva slide"
            >
              <Plus size={16} />
              <span>Nueva</span>
            </button>
          )}

          {!readOnly && onDuplicateSlide && (
            <button
              onClick={onDuplicateSlide}
              className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Duplicar slide"
            >
              <Copy size={16} />
              <span>Duplicar</span>
            </button>
          )}

          {!readOnly && onDeleteSlide && (
            <button
              onClick={onDeleteSlide}
              disabled={!canDelete}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-lg transform transition-all duration-200 ${
                canDelete
                  ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 hover:scale-105 shadow-sm hover:shadow-md'
                  : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-50'
              }`}
              title="Eliminar slide"
            >
              <Trash2 size={16} />
              <span>Eliminar</span>
            </button>
          )}

          {!readOnly && <div className="w-px h-8 bg-gray-300 mx-3" />}

          {!readOnly && onToggleVisualEdit && (
            <button
              onClick={onToggleVisualEdit}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-lg transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md ${
                isVisualEditMode
                  ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300'
                  : 'text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 hover:border-purple-300'
              }`}
              title={isVisualEditMode ? 'Desactivar edición visual' : 'Activar edición visual'}
            >
              <Edit3 size={16} />
              <span>{isVisualEditMode ? 'Finalizar Visual' : 'Edición Visual'}</span>
            </button>
          )}

          {!readOnly && onEditHTML && (
            <button
              onClick={onEditHTML}
              className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Editar HTML"
            >
              <Code size={16} />
              <span>Editar HTML</span>
            </button>
          )}
          
          {readOnly && (
            <div className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
              <Layers size={16} />
              <span>Modo solo lectura</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {!readOnly && onSave && (
            <button
              onClick={onSave}
              className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Guardar cambios"
            >
              <Save size={16} />
              <span>Guardar</span>
            </button>
          )}

          <button
            onClick={onPresentationMode}
            className="flex items-center space-x-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
            title="Modo presentación"
          >
            <Play size={16} />
            <span>Presentar</span>
          </button>
        </div>
      </div>
    </div>
  );
}