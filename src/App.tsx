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
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else if (fileItem.type.startsWith('image/')) {
          let image;
          if (fileItem.type === 'image/jpeg' || fileItem.type === 'image/jpg') {
            image = await mergedPdf.embedJpg(fileBytes);
          } else {
            image = await mergedPdf.embedPng(fileBytes);
          }
          
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
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
        <div className="text-center space-y-2 mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm mb-4">
            <div className="w-6 h-6 bg-linear-to-br from-primary to-accent rounded-md flex items-center justify-center text-white">
              <FilePlus2 size={14} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">SmartPDF Pro</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
            Gộp tệp tin <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">siêu tốc</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Content Area */}
          <div className="lg:col-span-7">
            {files.length === 0 ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "modern-card dropzone-modern flex flex-col items-center justify-center transition-all cursor-pointer min-h-[450px]",
                  isDragActive ? "border-primary bg-white/80 scale-[0.99] shadow-2xl" : ""
                )}
              >
                <input {...getInputProps()} />
                <div className="w-24 h-24 bg-linear-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center text-primary mb-8">
                  <Upload size={48} />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 mb-3">Bắt đầu ngay</h2>
                <p className="text-slate-400 text-center max-w-xs mb-10 text-sm font-medium leading-relaxed">
                  Kéo thả PDF hoặc hình ảnh vào đây để gộp chúng thành một tệp duy nhất.
                </p>
                <button className="modern-btn">
                  Chọn tệp từ máy
                </button>
              </div>
            ) : (
              <div className="modern-card !p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                    Tệp đã chọn
                    <span className="text-xs font-black text-white bg-linear-to-r from-primary to-accent px-3 py-1 rounded-full shadow-sm">
                      {files.length}
                    </span>
                  </h2>
                  <button 
                    onClick={removeAll}
                    className="text-xs text-slate-400 hover:text-red-500 font-bold transition-all hover:scale-105"
                  >
                    LÀM TRỐNG
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

          {/* Right Sidebar - Action */}
          <div className="lg:col-span-5">
            <div className="modern-card !p-8 sticky top-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-linear-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center text-primary">
                  <Settings2 size={20} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">Cài đặt</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Tên file kết quả
                    </label>
                    <AnimatePresence>
                      {nameError && (
                        <motion.span 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-[10px] font-bold text-red-500 uppercase"
                        >
                          Vui lòng nhập tên file!
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={outputName}
                      onChange={(e) => {
                        setOutputName(e.target.value);
                        if (e.target.value.trim()) setNameError(false);
                      }}
                      className={cn(
                        "w-full bg-white border rounded-2xl px-5 py-4 text-base font-bold text-slate-800 focus:outline-none focus:ring-4 transition-all shadow-sm pr-16",
                        nameError ? "border-red-300 focus:ring-red-100" : "border-slate-100 focus:ring-primary/10 focus:border-primary"
                      )}
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      .pdf
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/50 rounded-3xl space-y-4 border border-white/60">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng:</span>
                    <span className="font-black text-slate-800">{files.length} tệp</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dung lượng:</span>
                    <span className="font-black text-slate-800">
                      {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                    </span>
                  </div>
                  
                  {(isMerging || mergedFileUrl) && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="progress-bar-modern">
                        <motion.div 
                          className="progress-fill-modern"
                          initial={{ width: 0 }}
                          animate={{ width: mergedFileUrl ? '100%' : `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {isMerging ? (
                  <button disabled className="w-full modern-btn opacity-80 flex items-center justify-center gap-3">
                    <Loader2 size={24} className="animate-spin" />
                    ĐANG XỬ LÝ
                  </button>
                ) : mergedFileUrl ? (
                  <div className="space-y-4">
                    <button 
                      onClick={downloadFile}
                      className="w-full modern-btn !from-green-500 !to-emerald-600 flex items-center justify-center gap-3 shadow-xl shadow-green-500/20"
                    >
                      <Download size={22} />
                      TẢI FILE VỀ
                    </button>
                    <button 
                      onClick={() => setMergedFileUrl(null)}
                      className="w-full modern-btn-secondary"
                    >
                      LÀM MỚI
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={mergeFiles}
                    disabled={files.length === 0}
                    className={cn(
                      "w-full modern-btn flex items-center justify-center gap-3",
                      files.length === 0 && "opacity-50 cursor-not-allowed grayscale shadow-none"
                    )}
                  >
                    GỘP FILE NGAY
                    <ChevronRight size={22} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
