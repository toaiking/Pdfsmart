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
              const { width, height } = page.getSize();
              page.scale(scale, scale);
              page.setSize(width * scale, height * scale);
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
      
      const pdfBytes = await mergedPdf.save({ useObjectStreams: true });
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
    <div className="h-screen w-screen overflow-hidden bg-slate-950 font-sans flex flex-col relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <main className="flex-1 flex flex-col p-4 md:p-6 gap-6 overflow-hidden relative z-10">
        {/* Top Section: Hero & Settings */}
        <div className="flex flex-col gap-4 flex-shrink-0">
          {/* Hero Container - Compact & Full Width */}
          <div className="w-full p-4 md:p-5 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative flex items-center justify-center gap-6">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl shadow-primary/20 bg-white p-1.5 flex-shrink-0 transform group-hover:rotate-6 transition-transform duration-500">
                <img 
                  src="https://i.postimg.cc/59K4PjLQ/logopdf.png" 
                  alt="Smart PDF Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-left">
                <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-white leading-none">
                  Smart <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">PDF App</span>
                </h1>
                <p className="text-slate-400 font-black text-[10px] md:text-xs uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-primary/40" />
                  Gộp tệp tin siêu tốc
                  <span className="w-4 h-[1px] bg-primary/40" />
                </p>
              </div>
            </div>
          </div>

          {/* Settings Container - Full Width */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-5 md:p-7 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-linear-to-br from-primary/10 to-accent/10 rounded-full -mr-24 -mt-24 blur-3xl" />
            
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-center">
              {/* Filename Setting */}
              <div className="lg:col-span-4 space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <Settings2 size={14} className="text-primary" />
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
                      "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 transition-all pr-14",
                      nameError ? "border-red-500/50 focus:ring-red-500/10 bg-red-500/5" : "focus:ring-primary/20 focus:border-primary/50 focus:bg-white/10"
                    )}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">
                    .pdf
                  </div>
                </div>
              </div>

              {/* Quality Setting */}
              <div className="lg:col-span-4 space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <FileCode size={14} className="text-accent" />
                  Kích thước file
                </label>
                <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10">
                  {(Object.keys(qualitySettings) as Array<keyof typeof qualitySettings>).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={cn(
                        "flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider",
                        quality === q 
                          ? "bg-linear-to-r from-primary to-accent text-white shadow-lg shadow-primary/20" 
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {q === 'small' ? 'Nhỏ' : q === 'medium' ? 'Vừa' : 'Gốc'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions & Progress */}
              <div className="lg:col-span-4 flex flex-col justify-end pt-2">
                <div className="flex justify-between items-center mb-3 px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {files.length} tệp • {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                  </span>
                  {isMerging && <span className="text-[10px] font-black text-primary animate-pulse uppercase tracking-widest">Đang xử lý {progress}%</span>}
                </div>

                {isMerging ? (
                  <div className="h-12 flex items-center px-5 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
                    <motion.div 
                      className="absolute left-0 top-0 bottom-0 bg-linear-to-r from-primary to-accent opacity-30"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                    <div className="relative flex items-center justify-center w-full">
                       <Loader2 size={18} className="animate-spin text-primary mr-3" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">Đang gộp...</span>
                    </div>
                  </div>
                ) : mergedFileUrl ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={downloadFile}
                      className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95 text-[10px] tracking-widest uppercase"
                    >
                      <Download size={16} />
                      TẢI VỀ
                    </button>
                    <button 
                      onClick={() => {
                        setMergedFileUrl(null);
                        setProgress(0);
                      }}
                      className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-3.5 rounded-2xl border border-white/10 transition-all active:scale-95 text-[10px] tracking-widest uppercase"
                    >
                      LÀM MỚI
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={mergeFiles}
                    disabled={files.length === 0}
                    className={cn(
                      "w-full bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-primary/30 transition-all active:scale-95 text-[10px] tracking-widest uppercase",
                      files.length === 0 && "opacity-50 cursor-not-allowed grayscale shadow-none"
                    )}
                  >
                    GỘP FILE NGAY
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: File List - Occupies 70% of height */}
        <div className="flex-1 min-h-0 h-[70vh] flex flex-col">
          <div className="bg-white/5 backdrop-blur-xl rounded-[32px] border border-white/10 flex-1 flex flex-col overflow-hidden shadow-2xl">
            {files.length === 0 ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "flex-1 flex flex-col items-center justify-center p-10 transition-all cursor-pointer group relative",
                  isDragActive ? "bg-primary/10" : "hover:bg-white/5"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-28 h-28 rounded-[40px] bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-white/10 group-hover:shadow-2xl group-hover:shadow-primary/20 transition-all duration-500 border border-white/10">
                  <Upload className={cn("text-slate-600 transition-colors duration-500", isDragActive ? "text-primary animate-bounce" : "group-hover:text-primary")} size={48} />
                </div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Kéo & Thả tệp PDF</h2>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.3em]">Hoặc nhấp để chọn từ máy tính</p>
                
                {/* Decorative dots */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.3em]">Danh sách tệp tin ({files.length})</h2>
                  </div>
                  <button 
                    onClick={removeAll}
                    className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Xóa tất cả
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
                  <Reorder.Group 
                    axis="y" 
                    values={files} 
                    onReorder={setFiles}
                    className="space-y-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {files.map((file) => (
                        <Reorder.Item 
                          key={file.id}
                          value={file}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-5 shadow-lg hover:shadow-primary/5 hover:bg-white/10 hover:border-white/20 transition-all group cursor-grab active:cursor-grabbing"
                        >
                          <div className="text-slate-600 group-hover:text-primary transition-colors">
                            <GripVertical size={20} />
                          </div>
                          
                          <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10 shadow-inner group-hover:scale-105 transition-transform">
                            {file.preview ? (
                              <img src={file.preview} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="text-primary" size={24} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white truncate text-base group-hover:text-primary transition-colors">
                              {file.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                                {formatBytes(file.size)}
                              </span>
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </span>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-red-500/10 hover:text-red-500 transition-all"
                          >
                            <X size={20} />
                          </button>
                        </Reorder.Item>
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>

                  <div 
                    {...getRootProps()} 
                    className="mt-6 border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-primary/40 hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <input {...getInputProps()} />
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                      <FilePlus2 className="text-slate-600 group-hover:text-primary transition-colors" size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 group-hover:text-primary transition-colors uppercase tracking-[0.3em]">
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
