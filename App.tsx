import React, { useState } from 'react';
import { DropZone } from './components/DropZone';
import { ResultCard } from './components/ResultCard';
import { ScreenScanner } from './components/ScreenScanner';
import { readQRFromImage } from './utils/qrUtils';
import { analyzeQRContent } from './services/geminiService';
import { AnalysisResult } from './types';

function App() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScreenScanning, setIsScreenScanning] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);

  const processQRData = (data: string) => {
    setQrData(data);
    setIsProcessing(false);
    handleStopScreenScan(); // Close scanner and stop stream
    setError(null);

    // Start analysis
    analyzeQRContent(data)
      .then(result => setAnalysis(result))
      .catch(err => console.error(err));
  };

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

  const handleStartScreenScan = async () => {
    setError(null);

    // Check if API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setError("このブラウザは画面共有をサポートしていないか、セキュアなコンテキスト(HTTPS)で実行されていません。");
      return;
    }

    try {
      // Use basic constraints for maximum compatibility
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      setActiveStream(stream);
      setIsScreenScanning(true);
    } catch (err: any) {
      // Handle user cancellation specifically (don't log as error)
      if (err.name === 'NotAllowedError') {
        console.log("Screen scan cancelled by user.");
        return;
      }
      
      console.error("Error starting screen capture:", err);
      setError("画面キャプチャを開始できませんでした。権限を確認するか、別のブラウザをお試しください。");
    }
  };

  const handleStopScreenScan = () => {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      setActiveStream(null);
    }
    setIsScreenScanning(false);
  };

  // Drag and Drop handlers for the Camera Icon
  const handleCameraDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', 'camera-trigger');
    e.dataTransfer.effectAllowed = 'move';
    setIsDraggingCamera(true);
  };

  const handleCameraDragEnd = () => {
    setIsDraggingCamera(false);
  };

  const handleCameraDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCameraDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (data === 'camera-trigger') {
      handleStartScreenScan();
    }
    setIsDraggingCamera(false);
  };

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
            QRコード・インスタントデコーダー
          </h2>
          <p className="text-slate-600 text-lg">
            カメラアイコンをドロップして画面をスキャンするか、<br/>画像をアップロードして読み取ります。
          </p>
        </div>

        <div className="transition-all duration-500 ease-in-out transform">
          {!qrData ? (
            <div className="space-y-10 animate-fade-in">
              
              {/* D&D Scan Trigger Area */}
              <div className="grid md:grid-cols-2 gap-8 items-stretch min-h-[320px]">
                
                {/* Left: Draggable Camera Source */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-slate-50/50 pattern-dots opacity-20"></div>
                  
                  <h3 className="text-lg font-bold text-slate-700 mb-6 relative z-10">1. カメラを持つ</h3>
                  
                  {/* Draggable Icon */}
                  <div 
                    draggable={!isScreenScanning}
                    onDragStart={handleCameraDragStart}
                    onDragEnd={handleCameraDragEnd}
                    className={`
                      cursor-grab active:cursor-grabbing z-20 transition-all duration-300
                      ${isDraggingCamera ? 'opacity-50 scale-95' : 'hover:scale-105'}
                    `}
                  >
                    <div className="w-32 h-32 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] shadow-2xl flex items-center justify-center border-4 border-slate-700 relative group">
                       {/* Lens reflection effect */}
                       <div className="absolute top-0 right-0 w-full h-full rounded-[2rem] bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none"></div>
                       
                       <svg className="w-16 h-16 text-primary-300 group-hover:text-primary-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                       </svg>
                       
                       {/* Drag Hint */}
                       <div className="absolute -bottom-10 text-slate-400 text-sm font-medium animate-bounce">
                         私をドラッグして！
                       </div>
                    </div>
                  </div>
                </div>

                {/* Right: Drop Target */}
                <div 
                  onDragOver={handleCameraDragOver}
                  onDrop={handleCameraDrop}
                  className={`
                    rounded-3xl border-4 border-dashed flex flex-col items-center justify-center p-8 transition-all duration-300 relative
                    ${isDraggingCamera 
                      ? 'border-primary bg-blue-50/50 scale-[1.02] shadow-xl ring-4 ring-primary/10' 
                      : 'border-slate-200 bg-slate-50/50'
                    }
                  `}
                >
                   <div className={`
                     w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-500
                     ${isDraggingCamera ? 'bg-white text-primary scale-110 shadow-lg' : 'bg-slate-200 text-slate-400'}
                   `}>
                     <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                     </svg>
                   </div>
                   <h3 className={`text-lg font-bold mb-2 transition-colors ${isDraggingCamera ? 'text-primary' : 'text-slate-400'}`}>
                     2. ここにドロップ
                   </h3>
                   <p className="text-slate-500 text-sm text-center max-w-xs">
                     ここにカメラを離すと画面共有が始まります。<br/>
                     <span className="font-bold text-primary">「画面全体」</span>を選べば、ブラウザ外のアプリもスキャン可能です。
                   </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto w-full">
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
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-shake">
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
                  <h3 className="font-semibold text-slate-900 mb-1">D&D スキャン</h3>
                  <p className="text-sm text-slate-500">カメラアイコンをドラッグしてスキャンを開始。直感的な操作でQRコードを狙い撃ち。</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">安全性チェック</h3>
                  <p className="text-sm text-slate-500">クリックする前に、Gemini AIがリンクの潜在的なセキュリティリスクを分析します。</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">高速処理</h3>
                  <p className="text-sm text-slate-500">ブラウザ内でローカルに処理されるため、高速でプライバシーも安心です。</p>
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