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

  // Button click handler for reading clipboard
  const handlePasteClick = async () => {
    try {
      // Try the modern Clipboard API first
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        // Find image types
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          // Convert Blob to File
          const file = new File([blob], "clipboard-image.png", { type: imageType });
          onFileSelected(file);
          return;
        }
      }
      alert("クリップボードに画像が見つかりませんでした。\nスクリーンショットを撮ってコピーしてから試してください。");
    } catch (err) {
      console.error(err);
      // Fallback prompt if API fails or permission denied
      alert("クリップボードへのアクセスがブロックされたか、対応していないブラウザです。\nキーボードの Ctrl+V (MacならCmd+V) を押して貼り付けてください。");
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center w-full max-w-2xl mx-auto 
        rounded-3xl border-4 border-dashed transition-all duration-300 overflow-hidden
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
      
      <div className="text-center p-8 pointer-events-none flex flex-col items-center space-y-6 z-20 w-full">
        <div className="space-y-2">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${isDragging ? 'bg-blue-200' : 'bg-blue-50'}`}>
            <svg className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-slate-700">
            画像をドロップ または 貼り付け
          </p>
          <p className="text-sm text-slate-500">
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Ctrl</span> + <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">V</span> で直接読み込めます
          </p>
        </div>

        <div className="w-full border-t border-slate-100 my-2"></div>

        {/* Shortcut Guide Section */}
        <div className="w-full bg-slate-50/80 rounded-xl p-4 border border-slate-100 text-left pointer-events-auto">
          <div className="flex items-center gap-2 mb-3 text-slate-600">
             <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <span className="text-xs font-bold uppercase tracking-wider">部分スクショの撮り方</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-medium">WINDOWS</span>
              <div className="flex items-center gap-1 text-sm text-slate-700 font-bold">
                <kbd className="bg-white border-b-2 border-slate-200 px-1.5 rounded min-w-[2rem] text-center">Win</kbd>
                <span className="text-slate-300">+</span>
                <kbd className="bg-white border-b-2 border-slate-200 px-1.5 rounded min-w-[2rem] text-center">Shift</kbd>
                <span className="text-slate-300">+</span>
                <kbd className="bg-white border-b-2 border-slate-200 px-1.5 rounded min-w-[1.5rem] text-center">S</kbd>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-medium">MAC</span>
              <div className="flex items-center gap-1 text-sm text-slate-700 font-bold">
                <kbd className="bg-white border-b-2 border-slate-200 px-1.5 rounded min-w-[2rem] text-center">Cmd</kbd>
                <span className="text-slate-300">+</span>
                <kbd className="bg-white border-b-2 border-slate-200 px-1.5 rounded min-w-[2rem] text-center">Ctrl</kbd>
                <span className="text-slate-300">+</span>
                <kbd className="bg-white border-b-2 border-slate-200 px-1.5 rounded min-w-[2rem] text-center">Shift</kbd>
                <span className="text-slate-300">+</span>
                <kbd className="bg-white border-b-2 border-slate-200 px-1.5 rounded min-w-[1.5rem] text-center">4</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto pt-2">
           <button
             onClick={(e) => {
               e.stopPropagation();
               handlePasteClick();
             }}
             className="text-primary hover:text-primary-600 text-sm font-medium flex items-center gap-1 hover:underline"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
             クリップボードから読み込む
           </button>
        </div>
      </div>
    </div>
  );
};