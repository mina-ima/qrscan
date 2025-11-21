import React, { useCallback, useEffect, useState } from 'react';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelected, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelected(file);
      } else {
        alert("画像ファイルを選択してください。");
      }
    }
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  }, [onFileSelected]);

  // Handle Paste events (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              onFileSelected(blob);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onFileSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center w-full max-w-2xl mx-auto h-80 
        rounded-3xl border-4 border-dashed transition-all duration-300 cursor-pointer
        ${isDragging 
          ? 'border-primary bg-blue-50 scale-[1.02] shadow-xl' 
          : 'border-slate-200 bg-white hover:border-primary/60 hover:bg-slate-50 shadow-sm hover:shadow-md'
        }
      `}
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleFileInput}
        accept="image/*"
        disabled={isProcessing}
      />
      
      <div className="text-center p-6 pointer-events-none flex flex-col items-center space-y-4">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-200' : 'bg-blue-50'} transition-colors duration-300`}>
          <svg className={`w-10 h-10 ${isDragging ? 'text-blue-600' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <p className="text-xl font-semibold text-slate-700">
            QR画像をドラッグ＆ドロップ
          </p>
          <p className="text-sm text-slate-500">
            またはクリックしてアップロード
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 w-full max-w-xs">
           <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
             画面上のコンテンツ
           </p>
           <p className="text-sm text-slate-600 bg-slate-100 py-2 px-4 rounded-lg inline-flex items-center gap-2 shadow-sm">
             <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
             ここに貼り付け (Ctrl+V) !
           </p>
        </div>
      </div>
    </div>
  );
};