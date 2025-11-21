import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}> = ({ isDragging, onMouseDown, onClick, style, className = "" }) => (
  <div 
    style={style}
    className={`
      relative w-40 h-40 bg-gradient-to-br from-slate-800 to-slate-900 
      rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center 
      border-4 border-slate-700 transition-transform duration-100 z-10 select-none
      ${isDragging ? 'scale-95 rotate-3 shadow-inner cursor-grabbing' : 'hover:scale-105 hover:-translate-y-2 hover:shadow-blue-500/30 hover:border-slate-600 cursor-grab'}
      ${className}
    `}
    onMouseDown={onMouseDown}
    onClick={onClick}
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

  // Custom Drag State (replaces HTML5 DnD to fix user gesture issues)
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const dragStartOffset = useRef({ x: 0, y: 0 });

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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
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
        setError("ブラウザのセキュリティ制限により起動できませんでした。アイコンを「クリック」して再試行してください。");
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
  };

  // --- Custom Mouse Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left click
    if (e.button !== 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setDragPosition({
      x: rect.left,
      y: rect.top
    });
    
    // We do NOT call preventDefault() here to allow focus events, 
    // but we might need it if text selection is annoying.
    // For now, CSS user-select-none handles text selection.
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragPosition) {
        e.preventDefault(); // Prevent scrolling/selection while dragging
        setDragPosition({
          x: e.clientX - dragStartOffset.current.x,
          y: e.clientY - dragStartOffset.current.y
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragPosition) {
        // End drag
        setDragPosition(null);
        
        // Trigger scan action
        // IMPORTANT: This is a 'mouseup' event which IS a valid user gesture,
        // satisfying getDisplayMedia requirements even if it was a drag operation.
        handleStartScreenScan();
      }
    };

    if (dragPosition) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragPosition, handleStartScreenScan]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary/20">
      {/* Screen Scanner Overlay */}
      {isScreenScanning && activeStream && (
        <ScreenScanner 
          stream={activeStream}
          onScan={processQRData} 
          onCancel={handleStopScreenScan} 
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
      <main className="max-w-4xl mx-auto px-6 py-12">
        
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            画面上のQRコードをスキャン
          </h2>
          <p className="text-slate-600 text-lg">
            ブラウザ内外を問わず、画面上のあらゆるQRコードを読み取ります。<br/>
            カメラアイコンを<span className="font-bold text-primary">QRコードの上までドラッグして離す</span>だけです。
          </p>
        </div>

        <div className="transition-all duration-500 ease-in-out transform">
          {!qrData ? (
            <div className="space-y-10 animate-fade-in">
              
              {/* Draggable Camera Trigger */}
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative group">
                  {/* Ripple effect (only visible when stationary) */}
                  <div className={`absolute inset-0 bg-blue-100 rounded-full blur-xl transition-opacity duration-500 ${dragPosition ? 'opacity-0' : 'opacity-0 group-hover:opacity-30'}`}></div>
                  
                  {/* Placeholder that keeps layout stable when dragging */}
                  <div className="relative w-40 h-40">
                    {/* This button handles MouseDown to start the visual drag. 
                        It hides itself (via opacity) when dragging starts. */}
                    <CameraButton 
                      onMouseDown={handleMouseDown}
                      // Keyboard support fallback
                      onClick={handleStartScreenScan}
                      isDragging={false}
                      className={`${dragPosition ? 'opacity-0' : 'opacity-100'}`}
                    />
                  </div>

                  {/* Instruction Label */}
                  <div className={`
                    absolute -bottom-16 left-1/2 transform -translate-x-1/2 w-64 text-center
                    transition-all duration-300 pointer-events-none
                    ${dragPosition ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
                  `}>
                    <span className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-full shadow-lg">
                      ドラッグしてQRの上で離す
                    </span>
                    <p className="mt-2 text-xs text-slate-400">
                      (またはクリックして開始)
                    </p>
                  </div>
                </div>
              </div>

              {/* The Floating Drag Element (Rendered outside normal flow when dragging) */}
              {dragPosition && (
                <div 
                   className="fixed z-50 pointer-events-none"
                   style={{ left: dragPosition.x, top: dragPosition.y }}
                >
                   <CameraButton isDragging={true} />
                </div>
              )}

              <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto w-full pt-4">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <span className="text-slate-400 text-sm font-medium uppercase">または 画像ファイル</span>
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
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions / Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-200">
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-primary flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">ドラッグ＆リリース</h3>
                  <p className="text-sm text-slate-500">カメラアイコンを読み取りたい場所に持っていき、マウスを離すだけでスキャン開始。</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">安全性チェック</h3>
                  <p className="text-sm text-slate-500">アクセスする前に、Gemini AIがリンクの潜在的なセキュリティリスクを分析します。</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">画面全体対応</h3>
                  <p className="text-sm text-slate-500">ブラウザの中だけでなく、PDF資料やデスクトップ上のアプリもスキャン可能です。</p>
                </div>
              </div>
            </div>
          ) : (
            <ResultCard 
              rawContent={qrData} 
              analysis={analysis} 
              onReset={handleReset} 
            />
          )}
        </div>
      </main>
      
      <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-6 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} ScreenQR Reader. 画像がサーバーにアップロードされることはありません（AI分析を除く）。
        </div>
      </footer>
    </div>
  );
}

export default App;