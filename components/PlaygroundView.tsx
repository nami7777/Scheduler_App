
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Worklet, Material, DailyTask, Assignment, Exam, MaterialType, AllAnnotations, Annotation, PathAnnotation, TextAnnotation, PageAnnotations, ImageAnnotation } from '../types.ts';
import { ChevronLeftIcon, PlusIcon, PencilIcon, StarIcon, HandRaisedIcon, MinusIcon, ChatBubbleLeftIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, EyeIcon, EyeSlashIcon, PhotoIcon, PaintBrushIcon, Squares2X2Icon, ListBulletIcon, LassoIcon } from './icons.tsx';
import { getYoutubeVideoId } from '../utils.ts';

type Tool = 'pan' | 'pen' | 'highlighter' | 'line' | 'text' | 'eraser' | 'lasso-eraser';
type NotebookBackground = 'blank' | 'grid' | 'lines';
type InteractionMode = 'moving' | 'resizing-br' | 'resizing-bl' | 'resizing-tr' | 'resizing-tl' | null;

const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [ref, callback]);
};

// --- ANNOTATION TOOLBAR ---
const AnnotationToolbar: React.FC<{
    tool: Tool;
    setTool: (tool: Tool) => void;
    color: string;
    setColor: (color: string) => void;
    lineWidth: number;
    setLineWidth: (width: number) => void;
    handleUndo: () => void;
    handleRedo: () => void;
    undoStackSize: number;
    redoStackSize: number;
    onTogglePageHighlighted: () => void;
    isPageHighlighted: boolean;
    materialType: MaterialType;
    onSetBackground: (bg: NotebookBackground) => void;
    onAddImage: () => void;
    currentPage: number;
    numPages: number;
    setCurrentPage: (page: number) => void;
}> = (props) => {
    const { tool, setTool, color, setColor, lineWidth, setLineWidth, handleUndo, handleRedo, undoStackSize, redoStackSize, onTogglePageHighlighted, isPageHighlighted, materialType, onSetBackground, onAddImage, currentPage, numPages, setCurrentPage } = props;
    
    const [activePopover, setActivePopover] = useState<'tools' | 'background' | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useClickOutside(popoverRef, () => activePopover && setActivePopover(null));

    const tools = [
        { name: 'pan' as Tool, icon: <HandRaisedIcon className="w-5 h-5"/> },
        { name: 'pen' as Tool, icon: <PencilIcon className="w-5 h-5"/> },
        { name: 'highlighter' as Tool, icon: <PencilIcon className="w-5 h-5 text-yellow-400/80"/> },
        { name: 'line' as Tool, icon: <MinusIcon className="w-5 h-5"/> },
        { name: 'text' as Tool, icon: <ChatBubbleLeftIcon className="w-5 h-5"/> },
        { name: 'eraser' as Tool, icon: '🧼' },
        { name: 'lasso-eraser' as Tool, icon: <LassoIcon className="w-5 h-5"/> },
    ];
    
    return (
        <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-slate-900/80 backdrop-blur-lg rounded-xl shadow-2xl border border-white/10">
            {tools.map(t => (
                <button key={t.name} onClick={() => setTool(t.name)} className={`p-2 rounded-lg ${tool === t.name ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/80'}`} title={t.name}>
                    {t.icon}
                </button>
            ))}

            <div className="h-6 w-px bg-slate-600/70 mx-1"></div>
            
            <div className="relative" ref={popoverRef}>
                <button onClick={() => setActivePopover(p => p === 'tools' ? null : 'tools')} style={{backgroundColor: color}} className={`w-6 h-6 rounded-md border-2 ${tool === 'highlighter' ? 'border-yellow-400' : 'border-white/50'}`} />
                 {activePopover === 'tools' && (
                    <div className="absolute bottom-full mb-2 p-3 bg-slate-800 rounded-lg shadow-xl border border-white/10 space-y-3 w-48">
                        <label className="text-xs font-bold text-slate-400">Color</label>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-8 border-none bg-transparent cursor-pointer" />
                        <label className="text-xs font-bold text-slate-400">Stroke</label>
                        <div className="flex items-center gap-3">
                            <input type="range" min="2" max="32" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-full h-1 bg-slate-500/50 rounded-lg appearance-none cursor-pointer"/>
                            <span className="text-xs text-slate-300 font-mono w-4">{lineWidth}</span>
                        </div>
                    </div>
                )}
            </div>
            
            {materialType === 'NOTEBOOK' && (
                <button onClick={onAddImage} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/80" title="Add Image">
                    <PhotoIcon className="w-5 h-5" />
                </button>
            )}

             {materialType === 'NOTEBOOK' && (
                 <div className="relative">
                    <button onClick={() => setActivePopover(p => p === 'background' ? null : 'background')} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/80" title="Change Background">
                        <Squares2X2Icon className="w-5 h-5" />
                    </button>
                     {activePopover === 'background' && (
                        <div ref={popoverRef} className="absolute bottom-full mb-2 p-2 bg-slate-800 rounded-lg shadow-xl border border-white/10 space-y-1">
                           {(['blank', 'lines', 'grid'] as NotebookBackground[]).map(bg => (
                               <button key={bg} onClick={() => {onSetBackground(bg); setActivePopover(null);}} className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-blue-600 rounded-md capitalize">{bg}</button>
                           ))}
                        </div>
                    )}
                </div>
            )}

            <div className="h-6 w-px bg-slate-600/70 mx-1"></div>
            <button onClick={handleUndo} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed" disabled={undoStackSize === 0}><ArrowUturnLeftIcon className="w-5 h-5"/></button>
            <button onClick={handleRedo} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed" disabled={redoStackSize === 0}><ArrowUturnRightIcon className="w-5 h-5"/></button>
            
            <div className="h-6 w-px bg-slate-600/70 mx-1"></div>
            <div className="flex items-center gap-1 text-white">
                <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 1} className="p-2 rounded-full hover:bg-slate-700/80 disabled:opacity-50"><ChevronLeftIcon className="w-5 h-5"/></button>
                <span className="text-sm font-medium tabular-nums w-20 text-center">{currentPage} / {numPages}</span>
                <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= numPages} className="p-2 rounded-full hover:bg-slate-700/80 disabled:opacity-50"><ChevronLeftIcon className="w-5 h-5 rotate-180"/></button>
            </div>

            <div className="h-6 w-px bg-slate-600/70 mx-1"></div>
            <button onClick={onTogglePageHighlighted} className="p-2 rounded-lg text-slate-400 hover:text-yellow-400"><StarIcon className={`w-5 h-5 transition-colors ${isPageHighlighted ? 'text-yellow-400 fill-yellow-400' : ''}`}/></button>
        </div>
    );
};

const drawAnnotationOnContext = async (ctx: CanvasRenderingContext2D, annotation: Annotation, selectedAnnotationId?: string | null) => {
    ctx.save();
    if (annotation.type === 'path') {
        const isHighlighter = annotation.mode === 'highlighter';
        const isEraser = annotation.mode === 'eraser';

        if (isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = isHighlighter ? 'multiply' : 'source-over';
            ctx.globalAlpha = isHighlighter ? 0.4 : 1.0;
        }

        ctx.beginPath();
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if(annotation.points.length > 0) {
            ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
            annotation.points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    } else if (annotation.type === 'text') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = annotation.color;
        ctx.font = `${annotation.size}px ${annotation.font}`;
        ctx.textBaseline = 'top';
        ctx.fillText(annotation.text, annotation.x, annotation.y);
    } else if (annotation.type === 'image') {
        const img = new Image();
        await new Promise<void>((resolve, reject) => { 
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
            img.src = annotation.imageData; 
        });
        ctx.drawImage(img, annotation.x, annotation.y, annotation.width, annotation.height);
    }
    ctx.restore();
    
    // Draw selection handles
    if (selectedAnnotationId === annotation.id && (annotation.type === 'text' || annotation.type === 'image')) {
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);

        if (annotation.type === 'image') {
            const handleSize = 8;
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(annotation.x - handleSize/2, annotation.y - handleSize/2, handleSize, handleSize); // tl
            ctx.fillRect(annotation.x + annotation.width - handleSize/2, annotation.y - handleSize/2, handleSize, handleSize); // tr
            ctx.fillRect(annotation.x - handleSize/2, annotation.y + annotation.height - handleSize/2, handleSize, handleSize); // bl
            ctx.fillRect(annotation.x + annotation.width - handleSize/2, annotation.y + annotation.height - handleSize/2, handleSize, handleSize); // br
        }
        ctx.restore();
    }
};


const PageNavigator: React.FC<{
    numPages: number;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    material: Material;
    pdfDoc: any;
    highlightedPages: number[];
    onAddPage?: () => void;
}> = ({ numPages, currentPage, setCurrentPage, material, pdfDoc, highlightedPages, onAddPage }) => {
    
    const previewCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const intersectionObserver = useRef<IntersectionObserver | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const renderPreview = useCallback(async (pageNum: number) => {
        const canvas = previewCanvasRefs.current[pageNum - 1];
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const previewScale = 0.15;
        
        if (material.type === MaterialType.PDF && pdfDoc) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: previewScale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
        } else if (material.type === MaterialType.NOTEBOOK) {
            const isLandscape = material.orientation === 'landscape';
            const dims = { width: isLandscape ? 1550 : 1200, height: isLandscape ? 1200 : 1550 };
            canvas.width = dims.width * previewScale;
            canvas.height = dims.height * previewScale;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        const pageAnnotations = material.annotations?.[pageNum] || [];
        ctx.save();
        ctx.scale(previewScale, previewScale); 
        for (const anno of pageAnnotations) {
            await drawAnnotationOnContext(ctx, anno);
        }
        ctx.restore();

    }, [pdfDoc, material]);

    useEffect(() => {
        if (intersectionObserver.current) intersectionObserver.current.disconnect();

        intersectionObserver.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const canvas = entry.target as HTMLCanvasElement;
                    const pageNum = parseInt(canvas.dataset.pageNum || '0', 10);
                    if (pageNum) {
                        renderPreview(pageNum);
                        intersectionObserver.current?.unobserve(canvas);
                    }
                }
            });
        }, { root: scrollContainerRef.current, rootMargin: '200px 0px' });
        
        previewCanvasRefs.current.forEach(canvas => {
            if (canvas) intersectionObserver.current?.observe(canvas);
        });

        return () => intersectionObserver.current?.disconnect();
    }, [numPages, renderPreview]);
    
    useEffect(() => {
        const currentButton = document.getElementById(`preview-btn-${currentPage}`);
        currentButton?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [currentPage]);
    
    return (
        <div ref={scrollContainerRef} className="h-full w-48 flex-shrink-0 bg-slate-100 border-r border-slate-200 overflow-y-auto p-2 space-y-2">
            {Array.from({ length: numPages }).map((_, i) => {
                const pageNum = i + 1;
                const isHighlighted = highlightedPages.includes(pageNum);
                return (
                    <button
                        key={pageNum}
                        id={`preview-btn-${pageNum}`}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-full p-2 rounded-lg transition-colors border-2 ${currentPage === pageNum ? 'bg-blue-100 border-blue-500' : 'bg-white hover:bg-sky-50 border-transparent'} ${isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                    >
                        <canvas 
                            ref={el => { previewCanvasRefs.current[i] = el; }}
                            data-page-num={pageNum}
                            className="w-full h-auto bg-white shadow-md rounded-sm"
                        />
                        <span className="mt-1.5 text-xs font-medium text-slate-600 block">{pageNum}</span>
                    </button>
                )
            })}
             {material.type === MaterialType.NOTEBOOK && onAddPage && (
                <button
                    onClick={onAddPage}
                    className="w-full p-2 rounded-lg transition-colors border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center justify-center h-24"
                    title="Add New Page"
                >
                    <PlusIcon className="w-6 h-6 text-slate-400" />
                    <span className="mt-1 text-xs font-medium text-slate-500">New Page</span>
                </button>
            )}
        </div>
    );
};

// Internal Material Viewer Component
const MaterialViewer: React.FC<{
    material: Material;
    initialPage: number;
    completedPages: number[];
    onTogglePageCompleted: (page: number) => void;
    onSaveMaterial: (material: Material) => void;
    onSaveWorklet: (worklet: Worklet) => void;
    worklet?: Assignment | Exam | null;
}> = ({ material, initialPage, completedPages, onTogglePageCompleted, onSaveMaterial, onSaveWorklet, worklet }) => {
    const backgroundCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const annotationCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const interactionCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const viewerContainerRef = React.useRef<HTMLDivElement>(null);
    const imageUploadInputRef = React.useRef<HTMLInputElement>(null);

    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, _setCurrentPage] = useState(material.lastViewedPage || initialPage);
    const scale = 1.5;
    const [isLoading, setIsLoading] = useState(true);
    const [isAnnotationMode, setIsAnnotationMode] = useState(true);
    const [isNavigatorVisible, setIsNavigatorVisible] = useState(true);

    const [tool, setTool] = useState<Tool>('pen');
    const [color, setColor] = useState('#EF4444');
    const [lineWidth, setLineWidth] = useState(4);
    
    const [numPages, setNumPages] = useState(() => material.type === MaterialType.NOTEBOOK ? material.pageCount || 1 : 0);
    const [pageBackgrounds, setPageBackgrounds] = useState<{[pageNum: number]: NotebookBackground}>(() => material.pageBackgrounds || { 1: 'blank' });
    const [highlightedPages, setHighlightedPages] = useState(material.highlightedPages || []);
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
    const [annotations, setAnnotations] = useState<AllAnnotations>(() => material.annotations || {});

    const panState = React.useRef<{isPanning: boolean, startX: number, startY: number, scrollLeft: number, scrollTop: number}>({isPanning: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0});
    const interactionState = React.useRef<{
        mode: InteractionMode | 'drawing',
        annotation: Annotation, // The one being actively modified
        originalAnnotation: Annotation, // The state at mousedown
        startX: number,
        startY: number
    } | null>(null);
    const textAnnotationInputRef = React.useRef<HTMLTextAreaElement | null>(null);

    const undoStack = React.useRef<{ pageNum: number, annotations: PageAnnotations }[]>([]);
    const redoStack = React.useRef<{ pageNum: number, annotations: PageAnnotations }[]>([]);
    
    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            onSaveMaterial({ ...material, annotations, highlightedPages, pageBackgrounds, lastViewedPage: currentPage, pageCount: numPages });
        }, 1000);
        return () => clearTimeout(debounceTimeout);
    }, [annotations, highlightedPages, pageBackgrounds, currentPage, numPages, material, onSaveMaterial]);


    const setCurrentPage = (page: number) => {
        if (page > 0 && page <= numPages) {
            _setCurrentPage(page);
        }
    };
    
    const pushToUndoStack = (pageNum: number) => {
        undoStack.current.push({ pageNum, annotations: annotations[pageNum] || [] });
        redoStack.current = []; // Clear redo stack on new action
    };

    const renderMainAnnotations = async (pageNum: number) => {
        const annotationCanvas = annotationCanvasRef.current;
        if (!annotationCanvas) return;
        const ctx = annotationCanvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
        
        const pageAnnotations = (annotations[pageNum] || []).filter(anno => {
             // Do not draw the annotation that is currently being interacted with on the main canvas
            if (!interactionState.current || interactionState.current.mode === 'drawing') {
                return true;
            }
            return anno.id !== interactionState.current.originalAnnotation.id;
        });
        
        for (const anno of pageAnnotations) {
            await drawAnnotationOnContext(ctx, anno, selectedAnnotationId);
        }
    };
    
    const renderBackground = async (pageNum: number) => {
        const backgroundCanvas = backgroundCanvasRef.current;
        if (!backgroundCanvas) return;
        
        const annotationCanvas = annotationCanvasRef.current!;
        const interactionCanvas = interactionCanvasRef.current!;
        const ctx = backgroundCanvas.getContext('2d')!;

        const isLandscape = material.orientation === 'landscape';
        const dims = { width: (isLandscape ? 1550 : 1200) * scale, height: (isLandscape ? 1200 : 1550) * scale };

        if (material.type === MaterialType.PDF && pdfDoc) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            backgroundCanvas.height = viewport.height; backgroundCanvas.width = viewport.width;
            annotationCanvas.height = viewport.height; annotationCanvas.width = viewport.width;
            interactionCanvas.height = viewport.height; interactionCanvas.width = viewport.width;
            await page.render({ canvasContext: ctx, viewport }).promise;
        } else if (material.type === MaterialType.NOTEBOOK) {
            backgroundCanvas.height = dims.height; backgroundCanvas.width = dims.width;
            annotationCanvas.height = dims.height; annotationCanvas.width = dims.width;
            interactionCanvas.height = dims.height; interactionCanvas.width = dims.width;
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, dims.width, dims.height);

            const bgType = pageBackgrounds[pageNum] || 'blank';
            if (bgType !== 'blank') {
                ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
                if (bgType === 'lines') for (let y = 30 * scale; y < dims.height; y += 30 * scale) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dims.width, y); ctx.stroke(); }
                if (bgType === 'grid') {
                     for (let x = 0; x < dims.width; x += 20 * scale) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims.height); ctx.stroke(); }
                     for (let y = 0; y < dims.height; y += 20 * scale) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(dims.width, y); ctx.stroke(); }
                }
            }
        }
    };
    
    // Initial Load
    useEffect(() => {
        if (material.type === MaterialType.PDF && material.blob && typeof (window as any).pdfjsLib !== 'undefined') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target!.result as ArrayBuffer);
                    const pdf = await (window as any).pdfjsLib.getDocument({ data: typedarray }).promise;
                    setPdfDoc(pdf); setNumPages(pdf.numPages);
                } catch(err) { console.error("Error loading PDF", err); } 
                finally { setIsLoading(false); }
            };
            reader.readAsArrayBuffer(material.blob);
        } else { setIsLoading(false); }
    }, [material]);

    // Re-render canvases whenever state changes
    useEffect(() => {
        if (!isLoading) {
            renderBackground(currentPage);
            renderMainAnnotations(currentPage);
        }
    }, [currentPage, isLoading, annotations, selectedAnnotationId, pageBackgrounds, material, pdfDoc]);
    
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (material.type !== MaterialType.NOTEBOOK || !viewerContainerRef.current) return;
            const items = e.clipboardData?.items; if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile(); if (!file) continue;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imageData = event.target?.result as string;
                        const img = new Image();
                        img.onload = () => {
                            pushToUndoStack(currentPage);
                            const newImage: ImageAnnotation = { id: crypto.randomUUID(), type: 'image', imageData, x: 50, y: 50, width: img.width, height: img.height };
                            setAnnotations(prevAnnos => ({...prevAnnos, [currentPage]: [...(prevAnnos[currentPage] || []), newImage]}));
                        };
                        img.src = imageData;
                    };
                    reader.readAsDataURL(file);
                }
            }
        };
        const viewer = viewerContainerRef.current;
        viewer?.addEventListener('paste', handlePaste);
        return () => viewer?.removeEventListener('paste', handlePaste);
    }, [material.type, currentPage, annotations]);
    
    const handleAddImage = useCallback((imageData: string) => {
        const img = new Image();
        img.onload = () => {
            pushToUndoStack(currentPage);
            const newImage: ImageAnnotation = { id: crypto.randomUUID(), type: 'image', imageData, x: 50, y: 50, width: img.width > 400 ? 400 : img.width, height: img.width > 400 ? img.height * (400 / img.width) : img.height };
            setAnnotations(prev => ({...prev, [currentPage]: [...(prev[currentPage] || []), newImage]}));
        };
        img.src = imageData;
    }, [currentPage]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => handleAddImage(event.target?.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleUndo = useCallback(() => {
        const lastAction = undoStack.current.pop(); if (!lastAction) return;
        redoStack.current.push({ pageNum: lastAction.pageNum, annotations: annotations[lastAction.pageNum] || [] });
        setAnnotations(prev => ({...prev, [lastAction.pageNum]: lastAction.annotations}));
    }, [annotations]);
    
    const handleRedo = useCallback(() => {
        const lastUndo = redoStack.current.pop(); if (!lastUndo) return;
        undoStack.current.push({ pageNum: lastUndo.pageNum, annotations: annotations[lastUndo.pageNum] || [] });
        setAnnotations(prev => ({...prev, [lastUndo.pageNum]: lastUndo.annotations}));
    }, [annotations]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); handleUndo(); }
                if (e.key === 'y') { e.preventDefault(); handleRedo(); }
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [handleUndo, handleRedo]);
    
    const getCoords = (e: React.MouseEvent | React.TouchEvent): {x: number, y: number} | null => {
        const canvas = interactionCanvasRef.current; if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left), y: (clientY - rect.top) };
    };
    
    const startTextAnnotation = (coords: {x: number, y: number}) => {
        if (textAnnotationInputRef.current && textAnnotationInputRef.current.parentElement) {
            textAnnotationInputRef.current.parentElement.removeChild(textAnnotationInputRef.current);
        }
        const input = document.createElement('textarea');
        input.className = 'text-annotation-input'; input.style.left = `${coords.x}px`; input.style.top = `${coords.y}px`; input.style.color = color; input.style.fontSize = `${lineWidth * 3}px`; input.rows = 1;
        interactionCanvasRef.current?.parentElement?.appendChild(input); input.focus();

        const finalizeText = () => {
             if (!input.parentElement || !input.parentElement.contains(input)) return;
            if (input.value.trim()) {
                pushToUndoStack(currentPage);
                const textAnnotation: TextAnnotation = { id: crypto.randomUUID(), type: 'text', text: input.value, x: coords.x, y: coords.y, color: color, size: lineWidth * 3, font: 'sans-serif', width: input.offsetWidth, height: input.offsetHeight };
                setAnnotations(prev => ({...prev, [currentPage]: [...(prev[currentPage] || []), textAnnotation]}));
            }
            if (input.parentElement.contains(input)) input.parentElement.removeChild(input);
            textAnnotationInputRef.current = null;
        };
        input.onblur = finalizeText;
        input.onkeydown = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finalizeText(); }};
        textAnnotationInputRef.current = input;
    };
    
    const onCanvasActionStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (tool !== 'pan' && e.cancelable) e.preventDefault();
        const coords = getCoords(e); if (!coords) return;
        
        if (tool === 'lasso-eraser') {
            setSelectedAnnotationId(null);
            const lassoPath: PathAnnotation = { id: 'lasso-path', type: 'path', points: [coords], color: '#0ea5e9', lineWidth: 2, mode: 'pen' };
            interactionState.current = { mode: 'drawing', annotation: lassoPath, originalAnnotation: lassoPath, startX: coords.x, startY: coords.y };
            return;
        }

        if (tool === 'pan') {
            const pageAnnotations = [...(annotations[currentPage] || [])].reverse();
            let clickedAnnotation: Annotation | null = null;
            let foundInteractionMode: InteractionMode = null;
            for(const anno of pageAnnotations) {
                 if ((anno.type === 'image' || anno.type === 'text') && coords.x >= anno.x && coords.x <= anno.x + anno.width && coords.y >= anno.y && coords.y <= anno.y + anno.height) {
                    clickedAnnotation = anno;
                    const handleSize = 16;
                    if (anno.type === 'image') {
                        if (coords.x > anno.x + anno.width - handleSize && coords.y > anno.y + anno.height - handleSize) foundInteractionMode = 'resizing-br';
                        else if (coords.x < anno.x + handleSize && coords.y > anno.y + anno.height - handleSize) foundInteractionMode = 'resizing-bl';
                        else if (coords.x > anno.x + anno.width - handleSize && coords.y < anno.y + handleSize) foundInteractionMode = 'resizing-tr';
                        else if (coords.x < anno.x + handleSize && coords.y < anno.y + handleSize) foundInteractionMode = 'resizing-tl';
                    }
                    if (!foundInteractionMode) foundInteractionMode = 'moving';
                    break;
                 }
            }
            if(clickedAnnotation && foundInteractionMode) {
                setSelectedAnnotationId(clickedAnnotation.id);
                pushToUndoStack(currentPage);
                interactionState.current = { mode: foundInteractionMode, annotation: clickedAnnotation, originalAnnotation: clickedAnnotation, startX: coords.x, startY: coords.y };
                 // Re-render the main canvas immediately to remove the "lifted" annotation
                renderMainAnnotations(currentPage);
            } else {
                 setSelectedAnnotationId(null);
                 const startX = 'touches' in e ? e.touches[0].pageX : e.pageX; const startY = 'touches' in e ? e.touches[0].pageY : e.pageY;
                 panState.current = { isPanning: true, startX, startY, scrollLeft: viewerContainerRef.current!.scrollLeft, scrollTop: viewerContainerRef.current!.scrollTop };
            }
            return;
        }
        
        setSelectedAnnotationId(null);
        if (tool === 'text') { startTextAnnotation(coords); return; }

        pushToUndoStack(currentPage);
        const newAnnotation: PathAnnotation = { id: crypto.randomUUID(), type: 'path', points: [coords], color: color, lineWidth: tool === 'highlighter' ? 20 : lineWidth, mode: tool as any };
        interactionState.current = { mode: 'drawing', annotation: newAnnotation, originalAnnotation: newAnnotation, startX: coords.x, startY: coords.y };
    };

    const onCanvasActionMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (tool !== 'pan' && e.cancelable) e.preventDefault();
        const coords = getCoords(e); if (!coords) return;
        
        if (panState.current.isPanning) {
            const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX; const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;
            const dx = pageX - panState.current.startX; const dy = pageY - panState.current.startY;
            viewerContainerRef.current!.scrollLeft = panState.current.scrollLeft - dx; viewerContainerRef.current!.scrollTop = panState.current.scrollTop - dy; return;
        }
        
        if (!interactionState.current) return;
        const interactionCtx = interactionCanvasRef.current!.getContext('2d')!;
        interactionCtx.clearRect(0, 0, interactionCtx.canvas.width, interactionCtx.canvas.height);

        if (tool === 'lasso-eraser') {
            const updatedPoints = [...(interactionState.current.annotation as PathAnnotation).points, coords];
            interactionState.current.annotation = {...interactionState.current.annotation, points: updatedPoints} as PathAnnotation;
            
            interactionCtx.save();
            interactionCtx.strokeStyle = '#0ea5e9';
            interactionCtx.lineWidth = 2;
            interactionCtx.setLineDash([6, 3]);
            interactionCtx.beginPath();
            if (updatedPoints.length > 0) {
                interactionCtx.moveTo(updatedPoints[0].x, updatedPoints[0].y);
                updatedPoints.forEach(p => interactionCtx.lineTo(p.x, p.y));
            }
            interactionCtx.stroke();
            interactionCtx.restore();
            return;
        }

        const { mode, originalAnnotation, startX, startY } = interactionState.current;
        let activeAnnotation = interactionState.current.annotation;
            
        if (mode === 'drawing' && activeAnnotation.type === 'path') {
            const updatedPoints = activeAnnotation.mode === 'line' 
                ? [activeAnnotation.points[0], coords] 
                : [...activeAnnotation.points, coords];
            activeAnnotation = {...activeAnnotation, points: updatedPoints };
        } else if (mode === 'moving' && (originalAnnotation.type === 'text' || originalAnnotation.type === 'image')) {
            const dx = coords.x - startX; const dy = coords.y - startY;
            activeAnnotation = { ...originalAnnotation, x: originalAnnotation.x + dx, y: originalAnnotation.y + dy };
        } else if (mode?.startsWith('resizing') && originalAnnotation.type === 'image') {
            const dx = coords.x - startX; const dy = coords.y - startY;
            let {x: newX, y: newY, width: newWidth, height: newHeight} = originalAnnotation;

            if (mode.includes('r')) newWidth += dx;
            if (mode.includes('l')) { newWidth -= dx; newX += dx; }
            if (mode.includes('b')) newHeight += dy;
            if (mode.includes('t')) { newHeight -= dy; newY += dy; }
            
            activeAnnotation = { 
                ...originalAnnotation,
                width: newWidth < 20 ? 20 : newWidth,
                height: newHeight < 20 ? 20 : newHeight,
                x: newX,
                y: newY
            };
        }
        
        interactionState.current.annotation = activeAnnotation;
        drawAnnotationOnContext(interactionCtx, activeAnnotation, selectedAnnotationId);
    };
    
    const onCanvasActionEnd = () => {
        if (panState.current.isPanning) { panState.current.isPanning = false; return; }

        if (tool === 'lasso-eraser' && interactionState.current) {
            const interactionCtx = interactionCanvasRef.current!.getContext('2d')!;
            const lassoPolygon = (interactionState.current.annotation as PathAnnotation).points;
            
            interactionState.current = null;
            interactionCtx.clearRect(0, 0, interactionCtx.canvas.width, interactionCtx.canvas.height);

            if (lassoPolygon.length < 3) return;

            const pageAnnotations = annotations[currentPage] || [];
            const annotationsToDelete = new Set<string>();
            
            const offscreenCanvas = document.createElement('canvas');
            const offscreenCtx = offscreenCanvas.getContext('2d')!;
            offscreenCtx.beginPath();
            offscreenCtx.moveTo(lassoPolygon[0].x, lassoPolygon[0].y);
            lassoPolygon.forEach(p => offscreenCtx.lineTo(p.x, p.y));
            offscreenCtx.closePath();

            pageAnnotations.forEach(anno => {
                if (anno.type === 'path') {
                    for (const point of anno.points) {
                        if (offscreenCtx.isPointInPath(point.x, point.y)) {
                            annotationsToDelete.add(anno.id);
                            break;
                        }
                    }
                } else if (anno.type === 'text' || anno.type === 'image') {
                    const corners = [
                        { x: anno.x, y: anno.y },
                        { x: anno.x + anno.width, y: anno.y },
                        { x: anno.x, y: anno.y + anno.height },
                        { x: anno.x + anno.width, y: anno.y + anno.height },
                    ];
                    for (const corner of corners) {
                        if (offscreenCtx.isPointInPath(corner.x, corner.y)) {
                            annotationsToDelete.add(anno.id);
                            break;
                        }
                    }
                }
            });

            if (annotationsToDelete.size > 0) {
                pushToUndoStack(currentPage);
                setAnnotations(prev => {
                    const newPageAnnos = (prev[currentPage] || []).filter(a => !annotationsToDelete.has(a.id));
                    return { ...prev, [currentPage]: newPageAnnos };
                });
            }
            return;
        }

        if (!interactionState.current) return;

        const interactionCtx = interactionCanvasRef.current!.getContext('2d')!;
        interactionCtx.clearRect(0, 0, interactionCtx.canvas.width, interactionCtx.canvas.height);
        
        const finalAnnotation = interactionState.current.annotation;
        
        if (interactionState.current.mode === 'drawing') {
            if (finalAnnotation.type === 'path' && finalAnnotation.points.length < 2) {
                 undoStack.current.pop(); // Not a valid drawing, pop the undo state
            } else {
                setAnnotations(prev => ({...prev, [currentPage]: [...(prev[currentPage] || []), finalAnnotation]}));
            }
        } else { // It was a move/resize, "drop" the annotation back
            const originalId = interactionState.current.originalAnnotation.id;
            setAnnotations(prev => {
                const pageAnnos = prev[currentPage] || [];
                // Find the original and replace it. If it was a new item, just add it.
                const existingIndex = pageAnnos.findIndex(a => a.id === originalId);
                if (existingIndex > -1) {
                    const newPageAnnos = [...pageAnnos];
                    newPageAnnos[existingIndex] = finalAnnotation;
                    return { ...prev, [currentPage]: newPageAnnos };
                }
                return { ...prev, [currentPage]: [...pageAnnos, finalAnnotation] };
            });
        }
        
        interactionState.current = null;
    };

    const handleAddPage = () => {
        if(material.type === MaterialType.NOTEBOOK) {
            pushToUndoStack(currentPage); // Save state before adding page
            const newPageCount = numPages + 1;
            const newBackgrounds = { ...pageBackgrounds, [newPageCount]: pageBackgrounds[currentPage] || 'blank' };
            setNumPages(newPageCount);
            setPageBackgrounds(newBackgrounds);
            setAnnotations(prev => ({...prev, [newPageCount]: []}));
            setCurrentPage(newPageCount);
        }
    }
    
    const handleSetBackground = (bg: NotebookBackground) => {
        const newBackgrounds = { ...pageBackgrounds, [currentPage]: bg };
        setPageBackgrounds(newBackgrounds);
    };

    const handleTogglePageHighlighted = () => {
        const newHighlighted = new Set(highlightedPages);
        if (newHighlighted.has(currentPage)) newHighlighted.delete(currentPage); else newHighlighted.add(currentPage);
        setHighlightedPages(Array.from(newHighlighted));
    };

    if (isLoading) return <div className="text-center p-8">Loading material...</div>;
    if (!pdfDoc && material.type === MaterialType.PDF) return <div className="text-center p-8 text-red-500">Could not load material. It might be corrupted or in an unsupported format.</div>;

    return (
        <div className="w-full h-full flex">
            {isNavigatorVisible && (
                <PageNavigator numPages={numPages} currentPage={currentPage} setCurrentPage={setCurrentPage} material={material} pdfDoc={pdfDoc} highlightedPages={highlightedPages} onAddPage={handleAddPage} />
            )}
            <div className="flex-grow flex flex-col relative bg-slate-200 min-w-0 min-h-0">
                <input type="file" ref={imageUploadInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                 <div className="absolute top-2 left-2 z-20">
                    <button onClick={() => setIsNavigatorVisible(!isNavigatorVisible)} className="p-2 rounded-full bg-slate-900/60 text-white backdrop-blur-sm hover:bg-slate-700/80 transition-colors">
                        <ListBulletIcon className="w-5 h-5"/>
                    </button>
                 </div>
                 <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ease-out ${isAnnotationMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                    <AnnotationToolbar
                        tool={tool} setTool={setTool} color={color} setColor={setColor} lineWidth={lineWidth} setLineWidth={setLineWidth}
                        handleUndo={handleUndo} handleRedo={handleRedo} undoStackSize={undoStack.current.length} redoStackSize={redoStack.current.length}
                        onTogglePageHighlighted={handleTogglePageHighlighted} isPageHighlighted={highlightedPages.includes(currentPage)}
                        materialType={material.type} onSetBackground={handleSetBackground} onAddImage={() => imageUploadInputRef.current?.click()}
                        currentPage={currentPage} numPages={numPages} setCurrentPage={setCurrentPage}
                        />
                </div>
                 <div className="fixed bottom-4 left-4 z-20 flex flex-col gap-2">
                    <button onClick={() => setIsAnnotationMode(!isAnnotationMode)} title={isAnnotationMode ? 'Hide Toolbar (Reading Mode)' : 'Show Toolbar (Annotation Mode)'} className="w-12 h-12 bg-slate-900/80 backdrop-blur-md rounded-full shadow-2xl border border-white/10 text-white flex items-center justify-center z-50 transition hover:bg-slate-700">
                        {isAnnotationMode ? <EyeSlashIcon className="w-6 h-6"/> : <PencilIcon className="w-6 h-6"/>}
                    </button>
                </div>
                
                <div ref={viewerContainerRef} className={`w-full h-full playground-pdf-viewer ${isAnnotationMode && tool !== 'pan' ? 'annotation-active' : ''} ${tool === 'pan' ? 'pan-mode': ''}`}>
                    <div className="relative w-max"
                        onMouseDown={onCanvasActionStart} onMouseMove={onCanvasActionMove} onMouseUp={onCanvasActionEnd} onMouseLeave={onCanvasActionEnd}
                        onTouchStart={onCanvasActionStart} onTouchMove={onCanvasActionMove} onTouchEnd={onCanvasActionEnd}
                        onTouchCancel={onCanvasActionEnd}
                        >
                        <canvas ref={backgroundCanvasRef}></canvas>
                        <canvas ref={annotationCanvasRef} className="playground-annotation-canvas"></canvas>
                        <canvas ref={interactionCanvasRef} className="playground-annotation-canvas"></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};


const MediaPlayer: React.FC<{ material: Material, start: number, end: number }> = ({ material, start, end }) => {
    const mediaRef = useRef<(HTMLVideoElement & HTMLAudioElement) | null>(null);
    const objectUrl = useMemo(() => {
        if (material.blob) {
            return URL.createObjectURL(material.blob);
        }
        return null;
    }, [material.blob]);

    useEffect(() => {
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [objectUrl]);

    // Set start time when media is ready
    useEffect(() => {
        const mediaElement = mediaRef.current;
        if (mediaElement && start > 0) {
            const setStartTime = () => {
                if(mediaElement) mediaElement.currentTime = start;
            };
            mediaElement.addEventListener('loadedmetadata', setStartTime);
            return () => {
                if(mediaElement) mediaElement.removeEventListener('loadedmetadata', setStartTime);
            };
        }
    }, [start]);

    if (!objectUrl) {
        return <div className="p-8 text-center text-white">Loading media...</div>;
    }

    const MediaElement = material.type === MaterialType.VIDEO ? 'video' : 'audio';

    return (
        <div className="w-full h-full flex items-center justify-center bg-black p-4">
            <MediaElement ref={mediaRef} src={objectUrl} controls className="max-w-full max-h-full rounded-lg" />
        </div>
    );
};
const YouTubePlayer: React.FC<{ material: Material }> = ({ material }) => {
     const videoId = useMemo(() => material.url ? getYoutubeVideoId(material.url) : null, [material.url]);

    if (!videoId) return <div className="p-8 text-center text-red-500">Invalid YouTube URL.</div>;

    return (
        <div className="w-full h-full flex items-center justify-center bg-black">
            <iframe
                className="aspect-video w-full max-w-4xl"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            ></iframe>
        </div>
    );
};

interface PlaygroundViewProps {
    workletId?: string;
    dateKey?: string;
    materialId?: string;
    worklets: Worklet[];
    materials: Material[];
    onBack: () => void;
    onSaveWorklet: (worklet: Worklet, materials?: Material[]) => Promise<void>;
    onSaveMaterial: (material: Material) => Promise<void>;
}

// --- Main Playground Component ---
const PlaygroundView: React.FC<PlaygroundViewProps> = ({ workletId, dateKey, materialId, worklets, materials, onBack, onSaveWorklet, onSaveMaterial }) => {
    const { worklet, dailyTask, viewMode, title, materialForView } = useMemo(() => {
        if (materialId) {
            const mat = materials.find(m => m.id === materialId);
            return { worklet: null, dailyTask: null, viewMode: 'material', title: mat?.name || 'Material Viewer', materialForView: mat };
        }
        const w = worklets.find(wk => wk.id === workletId) as Assignment | Exam | undefined;
        if (!w || !dateKey) return { worklet: null, dailyTask: null, viewMode: 'none', title: '', materialForView: null };
        const dt = w.dailyTasks.find(t => t.date === dateKey);
        return { worklet: w, dailyTask: dt, viewMode: 'study', title: w.name, materialForView: null };
    }, [workletId, dateKey, materialId, worklets, materials]);

    const handleTogglePageCompleted = (page: number) => {
        if (!worklet || !activeMaterial) return;
        const newCompletedPages = { ...(worklet.completedPages || {}) };
        const pagesForMaterial = new Set(newCompletedPages[activeMaterial.id] || []);
        if (pagesForMaterial.has(page)) pagesForMaterial.delete(page); else pagesForMaterial.add(page);
        newCompletedPages[activeMaterial.id] = Array.from(pagesForMaterial);
        onSaveWorklet({ ...worklet, completedPages: newCompletedPages });
    };
    
    if (viewMode === 'none') return <div>Loading task... or task not found. <button onClick={onBack}>Go Back</button></div>;

    const activeSegment = viewMode === 'study' ? dailyTask?.workSegments[0] : null;
    const activeMaterial = viewMode === 'study' ? materials.find(m => m.id === activeSegment?.materialId) : materialForView;
    
    const { taskPages, initialPage } = useMemo(() => {
        if (viewMode !== 'study' || !worklet || !dailyTask || !activeMaterial || (activeMaterial.type !== 'PDF' && activeMaterial.type !== 'EPUB')) return { taskPages: [], initialPage: 1 };
        const segment = dailyTask.workSegments.find(s => s.materialId === activeMaterial.id);
        if (!segment) return { taskPages: [], initialPage: 1 };
        const start = Math.floor(segment.start); const end = Math.ceil(segment.end); const pages = Array.from({length: end - start}, (_, i) => start + i + 1);
        const completed = worklet.completedPages?.[activeMaterial.id] || [];
        const firstUnfinished = pages.find(p => !completed.includes(p));
        return { taskPages: pages, initialPage: firstUnfinished || pages[0] || 1 };
    }, [worklet, dailyTask, activeMaterial, viewMode]);

    const renderViewer = () => {
        if (!activeMaterial) return <div className="text-center p-8">No material selected.</div>;
        switch (activeMaterial.type) {
            case MaterialType.PDF:
            case MaterialType.EPUB:
            case MaterialType.NOTEBOOK:
                return <MaterialViewer key={activeMaterial.id} material={activeMaterial} initialPage={initialPage} completedPages={worklet?.completedPages?.[activeMaterial.id] || []} onTogglePageCompleted={handleTogglePageCompleted} onSaveMaterial={onSaveMaterial} onSaveWorklet={onSaveWorklet} worklet={worklet}/>;
            case MaterialType.VIDEO:
            case MaterialType.AUDIO:
                return <MediaPlayer material={activeMaterial} start={activeSegment?.start || 0} end={activeSegment?.end || 0} />;
            case MaterialType.YOUTUBE:
                return <YouTubePlayer material={activeMaterial} />;
            default:
                return <div className="text-center p-8">Study viewer for this material type is not yet available.</div>;
        }
    };

    return (
        <div className="h-[calc(100vh-60px)] flex flex-col bg-slate-100">
            <header className="flex-shrink-0 p-4 pb-2 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
                <div className="flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"><ChevronLeftIcon className="w-5 h-5" />Back</button>
                </div>
                <div className="text-center mt-1">
                    <h1 className="text-xl font-bold text-slate-900 truncate px-12">{title}</h1>
                    {dailyTask && <p className="text-sm text-slate-600 truncate px-12">{dailyTask.title}</p>}
                </div>
            </header>
            
             {viewMode === 'study' && taskPages.length > 0 && activeMaterial?.type === 'PDF' && (
                <div className="mx-4 my-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0 z-10">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">Today's Pages:</h3>
                    <div className="flex flex-wrap gap-2">
                        {taskPages.map(page => (
                            <label key={page} className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-md bg-white hover:bg-blue-100 transition-colors">
                                <input type="checkbox" checked={worklet!.completedPages?.[activeMaterial!.id]?.includes(page)} onChange={() => handleTogglePageCompleted(page)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                <span className="text-sm text-slate-700">{page}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex-grow relative min-h-0">
                {renderViewer()}
            </div>
        </div>
    );
};

export default PlaygroundView;