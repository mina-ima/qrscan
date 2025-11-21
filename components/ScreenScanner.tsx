import React, { useEffect, useRef } from 'react';
import { scanImageData } from '../utils/qrUtils';

interface ScreenScannerProps {
  stream: MediaStream;
  onScan: (data: string) => void;
  onCancel: () => void;
}

export const ScreenScanner: React.FC<ScreenScannerProps> = ({ stream, onScan, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(e => console.error("Play failed", e));
      };
    }

    // Handle stream stop (user clicks "Stop sharing" in browser UI)
    const videoTrack = stream.getVideoTracks()[0];
    const handleTrackEnded = () => {
      onCancel();
    };
    
    videoTrack.addEventListener('ended', handleTrackEnded);

    return () => {
      videoTrack.removeEventListener('ended', handleTrackEnded);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [stream, onCancel]);

  // Scanning loop
  useEffect(() => {
    const scan = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
        const video = videoRef.current;
        
        // Create a temporary canvas to draw the current video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0);
          
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = scanImageData(imageData);
            
            if (code) {
               // Found it! Stop scanning immediately
               if (requestRef.current) cancelAnimationFrame(requestRef.current);
               onScan(code.data);
               return; 
            }
          } catch (e) {
            console.warn("Frame scan failed", e);
          }
        }
      }
      requestRef.current = requestAnimationFrame(scan);
    };
    
    requestRef.current = requestAnimationFrame(scan);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [onScan]);

  return (
    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col animate-fade-in-up">
       {/* Status Header */}
       <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
             <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
             </span>
             <span className="text-white font-bold tracking-wide">画面共有中: QRコードを探しています...</span>
          </div>
          <button 
            onClick={onCancel} 
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            停止する
          </button>
       </div>

       {/* Main Instruction Area - Crucial for UX */}
       <div className="bg-blue-900/30 px-6 py-4 border-b border-blue-500/20">
          <p className="text-blue-100 font-medium text-center">
             👇 読み取りたいQRコードがあるウィンドウやタブを表示してください
          </p>
       </div>

       {/* Video Preview Area */}
       <div className="relative w-full bg-black aspect-video flex items-center justify-center overflow-hidden group">
          <video 
            ref={videoRef} 
            className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" 
            muted 
            playsInline
          />
          
          {/* Visual Overlay Elements */}
          <div className="absolute inset-0 pointer-events-none">
             {/* Center target */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/50 rounded-lg flex items-center justify-center">
                <div className="w-44 h-44 border border-white/20 rounded-sm"></div>
             </div>
             
             {/* Scanning Line Animation */}
             <div className="absolute left-0 right-0 h-0.5 bg-primary/80 shadow-[0_0_15px_rgba(59,130,246,0.8)] top-1/2 animate-scan-line"></div>
          </div>
       </div>
       
       <div className="px-6 py-4 bg-slate-800 text-center">
         <p className="text-xs text-slate-400">
           プレビュー画面はこのウィンドウを映していると「合わせ鏡」になりますが、QRコードが表示されれば認識されます。<br/>
           対象のウィンドウを最前面に持ってきてください。
         </p>
       </div>
    </div>
  );
};