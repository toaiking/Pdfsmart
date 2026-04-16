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

  const compressImage = async (file: File, scale: number): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (!blob) return reject('Blob error');
          const reader = new FileReader();
          reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', scale < 1 ? 0.7 : 0.9);
      };
      img.onerror = () => reject('Image load error');
      img.src = URL.createObjectURL(file);
    });
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
      mergedPdf.setCreator('Smart PDF App');
      mergedPdf.setProducer('Smart PDF App');
      
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        
        if (fileItem.type === 'application/pdf') {
          const fileBytes = await fileItem.file.arrayBuffer();
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
          const scale = qualitySettings[quality].scale;
          const compressedBytes = quality === 'large' 
            ? new Uint8Array(await fileItem.file.arrayBuffer())
            : await compressImage(fileItem.file, scale);
          
          const image = await mergedPdf.embedJpg(compressedBytes);
          const width = image.width;
          const height = image.height;
          
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
      
      const pdfBytes = await mergedPdf.save({ 
        useObjectStreams: true,
        addDefaultPage: false
      });
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
    <div className="h-screen w-screen overflow-hidden bg-[#020617] font-sans flex flex-col relative">
      {/* Ultra-Vibrant Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/30 blur-[150px] rounded-full animate-pulse mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/30 blur-[150px] rounded-full animate-pulse delay-1000 mix-blend-screen" />
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-bounce duration-[10s]" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <main className="flex-1 flex flex-col p-4 md:p-6 gap-6 overflow-hidden relative z-10">
        {/* Top Section: Hero & Settings */}
        <div className="flex flex-col gap-4 flex-shrink-0">
          {/* Hero Container - Ultra Vibrant */}
          <div className="w-full p-4 md:p-5 bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,161,241,0.1)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            {/* Neon Border Effect */}
            <div className="absolute inset-0 border border-primary/20 rounded-3xl group-hover:border-primary/50 transition-colors duration-500" />
            
            <div className="relative flex items-center justify-center gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(0,161,241,0.3)] bg-white p-1.5 flex-shrink-0 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <img 
                  src="https://i.postimg.cc/59K4PjLQ/logopdf.png" 
                  alt="Smart PDF Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-left">
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  Smart <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-indigo-400 to-accent animate-gradient-x">PDF App</span>
                </h1>
                <p className="text-primary font-black text-[10px] md:text-xs uppercase tracking-[0.4em] mt-2 flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-linear-to-r from-primary to-transparent" />
                  Gộp tệp tin siêu tốc
                  <span className="w-8 h-[2px] bg-linear-to-l from-primary to-transparent" />
                </p>
              </div>
            </div>
          </div>

          {/* Settings Container - Vibrant Glass */}
          <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 p-5 md:p-7 relative overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-primary/20 to-accent/20 rounded-full -mr-32 -mt-32 blur-[100px] animate-pulse" />
            
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-center">
              {/* Filename Setting */}
              <div className="lg:col-span-4 space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                  <Settings2 size={14} className="animate-spin-slow" />
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
                      "w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 transition-all pr-16 group-hover:border-primary/30",
                      nameError ? "border-red-500/50 focus:ring-red-500/20 bg-red-500/10" : "focus:ring-primary/20 focus:border-primary/60 focus:bg-white/[0.08]"
                    )}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-primary/60 font-black text-xs">
                    .pdf
                  </div>
                </div>
              </div>

              {/* Quality Setting */}
              <div className="lg:col-span-4 space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-[0.2em]">
                  <FileCode size={14} />
                  Kích thước file (Resize)
                </label>
                <div className="flex p-1.5 bg-white/[0.05] rounded-2xl border border-white/10 group-hover:border-accent/30 transition-colors">
                  {(Object.keys(qualitySettings) as Array<keyof typeof qualitySettings>).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={cn(
                        "flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest relative overflow-hidden group/btn",
                        quality === q 
                          ? "text-white shadow-[0_0_20px_rgba(0,161,241,0.4)]" 
                          : "text-slate-500 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {quality === q && (
                        <motion.div 
                          layoutId="quality-bg"
                          className="absolute inset-0 bg-linear-to-r from-primary to-accent z-0"
                        />
                      )}
                      <span className="relative z-10">{q === 'small' ? 'Nhỏ' : q === 'medium' ? 'Vừa' : 'Gốc'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions & Progress */}
              <div className="lg:col-span-4 flex flex-col justify-end pt-2">
                <div className="flex justify-between items-center mb-3 px-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {files.length} tệp • {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                  </span>
                  {isMerging && <span className="text-[10px] font-black text-primary animate-pulse uppercase tracking-widest">Đang xử lý {progress}%</span>}
                </div>

                {isMerging ? (
                  <div className="h-14 flex items-center px-6 bg-white/[0.05] rounded-2xl border border-white/10 relative overflow-hidden">
                    <motion.div 
                      className="absolute left-0 top-0 bottom-0 bg-linear-to-r from-primary via-indigo-500 to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                    <div className="relative flex items-center justify-center w-full">
                       <Loader2 size={20} className="animate-spin text-white mr-3" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md">Đang nén & gộp...</span>
                    </div>
                  </div>
                ) : mergedFileUrl ? (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={downloadFile}
                      className="w-full bg-linear-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(16,185,129,0.3)] transition-all active:scale-95 text-[11px] tracking-[0.2em] uppercase"
                    >
                      <Download size={18} />
                      TẢI VỀ
                    </button>
                    <button 
                      onClick={() => {
                        setMergedFileUrl(null);
                        setProgress(0);
                      }}
                      className="w-full bg-white/[0.05] hover:bg-white/[0.1] text-white font-black py-4 rounded-2xl border border-white/10 transition-all active:scale-95 text-[11px] tracking-[0.2em] uppercase"
                    >
                      LÀM MỚI
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={mergeFiles}
                    disabled={files.length === 0}
                    className={cn(
                      "w-full bg-linear-to-r from-primary via-indigo-600 to-accent hover:scale-[1.02] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_15px_50px_rgba(0,161,241,0.4)] transition-all active:scale-95 text-[11px] tracking-[0.2em] uppercase group/merge",
                      files.length === 0 && "opacity-50 cursor-not-allowed grayscale shadow-none hover:scale-100"
                    )}
                  >
                    GỘP FILE NGAY
                    <ChevronRight size={20} className="group-hover/merge:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: File List - Occupies 70% of height */}
        <div className="flex-1 min-h-0 h-[70vh] flex flex-col">
          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[40px] border border-white/10 flex-1 flex flex-col overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative">
            {/* Neon Glow Corner */}
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
            
            {files.length === 0 ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "flex-1 flex flex-col items-center justify-center p-10 transition-all cursor-pointer group relative",
                  isDragActive ? "bg-primary/10" : "hover:bg-white/[0.02]"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-32 h-32 rounded-[48px] bg-white/[0.03] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:bg-white/[0.08] group-hover:shadow-[0_0_60px_rgba(0,161,241,0.2)] transition-all duration-700 border border-white/10 relative">
                  <div className="absolute inset-0 bg-linear-to-br from-primary/20 to-accent/20 rounded-[48px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <Upload className={cn("text-slate-700 transition-all duration-700 relative z-10", isDragActive ? "text-primary animate-bounce scale-110" : "group-hover:text-primary group-hover:scale-110")} size={56} />
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight group-hover:text-primary transition-colors duration-500">Kéo & Thả tệp PDF</h2>
                <p className="text-slate-500 font-black text-sm uppercase tracking-[0.4em] opacity-60 group-hover:opacity-100 transition-all">Hoặc nhấp để chọn từ máy tính</p>
                
                {/* Decorative Elements */}
                <div className="absolute bottom-12 flex gap-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white/[0.05] group-hover:bg-primary/20 transition-colors" style={{ transitionDelay: `${i * 100}ms` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.03] backdrop-blur-2xl z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(0,161,241,0.8)] animate-pulse" />
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.4em]">Danh sách tệp tin ({files.length})</h2>
                  </div>
                  <button 
                    onClick={removeAll}
                    className="text-[11px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest transition-all flex items-center gap-2 px-4 py-2 bg-red-500/5 rounded-xl border border-red-500/10 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                    Xóa tất cả
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
                  <Reorder.Group 
                    axis="y" 
                    values={files} 
                    onReorder={setFiles}
                    className="space-y-5"
                  >
                    <AnimatePresence mode="popLayout">
                      {files.map((file) => (
                        <Reorder.Item 
                          key={file.id}
                          value={file}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white/[0.03] border border-white/10 rounded-[28px] p-6 flex items-center gap-6 shadow-2xl hover:shadow-primary/10 hover:bg-white/[0.06] hover:border-white/20 transition-all group cursor-grab active:cursor-grabbing relative overflow-hidden"
                        >
                          {/* Item Glow */}
                          <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="text-slate-700 group-hover:text-primary transition-colors">
                            <GripVertical size={24} />
                          </div>
                          
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            {file.preview ? (
                              <img src={file.preview} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="text-primary" size={28} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white truncate text-lg group-hover:text-primary transition-colors duration-300">
                              {file.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/[0.05] px-3 py-1 rounded-lg border border-white/5">
                                {formatBytes(file.size)}
                              </span>
                              <span className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </span>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-700 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-90"
                          >
                            <X size={24} />
                          </button>
                        </Reorder.Item>
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>

                  <div 
                    {...getRootProps()} 
                    className="mt-8 border-2 border-dashed border-white/10 rounded-[32px] p-10 flex flex-col items-center justify-center hover:border-primary/60 hover:bg-white/[0.03] transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500 relative z-10">
                      <FilePlus2 className="text-slate-600 group-hover:text-primary transition-colors" size={28} />
                    </div>
                    <p className="text-[11px] font-black text-slate-500 group-hover:text-white transition-colors uppercase tracking-[0.4em] relative z-10">
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
