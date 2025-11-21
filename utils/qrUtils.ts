import { QRCode } from '../types';

// Helper to scan raw ImageData directly (synchronous)
export const scanImageData = (imageData: ImageData): QRCode | null => {
  if (window.jsQR) {
    return window.jsQR(imageData.data, imageData.width, imageData.height);
  }
  return null;
};

export const readQRFromImage = (file: File): Promise<QRCode | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = scanImageData(imageData);
          if (code) {
            resolve(code);
          } else {
            resolve(null); // Resolved as null if no QR found, rather than error
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  });
};