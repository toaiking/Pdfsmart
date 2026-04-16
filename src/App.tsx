import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileText, 
  Upload, 
  X, 
  GripVertical, 
  Download, 
  FilePlus2, 
  Trash2, 
  Loader2, 
  CheckCircle2,
  FileCode,
  ChevronRight,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { PDFDocument } from 'pdf-lib';
import confetti from 'canvas-confetti';
import { cn, formatBytes } from './lib/utils';

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedFileUrl, setMergedFileUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('merged-file');
  const [nameError, setNameError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<'small' | 'medium' | 'large'>('large');

  const qualitySettings = {
    small: { scale: 0.5, label: 'Nhỏ (Tiết kiệm)' },
    medium: { scale: 0.75, label: 'Vừa (Cân bằng)' },
    large: { scale: 1.0, label: 'Gốc (Chất lượng)' }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setMergedFileUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    }
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMergedFileUrl(null);
  };

  const removeAll = () => {
    setFiles([]);
    setMergedFileUrl(null);
  };

  const mergeFiles = async () => {
    if (files.length === 0) return;
    
    if (!outputName.trim()) {
      setNameError(true);
      setTimeout(() => setNameError(false), 3000);
      return;
    }
    
    setIsMerging(true);
    setProgress(10);
    
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        const fileBytes = await fileItem.file.arrayBuffer();
        
        if (fileItem.type === 'application/pdf') {
          const pdf = await PDFDocument.load(fileBytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          
          for (const page of copiedPages) {
            if (quality !== 'large') {
              const scale = qualitySettings[quality].scale;
              page.scale(scale, scale);
            }
            mergedPdf.addPage(page);
          }
        } else if (fileItem.type.startsWith('image/')) {
          let image;
          if (fileItem.type === 'image/jpeg' || fileItem.type === 'image/jpg') {
            image = await mergedPdf.embedJpg(fileBytes);
          } else {
            image = await mergedPdf.embedPng(fileBytes);
          }
          
          const scale = qualitySettings[quality].scale;
          const width = image.width * scale;
          const height = image.height * scale;
          
          const page = mergedPdf.addPage([width, height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });
        }
        
        setProgress(Math.round(((i + 1) / files.length) * 90));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setMergedFileUrl(url);
      setProgress(100);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00a1f1', '#ffffff', '#0088cc']
      });
    } catch (error) {
      console.error('Error merging files:', error);
      alert('Có lỗi xảy ra khi gộp file. Vui lòng thử lại.');
    } finally {
      setIsMerging(false);
    }
  };

  const downloadFile = () => {
    if (!mergedFileUrl) return;
    const link = document.createElement('a');
    link.href = mergedFileUrl;
    const finalName = outputName.trim() || 'merged-file';
    link.download = finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 font-sans flex flex-col">
      <main className="flex-1 flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
        {/* Top Section: Hero & Settings */}
        <div className="flex flex-col gap-4 flex-shrink-0">
          {/* Hero Container - Compact & Full Width */}
          <div className="w-full p-3 md:p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative flex items-center justify-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-sm bg-white p-1 flex-shrink-0">
                <img 
                  src="https://i.postimg.cc/59K4PjLQ/logopdf.png" 
                  alt="Smart PDF Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-left">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 leading-none">
                  Smart <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">PDF App</span>
                </h1>
                <p className="text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.2em]">
                  Gộp tệp tin siêu tốc
                </p>
              </div>
            </div>
          </div>

          {/* Settings Container - Full Width */}
          <div className="modern-card !p-4 md:!p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-br from-primary/5 to-accent/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-center">
              {/* Filename Setting */}
              <div className="lg:col-span-4 space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <Settings2 size={12} className="text-primary" />
                  Tên file kết quả
                </label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={outputName}
                    onChange={(e) => {
                      setOutputName(e.target.value);
                      if (e.target.value.trim()) setNameError(false);
                    }}
                    placeholder="Nhập tên file..."
                    className={cn(
                      "w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 transition-all pr-12",
                      nameError ? "border-red-200 focus:ring-red-50 bg-red-50/30" : "border-slate-100 focus:ring-primary/5 focus:border-primary/30 focus:bg-white"
                    )}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">
                    .pdf
                  </div>
                </div>
              </div>

              {/* Quality Setting */}
              <div className="lg:col-span-4 space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <FileCode size={12} className="text-accent" />
                  Kích thước file
                </label>
                <div className="flex p-1 bg-slate-50/80 rounded-xl border border-slate-100/50">
                  {(Object.keys(qualitySettings) as Array<keyof typeof qualitySettings>).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                        quality === q 
                          ? "bg-white text-primary shadow-sm border border-slate-100" 
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {q === 'small' ? 'Nhỏ' : q === 'medium' ? 'Vừa' : 'Gốc'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions & Progress */}
              <div className="lg:col-span-4 flex flex-col justify-end pt-1">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {files.length} tệp • {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                  </span>
                  {isMerging && <span className="text-[10px] font-black text-primary animate-pulse uppercase tracking-widest">Đang xử lý {progress}%</span>}
                </div>

                {isMerging ? (
                  <div className="progress-bar-modern !h-10 flex items-center px-4 bg-slate-50 border border-slate-100">
                    <motion.div 
                      className="progress-fill-modern !h-6"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Loader2 size={16} className="animate-spin text-primary mr-2" />
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">Đang gộp...</span>
                    </div>
                  </div>
                ) : mergedFileUrl ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={downloadFile}
                      className="w-full modern-btn !py-2.5 !from-green-500 !to-emerald-600 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 !px-4 text-[10px]"
                    >
                      <Download size={14} />
                      TẢI VỀ
                    </button>
                    <button 
                      onClick={() => {
                        setMergedFileUrl(null);
                        setProgress(0);
                      }}
                      className="w-full modern-btn-secondary !py-2.5 !px-4 text-[10px]"
                    >
                      LÀM MỚI
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={mergeFiles}
                    disabled={files.length === 0}
                    className={cn(
                      "w-full modern-btn !py-2.5 flex items-center justify-center gap-2 text-[10px]",
                      files.length === 0 && "opacity-50 cursor-not-allowed grayscale shadow-none"
                    )}
                  >
                    GỘP FILE NGAY
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: File List - Occupies 70% of height */}
        <div className="flex-1 min-h-0 h-[70vh] flex flex-col">
          <div className="modern-card !p-0 flex-1 flex flex-col overflow-hidden">
            {files.length === 0 ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "flex-1 flex flex-col items-center justify-center p-10 transition-all cursor-pointer group",
                  isDragActive ? "bg-primary/5" : "hover:bg-slate-50/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/10 transition-all duration-500">
                  <Upload className={cn("text-slate-300 transition-colors duration-500", isDragActive ? "text-primary animate-bounce" : "group-hover:text-primary")} size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Kéo & Thả tệp PDF</h2>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Hoặc nhấp để chọn từ máy tính</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-bottom border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10">
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Danh sách tệp tin ({files.length})</h2>
                  <button 
                    onClick={removeAll}
                    className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Xóa tất cả
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <Reorder.Group 
                    axis="y" 
                    values={files} 
                    onReorder={setFiles}
                    className="space-y-3"
                  >
                    <AnimatePresence mode="popLayout">
                      {files.map((file) => (
                        <Reorder.Item 
                          key={file.id}
                          value={file}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
                        >
                          <div className="text-slate-300 group-hover:text-primary transition-colors">
                            <GripVertical size={18} />
                          </div>
                          
                          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-100">
                            {file.preview ? (
                              <img src={file.preview} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="text-primary" size={20} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 truncate text-sm">
                              {file.name}
                            </h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                              {formatBytes(file.size)} • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </p>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </Reorder.Item>
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>

                  <div 
                    {...getRootProps()} 
                    className="mt-4 border-2 border-dashed border-slate-100 rounded-xl p-4 flex items-center justify-center hover:border-primary/40 hover:bg-white transition-all cursor-pointer group"
                  >
                    <input {...getInputProps()} />
                    <p className="text-[10px] font-black text-slate-400 group-hover:text-primary transition-colors uppercase tracking-[0.2em]">
                      + THÊM TỆP TIN KHÁC
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
