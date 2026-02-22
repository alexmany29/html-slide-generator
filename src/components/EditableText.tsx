import { useRef, useEffect, useState } from 'react';

interface EditableTextProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  placeholder?: string;
}

export default function EditableText({ content, onChange, className = '', placeholder = 'Click to edit...' }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentContent, setCurrentContent] = useState(content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentContent(content);
  }, [content]);

  const handleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(currentContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCurrentContent(content);
      inputRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentContent(e.target.value);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={currentContent}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} ring-2 ring-blue-500 ring-opacity-50 transition-all duration-200 rounded px-1 py-0.5 min-h-[1.5rem] bg-transparent border-none outline-none`}
        placeholder={placeholder}
        dir="ltr"
        style={{
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'embed'
        }}
      />
    );
  }

  return (
    <div
      className={`${className} hover:bg-gray-50 cursor-text transition-all duration-200 rounded px-1 py-0.5 min-h-[1.5rem] ${!currentContent.trim() ? 'text-gray-400' : ''}`}
      onClick={handleClick}
      dir="ltr"
      style={{
        direction: 'ltr',
        textAlign: 'left'
      }}
    >
      {currentContent || placeholder}
    </div>
  );
}