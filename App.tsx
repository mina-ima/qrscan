import React, { useState, useRef, useCallback } from 'react';
import { DropZone } from './components/DropZone';
import { ResultCard } from './components/ResultCard';
import { ScreenScanner } from './components/ScreenScanner';
import { readQRFromImage } from './utils/qrUtils';
import { analyzeQRContent } from './services/geminiService';
import { AnalysisResult } from './types';

// Reusable Camera Button Component
const CameraButton: React.FC<{
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  style?: React.CSSProperties;
  className?: string;
}> = ({ isDragging, onMouseDown, onClick, onKeyDown, style, className = "" }) => (
  <div 
    style={style}
    className={`
      relative w-40 h-40 bg-gradient-to-br from-slate-800 to-slate-900 
      rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center 
      border-4 border-slate-700 transition-transform duration-100 z-10 select-none
      ${isDragging ? 'scale-75 rotate-3 shadow-inner cursor-grabbing opacity-90' : 'hover:scale-105 hover:-translate-y-2 hover:shadow-blue-500/30 hover:border-slate-600 cursor-grab'}
      ${className}
    `}
    onMouseDown={onMouseDown}
    onClick={onClick}
    onKeyDown={onKeyDown}
    role="button"
    tabIndex={0}
    title="ドラッグしてQRコードの上で離す、またはクリックして開始"
  >
     {/* Lens reflection effect */}
     <div className="absolute top-0 right-0 w-full h-full rounded-[2.5rem] bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none"></div>
     
     <svg className={`w-20 h-20 text-primary-300 transition-colors duration-300 ${isDragging ? 'text-primary-400' : 'group-hover:text-primary-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
     </svg>
     
     <div className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-300 pointer-events-none">Screen Lens</div>
  </div>
);

function App() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScreenScanning, setIsScreenScanning] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom Drag State
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);

  const handleStopScreenScan = useCallback(() => {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      setActiveStream(null);
    }
    setIsScreenScanning(false);
  }, [activeStream]);

  const processQRData = useCallback((data: string) => {
    setQrData(data);
    setIsProcessing(false);
    handleStopScreenScan();
    setError(null);

    analyzeQRContent(data)
      .then(result => setAnalysis(result))
      .catch(err => console.error(err));
  }, [handleStopScreenScan]);

  const handleStartScreenScan = useCallback(async () => {
    setError(null);

    // Check if API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setError("このブラウザは画面共有をサポートしていないか、セキュアなコンテキスト(HTTPS)で実行されていません。");
      return;
    }

    try {
      // Using 'getDisplayMedia' requires a user gesture.
      // The direct call from 'handleMouseUp' provides this gesture.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always" // Helps user see where they are pointing
        } as any,
        audio: false
      });
      
      setActiveStream(stream);
      setIsScreenScanning(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.log("Screen scan cancelled by user.");
        return;
      }
      
      console.error("Error starting screen capture:", err);

      if (err.message && (err.message.includes('user gesture') || err.name === 'InvalidStateError')) {
        setError("セキュリティ制限により起動できませんでした。アイコンを「クリック」して再試行してください。");
      } else {
        setError("画面キャプチャを開始できませんでした。権限を確認するか、別のブラウザをお試しください。");
      }
    }
  }, []);

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setQrData(null);
    setAnalysis(null);

    try {
      const qr = await readQRFromImage(file);
      if (qr) {
        processQRData(qr.data);
      } else {
        setError("QRコードが検出されませんでした。画像が鮮明で、有効なQRコードが含まれていることを確認してください。");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      setError("画像の処理に失敗しました。もう一度お試しください。");
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setQrData(null);
    setAnalysis(null);
    setError(null);
    setIsProcessing(false);
    handleStopScreenScan();
  };

  // --- Simplified Drag Logic (Center on Cursor) ---
  // This prevents the "jumping" issue caused by offset calculations on scaled elements.
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // Prevent text selection
    
    // Start by centering the drag element on the cursor immediately
    setDragPosition({ x: e.clientX, y: e.clientY });

    const handleMouseMove = (ev: MouseEvent) => {
      ev.preventDefault();
      setDragPosition({
        x: ev.clientX,
        y: ev.clientY
      });
    };

    const handleMouseUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      setDragPosition(null);
      
      // Trigger the API call immediately on mouse up (valid user gesture)
      handleStartScreenScan();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary/20 flex flex-col">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">ScreenQR リーダー</h1>
          </div>
          <a 
            href="https://ai.google.dev/" 
            target="_blank" 
            className="text-xs font-medium text-slate-400 hover:text-primary transition-colors hidden sm:block"
          >
            Powered by Gemini 2.5 Flash
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl mx-auto px-6 py-12 w-full">
        
        {!isScreenScanning && !qrData && (
           <div className="mb-10 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              画面上のQRコードをスキャン
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              <span className="font-bold text-slate-800">スクリーンショット</span>を撮って貼り付け(Ctrl+V)、<br/>
              またはカメラアイコンをドラッグしてライブ読取します。<br/>
              <span className="text-sm text-slate-400">（※画面全体のスクショでも自動検出します！）</span>
            </p>
          </div>
        )}

        <div className="transition-all duration-500 ease-in-out">
          {isScreenScanning && activeStream ? (
            /* INLINE SCREEN SCANNER (Replaces DropZone) */
            <div className="animate-fade-in">
              <ScreenScanner 
                stream={activeStream}
                onScan={processQRData} 
                onCancel={handleStopScreenScan} 
              />
            </div>
          ) : qrData ? (
            /* RESULT VIEW */
            <ResultCard 
              rawContent={qrData} 
              analysis={analysis} 
              onReset={handleReset} 
            />
          ) : (
            /* IDLE / DROP ZONE VIEW */
            <div className="space-y-10 animate-fade-in">
              
              {/* Draggable Camera Trigger */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative group">
                  {/* Ripple effect */}
                  <div className={`absolute inset-0 bg-blue-100 rounded-full blur-xl transition-opacity duration-500 ${dragPosition ? 'opacity-0' : 'opacity-0 group-hover:opacity-30'}`}></div>
                  
                  {/* Static Button Placeholder */}
                  <div className="relative w-40 h-40">
                    <CameraButton 
                      onMouseDown={handleMouseDown}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStartScreenScan();
                        }
                      }}
                      isDragging={false}
                      className={`${dragPosition ? 'opacity-0' : 'opacity-100'}`}
                    />
                  </div>

                  {/* Instruction Label */}
                  <div className={`
                    absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-72 text-center
                    transition-all duration-300 pointer-events-none
                    ${dragPosition ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
                  `}>
                    <span className="inline-block px-4 py-1 bg-slate-800 text-white text-xs font-medium rounded-full shadow-lg opacity-60">
                      ドラッグで画面共有（ライブ読取）
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto w-full pt-2">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <span className="text-slate-400 text-sm font-medium uppercase">または 画像・クリップボード</span>
                 <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <div className="max-w-2xl mx-auto w-full">
                <DropZone onFileSelected={handleFileSelected} isProcessing={isProcessing} />
              </div>

              {isProcessing && (
                 <div className="flex flex-col items-center justify-center py-4 space-y-3">
                   <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-slate-500 font-medium">処理中...</p>
                 </div>
              )}

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-shake max-w-2xl mx-auto">
                  <div className="flex items-center">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-6 text-center text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} ScreenQR Reader. 画像がサーバーにアップロードされることはありません（AI分析を除く）。
        </div>
      </footer>

      {/* 
         Floating Drag Element (Portal-like behavior at root) 
         Using 'transform: translate(-50%, -50%)' centers the element on the mouse cursor.
      */}
      {dragPosition && (
        <div 
           className="fixed z-50 pointer-events-none"
           style={{ 
             left: dragPosition.x, 
             top: dragPosition.y,
             transform: 'translate(-50%, -50%)' 
           }}
        >
           <CameraButton isDragging={true} />
        </div>
      )}
    </div>
  );
}

export default App;