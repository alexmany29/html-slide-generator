import React, { useState, useRef, useEffect } from 'react';
import { Code, Eye, X, Download } from 'lucide-react';

interface HTMLEditorProps {
  content: string;
  onChange: (content: string) => void;
  onClose: () => void;
}

export default function HTMLEditor({ content, onChange, onClose }: HTMLEditorProps) {
  const [htmlContent, setHtmlContent] = useState(content);
  const [isPreview, setIsPreview] = useState(false);
  const [lineNumbers, setLineNumbers] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setHtmlContent(content);
    updateLineNumbers(content);
  }, [content]);

  const updateLineNumbers = (text: string) => {
    const lines = text.split('\n');
    setLineNumbers(lines.map((_, index) => (index + 1).toString()));
  };

  const handleSave = () => {
    // Guardamos el HTML tal cual para preservar scripts y estilos externos
    onChange(htmlContent);
    onClose();
  };

  const handleContentChange = (value: string) => {
    setHtmlContent(value);
    updateLineNumbers(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = htmlContent.substring(0, start) + '  ' + htmlContent.substring(end);
        setHtmlContent(newValue);
        updateLineNumbers(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slide.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isPreview && previewRef.current) {
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview</title>
        </head>
        <body style="margin: 0; padding: 20px;">
          ${htmlContent}
        </body>
        </html>
      `;
      previewRef.current.srcdoc = fullHtml;
    }
  }, [isPreview, htmlContent]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Editor HTML</h2>
            <p className="text-gray-600 text-sm mt-1">Edita el código HTML de tu slide</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isPreview 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isPreview ? <Code size={18} /> : <Eye size={18} />}
              <span>{isPreview ? 'Código' : 'Preview'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium transition-all duration-200"
              title="Descargar HTML"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {isPreview ? (
            <div className="h-full p-6">
              <iframe
                ref={previewRef}
                className="w-full h-full border rounded-xl shadow-inner bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          ) : (
            <div className="h-full flex">
              <div className="w-12 bg-gray-50 border-r border-gray-200 py-4 px-2 overflow-hidden">
                <div className="text-xs text-gray-500 font-mono leading-6">
                  {lineNumbers.map((num, index) => (
                    <div key={index} className="text-right pr-2">
                      {num}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={htmlContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-full border-none p-4 font-mono text-sm resize-none focus:outline-none leading-6"
                  dir="ltr"
                  placeholder="Ingresa tu código HTML aquí..."
                  spellCheck={false}
                  style={{ 
                    backgroundColor: '#fafafa',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    direction: 'ltr',
                    textAlign: 'left',
                    unicodeBidi: 'embed',
                    writingMode: 'horizontal-tb'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+S</kbd> para guardar
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Aplicar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}