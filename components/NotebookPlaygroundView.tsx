import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { Worklet, Material, DailyTask, Assignment, Exam, MaterialType, AllAnnotations, Annotation, PathAnnotation, TextAnnotation, PageAnnotations, ImageAnnotation, View } from '../types.ts';
import { ChevronLeftIcon, PlusIcon, PencilIcon, StarIcon, HandRaisedIcon, MinusIcon, ChatBubbleLeftIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, EyeIcon, EyeSlashIcon, PhotoIcon, PaintBrushIcon, Squares2X2Icon, ListBulletIcon, LassoIcon } from './icons.tsx';

interface PlaygroundViewProps {
    workletId?: string;
    dateKey?: string;
    materialId?: string;
    returnTo?: View;
    worklets: Worklet[];
    materials: Material[];
    onBack: () => void;
    onSaveWorklet: (worklet: Worklet, newMaterials: Material[]) => Promise<void>;
    onSaveMaterial: (material: Material) => Promise<void>;
}

type Tool = 'pan' | 'pen' | 'highlighter' | 'line' | 'text' | 'eraser' | 'lasso-eraser' | 'read';
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

// --- ANNOTATION TOOLBAR (FOR NOTEBOOKS) ---
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
    onSetBackground: (bg: NotebookBackground) => void;
    onAddImage: () => void;
    currentPage: number;
    numPages: number;
    setCurrentPage: (page: number) => void;
    zoom: number;
    setZoom: (zoom: number) => void;
}> = (props) => {
    const { tool, setTool, color, setColor, lineWidth, setLineWidth, handleUndo, handleRedo, undoStackSize, redoStackSize, onTogglePageHighlighted, isPageHighlighted, onSetBackground, onAddImage, currentPage, numPages, setCurrentPage, zoom, setZoom } = props;
    
    const [activePopover, setActivePopover] = useState<'tools' | 'background' | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useClickOutside(popoverRef, () => activePopover && setActivePopover(null));

    const tools = [
        { name: 'read' as Tool, icon: <EyeIcon className="w-5 h-5"/>, title: 'Read Mode (Pan/Zoom Only)' },
        { name: 'pan' as Tool, icon: <HandRaisedIcon className="w-5 h-5"/>, title: 'Pan & Select Annotations' },
        { name: 'pen' as Tool, icon: <PencilIcon className="w-5 h-5"/>, title: 'Pen' },
        { name: 'highlighter' as Tool, icon: <PaintBrushIcon className="w-5 h-5 text-yellow-400/80"/>, title: 'Highlighter' },
        { name: 'line' as Tool, icon: <MinusIcon className="w-5 h-5"/>, title: 'Line Tool' },
        { name: 'text' as Tool, icon: <ChatBubbleLeftIcon className="w-5 h-5"/>, title: 'Text Tool' },
        { name: 'eraser' as Tool, icon: '🧼', title: 'Eraser' },
        { name: 'lasso-eraser' as Tool, icon: <LassoIcon className="w-5 h-5"/>, title: 'Lasso Eraser' },
    ];
    
    return (
        <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-slate-900/80 backdrop-blur-lg rounded-xl shadow-2xl border border-white/10 z-50">
            {tools.map(t => (
                <button key={t.name} onClick={() => setTool(t.name)} className={`p-2 rounded-lg ${tool === t.name ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/80'}`} title={t.title}>
                    {typeof t.icon === 'string' ? <span className="text-lg">{t.icon}</span> : t.icon}
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
            
            <button onClick={onAddImage} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/80" title="Add Image">
                <PhotoIcon className="w-5 h-5" />
            </button>

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

            <div className="h-6 w-px bg-slate-600/70 mx-1"></div>
            <button onClick={handleUndo} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed" disabled={undoStackSize === 0} title="Undo (Ctrl+Z)"><ArrowUturnLeftIcon className="w-5 h-5"/></button>
            <button onClick={handleRedo} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed" disabled={redoStackSize === 0} title="Redo (Ctrl+Y)"><ArrowUturnRightIcon className="w-5 h-5"/></button>
            
            <div className="h-6 w-px bg-slate-600/70 mx-1"></div>
            <div className="flex items-center gap-1 text-white">
                <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 1} className="p-2 rounded-full hover:bg-slate-700/80 disabled:opacity-50"><ChevronLeftIcon className="w-5 h-5"/></button>
                <span className="text-sm font-medium tabular-nums w-20 text-center">{currentPage} / {numPages}</span>
                <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= numPages} className="p-2 rounded-full hover:bg-slate-700/80 disabled:opacity-50"><ChevronLeftIcon className="w-5 h-5 rotate-180"/></button>
            </div>

            <div className="h-6 w-px bg-slate-600/70 mx-1"></div>
            <div className="flex items-center text-white/80">
                <button onClick={() => setZoom(zoom / 1.2)} title="Zoom Out" className="p-2 rounded-full hover:bg-slate-700/80 disabled:opacity-50"><MinusIcon className="w-5 h-5"/></button>
                <span className="text-sm font-mono tabular-nums w-16 text-center" onDoubleClick={() => setZoom(1)}>{Math.round(zoom*100)}%</span>
                <button onClick={() => setZoom(zoom * 1.2)} title="Zoom In" className="p-2 rounded-full hover:bg-slate-700/80 disabled:opacity-50"><PlusIcon className="w-5 h-5"/></button>
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
    highlightedPages: number[];
    onAddPage?: () => void;
}> = ({ numPages, currentPage, setCurrentPage, material, highlightedPages, onAddPage }) => {
    
    const previewCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const intersectionObserver = useRef<IntersectionObserver | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    const renderPreview = useCallback(async (pageNum: number) => {
        const canvas = previewCanvasRefs.current[pageNum - 1];
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const previewScale = 0.15;
        
        const isLandscape = material.orientation === 'landscape';
        const dims = { width: isLandscape ? 1550 : 1200, height: isLandscape ? 1200 : 1550 };
        canvas.width = dims.width * previewScale;
        canvas.height = dims.height * previewScale;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const pageAnnotations = material.annotations?.[pageNum] || [];
        ctx.save();
        ctx.scale(previewScale, previewScale); 
        for (const anno of pageAnnotations) {
            await drawAnnotationOnContext(ctx, anno);
        }
        ctx.restore();

    }, [material]);

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
             {onAddPage && (
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

// Internal Notebook Viewer Component
const NotebookViewer: React.FC<{
    material: Material;
    initialPage: number;
    onSaveMaterial: (material: Material) => void;
}> = ({ material, initialPage, onSaveMaterial }) => {
    const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
    const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const imageUploadInputRef = useRef<HTMLInputElement>(null);
    const textAnnotationInputRef = useRef<HTMLTextAreaElement | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isAnnotationMode, setIsAnnotationMode] = useState(true);
    const [isNavigatorVisible, setIsNavigatorVisible] = useState(true);
    
    const [tool, setTool] = useState<Tool>('pen');
    const [color, setColor] = useState('#EF4444');
    const [lineWidth, setLineWidth] = useState(4);
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

    const [numPages, setNumPages] = useState(material.pageCount || 1);
    const [currentPage, setCurrentPageInternal] = useState(material.lastViewedPage || initialPage);
    const [zoom, setZoom] = useState(material.zoom || 1);
    const [offset, setOffset] = useState(material.offset || { x: 0, y: 0 });
    const [annotations, setAnnotations] = useState<AllAnnotations>(material.annotations || {});
    const [highlightedPages, setHighlightedPages] = useState(material.highlightedPages || []);
    const [pageBackgrounds, setPageBackgrounds] = useState<{[pageNum: number]: NotebookBackground}>(material.pageBackgrounds || { 1: 'blank' });
    
    const undoStack = useRef<{ pageNum: number, annotations: PageAnnotations }[]>([]);
    const redoStack = useRef<{ pageNum: number, annotations: PageAnnotations }[]>([]);
    const panState = useRef<{ isPanning: boolean, startX: number, startY: number, initialOffset: { x: number, y: number } }>({ isPanning: false, startX: 0, startY: 0, initialOffset: { x: 0, y: 0 } });
    const pinchState = React.useRef<{isPinching: boolean, initialDist: number, initialZoom: number}>({isPinching: false, initialDist: 0, initialZoom: 1});

    const interactionState = React.useRef<{
        mode: InteractionMode | 'drawing',
        annotation: Annotation,
        originalAnnotation: Annotation,
        startX: number,
        startY: number
    } | null>(null);
    
    // Lock page scroll when viewer is active
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);
    
    useEffect(() => {
        const debounceTimeout = setTimeout(() => {
            onSaveMaterial({ ...material, annotations, highlightedPages, pageBackgrounds, lastViewedPage: currentPage, pageCount: numPages, zoom, offset });
        }, 1000);
        return () => clearTimeout(debounceTimeout);
    }, [annotations, highlightedPages, pageBackgrounds, currentPage, numPages, zoom, offset, material, onSaveMaterial]);


    const setCurrentPage = (page: number) => {
        if (page > 0 && page <= numPages) {
            setSelectedAnnotationId(null);
            setCurrentPageInternal(page);
        }
    };
    
    const pushToUndoStack = (pageNum: number) => {
        undoStack.current.push({ pageNum, annotations: annotations[pageNum] || [] });
        redoStack.current = [];
    };

    const handleUndo = useCallback(() => {
        const lastAction = undoStack.current.pop();
        if (!lastAction) return;
        redoStack.current.push({ pageNum: lastAction.pageNum, annotations: annotations[lastAction.pageNum] || [] });
        setAnnotations(prev => ({ ...prev, [lastAction.pageNum]: lastAction.annotations }));
    }, [annotations]);

    const handleRedo = useCallback(() => {
        const lastUndo = redoStack.current.pop();
        if (!lastUndo) return;
        undoStack.current.push({ pageNum: lastUndo.pageNum, annotations: annotations[lastUndo.pageNum] || [] });
        setAnnotations(prev => ({ ...prev, [lastUndo.pageNum]: lastUndo.annotations }));
    }, [annotations]);

    useLayoutEffect(() => {
        if (isLoading || !viewerContainerRef.current) return;

        const drawAll = async () => {
            const isLandscape = material.orientation === 'landscape';
            const pageScale = 1.5;
            const dims = { width: (isLandscape ? 1550 : 1200) * pageScale, height: (isLandscape ? 1200 : 1550) * pageScale };
        
            const container = viewerContainerRef.current!;
            [backgroundCanvasRef, annotationCanvasRef, interactionCanvasRef].forEach(ref => {
                if (ref.current) {
                    ref.current.width = container.clientWidth;
                    ref.current.height = container.clientHeight;
                }
            });
        
            const bgCtx = backgroundCanvasRef.current?.getContext('2d');
            if (bgCtx) {
                bgCtx.save();
                bgCtx.clearRect(0, 0, bgCtx.canvas.width, bgCtx.canvas.height);
                bgCtx.translate(offset.x, offset.y);
                bgCtx.scale(zoom, zoom);
                
                bgCtx.fillStyle = 'white';
                bgCtx.fillRect(0, 0, dims.width, dims.height);
                const bgType = pageBackgrounds[currentPage] || 'blank';
                if (bgType !== 'blank') {
                    bgCtx.strokeStyle = '#e2e8f0'; bgCtx.lineWidth = 1;
                    if (bgType === 'lines') for (let y = 30 * pageScale; y < dims.height; y += 30 * pageScale) { bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(dims.width, y); bgCtx.stroke(); }
                    if (bgType === 'grid') {
                        for (let x = 0; x < dims.width; x += 20 * pageScale) { bgCtx.beginPath(); bgCtx.moveTo(x, 0); bgCtx.lineTo(x, dims.height); bgCtx.stroke(); }
                        for (let y = 0; y < dims.height; y += 20 * pageScale) { bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(dims.width, y); bgCtx.stroke(); }
                    }
                }
                bgCtx.restore();
            }
        
            const annoCtx = annotationCanvasRef.current?.getContext('2d');
            if (annoCtx) {
                annoCtx.save();
                annoCtx.clearRect(0, 0, annoCtx.canvas.width, annoCtx.canvas.height);
                annoCtx.translate(offset.x, offset.y);
                annoCtx.scale(zoom, zoom);
                const pageAnnos = annotations[currentPage] || [];
                for (const anno of pageAnnos) {
                    await drawAnnotationOnContext(annoCtx, anno, selectedAnnotationId);
                }
                annoCtx.restore();
            }
        };

        drawAll();
    
    }, [isLoading, currentPage, annotations, selectedAnnotationId, material.orientation, pageBackgrounds, offset, zoom]);
    
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

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') { e.preventDefault(); handleUndo(); }
                if (e.key === 'y') { e.preventDefault(); handleRedo(); }
                if (e.key === '=' || e.key === '+') { e.preventDefault(); (tool === 'pan' || tool === 'read') && setZoom(z => z * 1.2); }
                if (e.key === '-') { e.preventDefault(); (tool === 'pan' || tool === 'read') && setZoom(z => z / 1.2); }
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [handleUndo, handleRedo, tool]);

    const getCanvasCoords = (e: {clientX: number, clientY: number}): {x: number, y: number} | null => {
        const canvas = interactionCanvasRef.current; if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    const getWorldCoords = (canvasCoords: {x:number, y:number}): {x: number, y: number} => {
        return { x: (canvasCoords.x - offset.x) / zoom, y: (canvasCoords.y - offset.y) / zoom };
    };
    
    const isPointInPolygon = (point: {x: number, y: number}, polygon: {x: number, y: number}[]): boolean => {
        let x = point.x, y = point.y;
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            let xi = polygon[i].x, yi = polygon[i].y;
            let xj = polygon[j].x, yj = polygon[j].y;
            let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    const startTextAnnotation = (worldCoords: {x: number, y: number}) => {
        if (textAnnotationInputRef.current && textAnnotationInputRef.current.parentElement) {
            textAnnotationInputRef.current.parentElement.removeChild(textAnnotationInputRef.current);
        }
        const input = document.createElement('textarea');
        input.className = 'text-annotation-input';
        const canvas = interactionCanvasRef.current!;
        input.style.left = `${(worldCoords.x * zoom) + offset.x}px`;
        input.style.top = `${(worldCoords.y * zoom) + offset.y}px`;
        input.style.color = color;
        input.style.fontSize = `${lineWidth * 3 * zoom}px`;
        input.rows = 1;
        canvas.parentElement!.appendChild(input);
        input.focus();

        const finalizeText = () => {
             if (!input.parentElement || !input.parentElement.contains(input)) return;
            if (input.value.trim()) {
                pushToUndoStack(currentPage);
                const textAnnotation: TextAnnotation = { id: crypto.randomUUID(), type: 'text', text: input.value, x: worldCoords.x, y: worldCoords.y, color: color, size: lineWidth * 3, font: 'sans-serif', width: input.offsetWidth / zoom, height: input.offsetHeight / zoom };
                setAnnotations(prev => ({...prev, [currentPage]: [...(prev[currentPage] || []), textAnnotation]}));
            }
            if (input.parentElement.contains(input)) input.parentElement.removeChild(input);
            textAnnotationInputRef.current = null;
        };
        input.onblur = finalizeText;
        input.onkeydown = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finalizeText(); }};
        textAnnotationInputRef.current = input;
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only main button
        e.preventDefault();
        const canvasCoords = getCanvasCoords(e); if (!canvasCoords) return;
        const worldCoords = getWorldCoords(canvasCoords);

        if (tool === 'read') {
            panState.current = { isPanning: true, startX: e.clientX, startY: e.clientY, initialOffset: offset };
            return;
        }

        if (tool === 'pan') {
            const pageAnnotations = [...(annotations[currentPage] || [])].reverse();
            let clickedAnnotation: Annotation | null = null;
            let foundInteractionMode: InteractionMode = null;
            for(const anno of pageAnnotations) {
                 if ((anno.type === 'image' || anno.type === 'text') && worldCoords.x >= anno.x && worldCoords.x <= anno.x + anno.width && worldCoords.y >= anno.y && worldCoords.y <= anno.y + anno.height) {
                    clickedAnnotation = anno;
                    const handleSize = 16 / zoom;
                    if (anno.type === 'image') {
                        if (worldCoords.x > anno.x + anno.width - handleSize && worldCoords.y > anno.y + anno.height - handleSize) foundInteractionMode = 'resizing-br';
                        else if (worldCoords.x < anno.x + handleSize && worldCoords.y > anno.y + anno.height - handleSize) foundInteractionMode = 'resizing-bl';
                        else if (worldCoords.x > anno.x + anno.width - handleSize && worldCoords.y < anno.y + handleSize) foundInteractionMode = 'resizing-tr';
                        else if (worldCoords.x < anno.x + handleSize && worldCoords.y < anno.y + handleSize) foundInteractionMode = 'resizing-tl';
                    }
                    if (!foundInteractionMode) foundInteractionMode = 'moving';
                    break;
                 }
            }
            if(clickedAnnotation && foundInteractionMode) {
                setSelectedAnnotationId(clickedAnnotation.id);
                pushToUndoStack(currentPage);
                interactionState.current = { mode: foundInteractionMode, annotation: clickedAnnotation, originalAnnotation: clickedAnnotation, startX: worldCoords.x, startY: worldCoords.y };
            } else {
                 setSelectedAnnotationId(null);
                 panState.current = { isPanning: true, startX: e.clientX, startY: e.clientY, initialOffset: offset };
            }
            return;
        }
        
        setSelectedAnnotationId(null);
        if (tool === 'text') { startTextAnnotation(worldCoords); return; }

        if (tool === 'lasso-eraser') {
            const lassoPath: PathAnnotation = { id: 'lasso-path', type: 'path', points: [worldCoords], color: '#0ea5e9', lineWidth: 2 / zoom, mode: 'pen' };
            interactionState.current = { mode: 'drawing', annotation: lassoPath, originalAnnotation: lassoPath, startX: worldCoords.x, startY: worldCoords.y };
            return;
        }

        pushToUndoStack(currentPage);
        const newAnnotation: PathAnnotation = { id: crypto.randomUUID(), type: 'path', points: [worldCoords], color: color, lineWidth: tool === 'highlighter' ? 20 : lineWidth, mode: tool as any };
        interactionState.current = { mode: 'drawing', annotation: newAnnotation, originalAnnotation: newAnnotation, startX: worldCoords.x, startY: worldCoords.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        e.preventDefault();
        if (panState.current.isPanning) {
            const dx = e.clientX - panState.current.startX; const dy = e.clientY - panState.current.startY;
            setOffset({ x: panState.current.initialOffset.x + dx, y: panState.current.initialOffset.y + dy });
            return;
        }
        
        if (!interactionState.current) return;
        const worldCoords = getWorldCoords(getCanvasCoords(e)!);
        const interactionCtx = interactionCanvasRef.current!.getContext('2d')!;
        
        const { mode, originalAnnotation, startX, startY } = interactionState.current;
        let activeAnnotation = interactionState.current.annotation;

        if (mode === 'drawing' && activeAnnotation.type === 'path') {
            const updatedPoints = activeAnnotation.mode === 'line' ? [activeAnnotation.points[0], worldCoords] : [...activeAnnotation.points, worldCoords];
            activeAnnotation = {...activeAnnotation, points: updatedPoints };
        } else if (mode === 'moving' && (originalAnnotation.type === 'text' || originalAnnotation.type === 'image')) {
            const dx = worldCoords.x - startX; const dy = worldCoords.y - startY;
            activeAnnotation = { ...originalAnnotation, x: (originalAnnotation as any).x + dx, y: (originalAnnotation as any).y + dy };
        } else if (mode?.startsWith('resizing') && originalAnnotation.type === 'image') {
            const dx = worldCoords.x - startX; const dy = worldCoords.y - startY;
            let {x: newX, y: newY, width: newWidth, height: newHeight} = originalAnnotation as ImageAnnotation;
            if (mode.includes('r')) newWidth += dx; if (mode.includes('l')) { newWidth -= dx; newX += dx; }
            if (mode.includes('b')) newHeight += dy; if (mode.includes('t')) { newHeight -= dy; newY += dy; }
            activeAnnotation = { ...originalAnnotation, width: newWidth < 20 ? 20 : newWidth, height: newHeight < 20 ? 20 : newHeight, x: newX, y: newY };
        }
        interactionState.current.annotation = activeAnnotation;
        
        interactionCtx.save();
        interactionCtx.clearRect(0, 0, interactionCtx.canvas.width, interactionCtx.canvas.height);
        interactionCtx.translate(offset.x, offset.y);
        interactionCtx.scale(zoom, zoom);
        drawAnnotationOnContext(interactionCtx, activeAnnotation, selectedAnnotationId);
        interactionCtx.restore();
    };
    
    const handleMouseUp = () => {
        if (panState.current.isPanning) { panState.current.isPanning = false; return; }
        if (!interactionState.current) return;
        
        const interactionCtx = interactionCanvasRef.current!.getContext('2d')!;
        interactionCtx.clearRect(0, 0, interactionCtx.canvas.width, interactionCtx.canvas.height);
        
        const finalAnnotation = interactionState.current.annotation;
        const originalId = interactionState.current.originalAnnotation.id;

        if (tool === 'lasso-eraser') {
            const lassoPath = (finalAnnotation as PathAnnotation).points;
            if (lassoPath.length > 2) {
                pushToUndoStack(currentPage);
                const annotationsToKeep = (annotations[currentPage] || []).filter(anno => {
                    if (anno.type === 'path') {
                        return !anno.points.some(p => isPointInPolygon(p, lassoPath));
                    }
                    if (anno.type === 'text' || anno.type === 'image') {
                        const center = { x: anno.x + anno.width / 2, y: anno.y + anno.height / 2 };
                        return !isPointInPolygon(center, lassoPath);
                    }
                    return true;
                });
                setAnnotations(prev => ({ ...prev, [currentPage]: annotationsToKeep }));
            }
        } 
        else if (interactionState.current.mode === 'drawing') {
            if (finalAnnotation.type === 'path' && finalAnnotation.points.length < 2) undoStack.current.pop();
            else setAnnotations(prev => ({...prev, [currentPage]: [...(prev[currentPage] || []), finalAnnotation]}));
        } else {
            setAnnotations(prev => {
                const newPageAnnos = [...(prev[currentPage] || [])];
                const index = newPageAnnos.findIndex(a => a.id === originalId);
                if (index > -1) newPageAnnos[index] = finalAnnotation;
                return { ...prev, [currentPage]: newPageAnnos };
            });
        }
        interactionState.current = null;
    };
    
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const canvasCoords = getCanvasCoords(e); if (!canvasCoords) return;
            const zoomFactor = -e.deltaY * 0.001;
            const newZoom = Math.max(0.1, Math.min(zoom * (1 + zoomFactor), 10));

            const worldX = (canvasCoords.x - offset.x) / zoom;
            const worldY = (canvasCoords.y - offset.y) / zoom;
            
            setOffset({
                x: canvasCoords.x - worldX * newZoom,
                y: canvasCoords.y - worldY * newZoom
            });
            setZoom(newZoom);
        } else {
            e.preventDefault();
            setOffset(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        if (touch2) { // Pinch start
            panState.current.isPanning = false;
            interactionState.current = null; // Cancel any drawing
            const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
            pinchState.current = { isPinching: true, initialDist: dist, initialZoom: zoom };
        } else if (touch1) { // Single touch start
            if (tool === 'pan' || tool === 'read') {
                panState.current = { isPanning: true, startX: touch1.clientX, startY: touch1.clientY, initialOffset: offset };
            } else {
                // Drawing logic from handleMouseDown, adapted for touch
                const canvasCoords = getCanvasCoords(touch1); if (!canvasCoords) return;
                const worldCoords = getWorldCoords(canvasCoords);
                setSelectedAnnotationId(null);
                if (tool === 'text') { startTextAnnotation(worldCoords); return; }
                
                pushToUndoStack(currentPage);
                const newAnnotation: PathAnnotation = { id: crypto.randomUUID(), type: 'path', points: [worldCoords], color, lineWidth: tool === 'highlighter' ? 20 : lineWidth, mode: tool as any };
                interactionState.current = { mode: 'drawing', annotation: newAnnotation, originalAnnotation: newAnnotation, startX: worldCoords.x, startY: worldCoords.y };
            }
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        if (touch2 && pinchState.current.isPinching) { // Pinch move
            const newDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
            if (pinchState.current.initialDist === 0) return;
            const newZoom = Math.max(0.1, Math.min(pinchState.current.initialZoom * (newDist / pinchState.current.initialDist), 10));
            const canvasCoords = getCanvasCoords({ clientX: (touch1.clientX + touch2.clientX) / 2, clientY: (touch1.clientY + touch2.clientY) / 2 });
            if (!canvasCoords) return;
            const worldX = (canvasCoords.x - offset.x) / zoom;
            const worldY = (canvasCoords.y - offset.y) / zoom;
            setOffset({ x: canvasCoords.x - worldX * newZoom, y: canvasCoords.y - worldY * newZoom });
            setZoom(newZoom);
        } else if (touch1) { // Single touch move
            if (panState.current.isPanning) {
                const dx = touch1.clientX - panState.current.startX;
                const dy = touch1.clientY - panState.current.startY;
                setOffset({ x: panState.current.initialOffset.x + dx, y: panState.current.initialOffset.y + dy });
            } else if (interactionState.current) {
                 // Re-using mouseMove logic for drawing part
                 handleMouseMove({ preventDefault: () => {}, clientX: touch1.clientX, clientY: touch1.clientY } as React.MouseEvent);
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        panState.current.isPanning = false;
        pinchState.current.isPinching = false;
        if (interactionState.current) {
            handleMouseUp();
        }
    };

    const handleAddPage = () => {
        pushToUndoStack(currentPage);
        const newPageCount = numPages + 1;
        const newBackgrounds = { ...pageBackgrounds, [newPageCount]: pageBackgrounds[currentPage] || 'blank' };
        setNumPages(newPageCount);
        setPageBackgrounds(newBackgrounds);
        setAnnotations(prev => ({...prev, [newPageCount]: []}));
        setCurrentPage(newPageCount);
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
    
    const viewerClass = `w-full h-full overflow-hidden relative ${
        (tool === 'pan' || tool === 'read') ? 'cursor-grab' : 'cursor-crosshair'
    }`;
    
    return (
        <div className="w-full h-full flex">
            {isNavigatorVisible && (
                <PageNavigator numPages={numPages} currentPage={currentPage} setCurrentPage={setCurrentPage} material={material} highlightedPages={highlightedPages} onAddPage={handleAddPage} />
            )}
            <div className="flex-grow flex flex-col relative bg-slate-200 min-w-0 min-h-0">
                <input type="file" ref={imageUploadInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                 <div className="absolute top-2 left-2 z-30">
                    <button onClick={() => setIsNavigatorVisible(!isNavigatorVisible)} className="p-2 rounded-full bg-slate-900/60 text-white backdrop-blur-sm hover:bg-slate-700/80 transition-colors">
                        <ListBulletIcon className="w-5 h-5"/>
                    </button>
                 </div>
                 <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out ${isAnnotationMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                    <AnnotationToolbar
                        tool={tool} setTool={setTool} color={color} setColor={setColor} lineWidth={lineWidth} setLineWidth={setLineWidth}
                        handleUndo={handleUndo} handleRedo={handleRedo} undoStackSize={undoStack.current.length} redoStackSize={redoStack.current.length}
                        onTogglePageHighlighted={handleTogglePageHighlighted} isPageHighlighted={highlightedPages.includes(currentPage)}
                        onSetBackground={handleSetBackground} onAddImage={() => imageUploadInputRef.current?.click()}
                        currentPage={currentPage} numPages={numPages} setCurrentPage={setCurrentPage}
                        zoom={zoom} setZoom={setZoom}
                    />
                </div>
                 <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-2">
                    <button onClick={() => setIsAnnotationMode(!isAnnotationMode)} title={isAnnotationMode ? 'Hide Toolbar (Reading Mode)' : 'Show Toolbar (Annotation Mode)'} className="w-12 h-12 bg-slate-900/80 backdrop-blur-md rounded-full shadow-2xl border border-white/10 text-white flex items-center justify-center transition hover:bg-slate-700">
                        {isAnnotationMode ? <EyeSlashIcon className="w-6 h-6"/> : <PencilIcon className="w-6 h-6"/>}
                    </button>
                </div>
                
                <div 
                    ref={viewerContainerRef} 
                    className={viewerClass}
                    onMouseDown={handleMouseDown} 
                    onMouseMove={handleMouseMove} 
                    onMouseUp={handleMouseUp} 
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <canvas ref={backgroundCanvasRef} className="absolute top-0 left-0 z-0"></canvas>
                    <canvas ref={annotationCanvasRef} className="absolute top-0 left-0 z-10"></canvas>
                    <canvas ref={interactionCanvasRef} className="absolute top-0 left-0 z-20"></canvas>
                </div>
            </div>
        </div>
    );
};

// --- Main Notebook Playground Component ---
const NotebookPlaygroundView: React.FC<PlaygroundViewProps> = (props) => {
    const { workletId, dateKey, materialId, worklets, materials, onBack, onSaveWorklet, onSaveMaterial } = props;

    const { worklet, dailyTask, viewMode, title, materialForView } = useMemo(() => {
        if (materialId) {
            const mat = materials.find(m => m.id === materialId);
            return { worklet: null, dailyTask: null, viewMode: 'material', title: mat?.name || 'Notebook Viewer', materialForView: mat };
        }
        const w = worklets.find(wk => wk.id === workletId) as Assignment | Exam | undefined;
        if (!w || !dateKey) return { worklet: null, dailyTask: null, viewMode: 'none', title: '', materialForView: null };
        const dt = w.dailyTasks.find(t => t.date === dateKey);
        return { worklet: w, dailyTask: dt, viewMode: 'study', title: w.name, materialForView: null };
    }, [workletId, dateKey, materialId, worklets, materials]);

    if (viewMode === 'none') return <div className="p-4">Loading task... or task not found. <button onClick={onBack}>Go Back</button></div>;

    const activeMaterial = (viewMode === 'study'
        ? materials.find(m => m.id === dailyTask?.workSegments[0]?.materialId)
        : materialForView) as Material | undefined;

    const initialPage = activeMaterial?.lastViewedPage || 1;

    if (!activeMaterial || activeMaterial.type !== MaterialType.NOTEBOOK) {
        return <div className="p-8 text-center">Error: A valid notebook material could not be found.</div>;
    }

    return (
        <div className="h-[calc(100vh-60px)] flex flex-col bg-slate-100">
            <header className="flex-shrink-0 p-4 pb-2 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-20">
                <div className="flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"><ChevronLeftIcon className="w-5 h-5" />Back</button>
                </div>
                <div className="text-center mt-1">
                    <h1 className="text-xl font-bold text-slate-900 truncate px-12">{title}</h1>
                    {dailyTask && <p className="text-sm text-slate-600 truncate px-12">{dailyTask.title}</p>}
                </div>
            </header>
            <div className="flex-grow relative min-h-0 z-10">
                <NotebookViewer 
                    key={activeMaterial.id} 
                    material={activeMaterial} 
                    initialPage={initialPage} 
                    onSaveMaterial={onSaveMaterial} 
                />
            </div>
        </div>
    );
};

export default NotebookPlaygroundView;