// Type definition for the global jsQR function loaded via CDN
export interface Point {
  x: number;
  y: number;
}

export interface QRCode {
  binaryData: number[];
  data: string;
  chunks: any[];
  location: {
    topRightCorner: Point;
    topLeftCorner: Point;
    bottomRightCorner: Point;
    bottomLeftCorner: Point;
  };
}

declare global {
  interface Window {
    jsQR: (data: Uint8ClampedArray, width: number, height: number) => QRCode | null;
  }
}

export interface AnalysisResult {
  summary: string;
  safety: 'safe' | 'suspicious' | 'unknown' | 'info';
  category: 'url' | 'text' | 'wifi' | 'other';
}
