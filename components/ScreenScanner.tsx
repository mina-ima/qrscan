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
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
       <div className="absolute top-6 right-6">
          <button onClick={onCancel} className="text-white/70 hover:text-white p-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
       </div>

       <div className="text-center mb-6 max-w-2xl">
          <h2 className="text-white text-2xl font-bold mb-2">画面スキャナー起動中</h2>
          <p className="text-slate-300 text-lg">
            1. QRコードが表示されている画面またはウィンドウを選択してください。<br/>
            2. 以下のプレビューにQRコードがはっきりと映っていることを確認してください。
          </p>
       </div>

       <div className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
          <video 
            ref={videoRef} 
            className="w-full h-full object-contain" 
            muted 
            playsInline
          />
          
          {/* Visual Overlay Elements */}
          <div className="absolute inset-0 pointer-events-none">
             {/* Corner markers */}
             <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-sm"></div>
             <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-sm"></div>
             <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-sm"></div>
             <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-sm"></div>
             
             {/* Scanning Line Animation */}
             <div className="absolute left-0 right-0 h-0.5 bg-primary/80 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line"></div>
          </div>
       </div>
       
       <button 
         onClick={onCancel}
         className="mt-8 px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-100 transition-all transform hover:scale-105 shadow-lg"
       >
         スキャンを停止
       </button>
    </div>
  );
};