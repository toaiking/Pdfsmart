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
    <div className="min-h-screen flex items-center justify-center p-6 md:p-12 font-sans">
      <main className="max-w-5xl w-full space-y-8">
        <div className="text-center mb-12">
          <div className="inline-flex flex-col items-center gap-4 p-8 bg-white/40 backdrop-blur-md rounded-[40px] border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl shadow-primary/20 bg-white p-1">
                <img 
                  src="https://i.postimg.cc/59K4PjLQ/logopdf.png" 
                  alt="Smart PDF Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="space-y-1">
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">
                  Smart <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">PDF</span>
                </h1>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                  <span className="w-8 h-[2px] bg-slate-200" />
                  Gộp tệp tin siêu tốc
                  <span className="w-8 h-[2px] bg-slate-200" />
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Top Section: Settings & Actions */}
          <div className="modern-card !p-6 md:!p-8 overflow-hidden relative">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Filename Setting */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <Settings2 size={12} className="text-primary" />
                    Tên file kết quả
                  </label>
                  <AnimatePresence>
                    {nameError && (
                      <motion.span 
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] font-bold text-red-500 uppercase"
                      >
                        Trống!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
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
                      "w-full bg-slate-50/50 border rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 transition-all pr-14",
                      nameError ? "border-red-200 focus:ring-red-50 bg-red-50/30" : "border-slate-100 focus:ring-primary/5 focus:border-primary/30 focus:bg-white"
                    )}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">
                    .pdf
                  </div>
                </div>
              </div>

              {/* Quality Setting */}
              <div className="lg:col-span-4 space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <FileCode size={12} className="text-accent" />
                  Kích thước file
                </label>
                <div className="flex p-1 bg-slate-50/80 rounded-2xl border border-slate-100/50">
                  {(Object.keys(qualitySettings) as Array<keyof typeof qualitySettings>).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={cn(
                        "flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider",
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
              <div className="lg:col-span-4 flex flex-col justify-end h-full pt-2 lg:pt-0">
                <div className="flex justify-between items-center mb-3 px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {files.length} tệp • {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                  </span>
                  {isMerging && <span className="text-[10px] font-black text-primary animate-pulse uppercase tracking-widest">Đang xử lý {progress}%</span>}
                </div>

                {isMerging ? (
                  <div className="space-y-3">
                    <div className="progress-bar-modern !h-12 flex items-center px-4 bg-slate-50 border border-slate-100">
                      <motion.div 
                        className="progress-fill-modern !h-8"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Loader2 size={18} className="animate-spin text-primary mr-2" />
                         <span className="text-[10px] font-black text-primary uppercase tracking-widest">Đang gộp...</span>
                      </div>
                    </div>
                  </div>
                ) : mergedFileUrl ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={downloadFile}
                      className="w-full modern-btn !py-3.5 !from-green-500 !to-emerald-600 flex items-center justify-center gap-2 shadow-xl shadow-green-500/20 !px-4 text-xs"
                    >
                      <Download size={16} />
                      TẢI VỀ
                    </button>
                    <button 
                      onClick={() => {
                        setMergedFileUrl(null);
                        setProgress(0);
                      }}
                      className="w-full modern-btn-secondary !py-3.5 !px-4 text-xs"
                    >
                      LÀM MỚI
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={mergeFiles}
                    disabled={files.length === 0}
                    className={cn(
                      "w-full modern-btn !py-3.5 flex items-center justify-center gap-2 text-xs",
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

          {/* Bottom Section: File List / Dropzone */}
          <div className="w-full">
            {files.length === 0 ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "modern-card dropzone-modern flex flex-col items-center justify-center transition-all cursor-pointer min-h-[350px]",
                  isDragActive ? "border-primary bg-white/80 scale-[0.99] shadow-2xl" : ""
                )}
              >
                <input {...getInputProps()} />
                <div className="w-20 h-20 bg-linear-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center text-primary mb-6">
                  <Upload size={40} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 mb-2">Kéo thả tệp vào đây</h2>
                <p className="text-slate-400 text-center max-w-xs mb-8 text-sm font-medium leading-relaxed">
                  Hỗ trợ PDF, JPG, PNG. Nhấn để chọn tệp từ máy tính.
                </p>
                <button className="modern-btn !py-3 !px-6 text-sm">
                  Chọn tệp tin
                </button>
              </div>
            ) : (
              <div className="modern-card !p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                    Danh sách tệp tin
                    <span className="text-xs font-black text-white bg-linear-to-r from-primary to-accent px-3 py-1 rounded-full shadow-sm">
                      {files.length}
                    </span>
                  </h2>
                  <button 
                    onClick={removeAll}
                    className="text-xs text-slate-400 hover:text-red-500 font-bold transition-all hover:scale-105"
                  >
                    XÓA TẤT CẢ
                  </button>
                </div>

                <Reorder.Group axis="y" values={files} onReorder={setFiles} className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {files.map((file) => (
                      <Reorder.Item
                        key={file.id}
                        value={file}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white/50 border border-white/60 rounded-2xl p-5 flex items-center gap-5 shadow-sm hover:shadow-xl hover:bg-white transition-all group cursor-grab active:cursor-grabbing"
                      >
                        <div className="text-slate-300 group-hover:text-primary transition-colors">
                          <GripVertical size={20} />
                        </div>
                        
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-100 shadow-inner">
                          {file.preview ? (
                            <img src={file.preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="text-primary" size={24} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 truncate text-base">
                            {file.name}
                          </h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {formatBytes(file.size)} • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </p>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <X size={20} />
                        </button>
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>

                <div 
                  {...getRootProps()} 
                  className="mt-6 border-2 border-dashed border-slate-100 rounded-2xl p-6 flex items-center justify-center hover:border-primary/40 hover:bg-white transition-all cursor-pointer group"
                >
                  <input {...getInputProps()} />
                  <p className="text-xs font-black text-slate-400 group-hover:text-primary transition-colors uppercase tracking-[0.2em]">
                    + THÊM TỆP TIN KHÁC
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
