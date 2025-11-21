import React, { useState, useCallback } from 'react';
import { DropZone } from './components/DropZone';
import { ResultCard } from './components/ResultCard';
import { readQRFromImage } from './utils/qrUtils';
import { analyzeQRContent } from './services/geminiService';
import { AnalysisResult } from './types';

function App() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processQRData = useCallback((data: string) => {
    setQrData(data);
    setIsProcessing(false);
    setError(null);

    analyzeQRContent(data)
      .then(result => setAnalysis(result))
      .catch(err => console.error(err));
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
      <main className="flex-grow max-w-4xl mx-auto px-6 py-12 w-full flex flex-col justify-center">
        
        {!qrData && (
           <div className="mb-10 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              画面上のQRコードをスキャン
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              <span className="font-bold text-slate-800">スクリーンショット</span>を撮って貼り付け(Ctrl+V)、<br/>
              または画像をドロップして読み取ります。<br/>
              <span className="text-sm text-slate-400">（※画面全体のスクショでも自動検出します！）</span>
            </p>
          </div>
        )}

        <div className="transition-all duration-500 ease-in-out w-full">
          {qrData ? (
            /* RESULT VIEW */
            <ResultCard 
              rawContent={qrData} 
              analysis={analysis} 
              onReset={handleReset} 
            />
          ) : (
            /* IDLE / DROP ZONE VIEW */
            <div className="space-y-10 animate-fade-in">
              
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
    </div>
  );
}

export default App;