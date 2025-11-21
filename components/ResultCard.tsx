import React from 'react';
import { AnalysisResult } from '../types';

interface ResultCardProps {
  rawContent: string;
  analysis: AnalysisResult | null;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ rawContent, analysis, onReset }) => {
  const isUrl = analysis?.category === 'url';
  
  const getSafetyColor = (safety?: string) => {
    switch (safety) {
      case 'safe': return 'bg-green-100 text-green-800 border-green-200';
      case 'suspicious': return 'bg-red-100 text-red-800 border-red-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSafetyLabel = (safety?: string) => {
    switch (safety) {
      case 'safe': return '安全';
      case 'suspicious': return '疑わしい';
      case 'info': return '情報';
      case 'unknown': return '不明';
      default: return '不明';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawContent);
    alert('クリップボードにコピーしました！');
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
      {/* Header / Analysis Section */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            読み取り成功
          </h2>
          {analysis && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getSafetyColor(analysis.safety)}`}>
              {getSafetyLabel(analysis.safety)}
            </span>
          )}
        </div>

        {analysis ? (
          <div className="space-y-3">
            <p className="text-slate-600 text-sm leading-relaxed">
              <span className="font-semibold text-slate-900">AI概要: </span>
              {analysis.summary}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Geminiでコンテンツを分析中...
          </div>
        )}
      </div>

      {/* Raw Content Section */}
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            読み取った内容
          </label>
          <div className="relative group">
            <textarea
              readOnly
              value={rawContent}
              className="w-full h-24 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 bg-white rounded-md border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-colors shadow-sm opacity-0 group-hover:opacity-100"
              title="クリップボードにコピー"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {isUrl && (
            <a
              href={rawContent}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-primary hover:bg-blue-600 text-white text-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              リンクを開く
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          )}
          <button
            onClick={onReset}
            className={`flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${!isUrl ? 'w-full' : ''}`}
          >
            別のQRをスキャン
          </button>
        </div>
      </div>
    </div>
  );
};