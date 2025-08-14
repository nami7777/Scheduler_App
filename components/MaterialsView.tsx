import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Material, Worklet, WorkletType, MaterialType, Assignment, Exam, Annotation, ImageAnnotation, AllAnnotations } from '../types.ts';
import { TrashIcon, ArrowUpTrayIcon, EyeIcon, BookOpenIcon, PencilIcon, ArrowDownTrayIcon } from './icons.tsx';

interface MaterialsViewProps {
    materials: Material[];
    worklets: Worklet[];
    onSaveMaterial: (material: Material) => Promise<void>;
    onDeleteMaterial: (materialId: string) => Promise<void>;
    onNavigateToPlayground: (materialId: string) => void;
}

const getFileIcon = (material: Material) => {
    switch(material.type) {
        case MaterialType.PDF: return '📄';
        case MaterialType.VIDEO: return '🎬';
        case MaterialType.AUDIO: return '🎵';
        case MaterialType.YOUTUBE: return '📺';
        case MaterialType.EPUB: return '📚';
        case MaterialType.TEXT: return '📝';
        case MaterialType.NOTEBOOK: return material.emoji || '📓';
        default: return '📎';
    }
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const NotebookSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (notebook: Material) => void;
    notebookToEdit?: Material | null;
}> = ({ isOpen, onClose, onSave, notebookToEdit }) => {
    const isEditing = !!notebookToEdit;
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('📓');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const notebookEmojis = ['📓', '📔', '✍️', '💡', '🧠', '✨'];

    useEffect(() => {
        if(isEditing && notebookToEdit) {
            setName(notebookToEdit.name);
            setEmoji(notebookToEdit.emoji || '📓');
            setOrientation(notebookToEdit.orientation || 'portrait');
        } else {
            setName('');
            setEmoji('📓');
            setOrientation('portrait');
        }
    }, [notebookToEdit, isEditing, isOpen]);


    const handleSubmit = () => {
        if (!name.trim()) return;

        const notebookData: Material = {
            id: isEditing ? notebookToEdit!.id : crypto.randomUUID(),
            name,
            emoji,
            orientation,
            type: MaterialType.NOTEBOOK,
            metadata: notebookToEdit?.metadata || { size: 0 },
            pageCount: notebookToEdit?.pageCount || 1,
            pageBackgrounds: notebookToEdit?.pageBackgrounds || { 1: 'blank' },
            annotations: notebookToEdit?.annotations || {},
            lastViewedPage: notebookToEdit?.lastViewedPage || 1,
        };

        onSave(notebookData);
        onClose();
    };
    
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 flex justify-center items-center z-50 modal-backdrop-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm mx-4 modal-content-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{isEditing ? 'Edit Notebook' : 'Create New Notebook'}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="notebook-name" className="block text-sm font-medium text-slate-700 mb-1">Notebook Name</label>
                        <input id="notebook-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Physics Notes" className="w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Orientation</label>
                        <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-lg">
                           <button onClick={() => setOrientation('portrait')} className={`flex-1 px-4 py-1 text-sm rounded-md transition-all ${orientation === 'portrait' ? 'bg-white shadow-sm font-semibold text-blue-700' : 'font-medium text-slate-600'}`}>Vertical</button>
                           <button onClick={() => setOrientation('landscape')} className={`flex-1 px-4 py-1 text-sm rounded-md transition-all ${orientation === 'landscape' ? 'bg-white shadow-sm font-semibold text-blue-700' : 'font-medium text-slate-600'}`}>Horizontal</button>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {notebookEmojis.map(em => (
                                <button key={em} onClick={() => setEmoji(em)} className={`text-2xl p-2 rounded-lg transition transform hover:scale-110 ${emoji === em ? 'bg-blue-200' : 'bg-slate-200'}`}>{em}</button>
                            ))}
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-md font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={!name.trim()} className="px-4 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">{isEditing ? 'Save Changes' : 'Create'}</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

const MaterialsView: React.FC<MaterialsViewProps> = ({ materials, worklets, onSaveMaterial, onDeleteMaterial, onNavigateToPlayground }) => {
    const [activeTab, setActiveTab] = useState<'files' | 'notebooks'>('files');
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [editingNotebook, setEditingNotebook] = useState<Material | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const pdfImportInputRef = useRef<HTMLInputElement>(null);

    const { files, notebooks } = useMemo(() => {
        const files: Material[] = [];
        const notebooks: Material[] = [];
        materials.forEach(m => {
            if (m.type === MaterialType.NOTEBOOK) notebooks.push(m);
            else files.push(m);
        });
        return { files, notebooks };
    }, [materials]);

    const workletsByMaterial = useMemo(() => {
        const map = new Map<string, string[]>();
        worklets.forEach(w => {
            if (w.type === WorkletType.Assignment || w.type === WorkletType.Exam) {
                (w as Assignment | Exam).materialIds.forEach(id => {
                    if (!map.has(id)) map.set(id, []);
                    map.get(id)!.push(w.name);
                });
            }
        });
        return map;
    }, [worklets]);

    const handleDelete = (material: Material) => {
        const linkedWorklets = workletsByMaterial.get(material.id);
        const confirmMessage = linkedWorklets && linkedWorklets.length > 0
            ? `This material is used in ${linkedWorklets.length} worklet(s) (${linkedWorklets.join(', ')}). Deleting it will remove it from them. Are you sure?`
            : `Are you sure you want to delete "${material.name}"? This cannot be undone.`;

        if (window.confirm(confirmMessage)) onDeleteMaterial(material.id);
    };

    const handlePdfFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const newNotebookId = crypto.randomUUID();
            const firstPage = await pdfDoc.getPage(1);
            const viewportCheck = firstPage.getViewport({ scale: 1 });
            const orientation = viewportCheck.width > viewportCheck.height ? 'landscape' : 'portrait';
            
            const newAnnotations: AllAnnotations = {};
            const desiredWidth = 1200;
            
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1 });
                const scale = desiredWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                const context = canvas.getContext('2d');

                if (context) {
                    await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
                    const imageDataUrl = canvas.toDataURL('image/png');
                    const imageAnnotation: ImageAnnotation = {
                        id: crypto.randomUUID(),
                        type: 'image',
                        imageData: imageDataUrl,
                        x: 0,
                        y: 0,
                        width: scaledViewport.width,
                        height: scaledViewport.height,
                    };
                    newAnnotations[i] = [imageAnnotation];
                }
            }

            const newNotebook: Material = {
                id: newNotebookId,
                name: file.name.replace(/\.pdf$/i, ''),
                type: MaterialType.NOTEBOOK,
                emoji: '📄',
                orientation: orientation,
                metadata: { size: file.size, pageCount: pdfDoc.numPages },
                pageCount: pdfDoc.numPages,
                annotations: newAnnotations,
                pageBackgrounds: {},
                lastViewedPage: 1,
            };
            
            await onSaveMaterial(newNotebook);
            alert(`Successfully imported "${newNotebook.name}" as a new notebook!`);

        } catch (error) {
            console.error("Failed to import PDF:", error);
            alert(`An error occurred while importing the PDF. Please check the console for details. Error: ${error instanceof Error ? error.message : "Unknown Error"}`);
        } finally {
            setIsImporting(false);
            if (event.target) event.target.value = '';
        }
    };
    
    const handleExport = async (material: Material) => {
        if ((material.type !== MaterialType.PDF && material.type !== MaterialType.NOTEBOOK) || !(window as any).jspdf) {
            alert("Export is only available for PDF and Notebook materials."); return;
        }
        setIsExporting(material.id);
        try {
            const { jsPDF } = (window as any).jspdf;
            const drawAnnotationOnContext = async (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
                ctx.save();
                if (annotation.type === 'path') {
                    const isHighlighter = annotation.mode === 'highlighter', isEraser = annotation.mode === 'eraser';
                    ctx.globalCompositeOperation = isEraser ? 'destination-out' : (isHighlighter ? 'multiply' : 'source-over');
                    if (!isEraser) ctx.globalAlpha = isHighlighter ? 0.4 : 1.0;
                    ctx.beginPath(); ctx.strokeStyle = annotation.color; ctx.lineWidth = annotation.lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    if(annotation.points.length > 0) { ctx.moveTo(annotation.points[0].x, annotation.points[0].y); annotation.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke(); }
                } else if (annotation.type === 'text') {
                    ctx.fillStyle = annotation.color; ctx.font = `${annotation.size}px ${annotation.font}`; ctx.textBaseline = 'top'; ctx.fillText(annotation.text, annotation.x, annotation.y);
                } else if (annotation.type === 'image') {
                    const img = new Image(); await new Promise<void>(r => { img.onload=()=>r(); img.src = (annotation as ImageAnnotation).imageData; });
                    ctx.drawImage(img, annotation.x, annotation.y, annotation.width, annotation.height);
                }
                ctx.restore();
            };

            if (material.type === MaterialType.NOTEBOOK) {
                const isLandscape = material.orientation === 'landscape';
                const dims = { width: 1200, height: isLandscape ? (1200 * (1/1.29)) : (1200 * 1.29) }; // A4-ish ratio
                if(isLandscape) { [dims.width, dims.height] = [dims.height, dims.width] }

                const pdfExport = new jsPDF({ orientation: material.orientation || 'portrait', unit: 'px', format: [dims.width, dims.height] });

                for (let i = 1; i <= (material.pageCount || 1); i++) {
                    if (i > 1) pdfExport.addPage([dims.width, dims.height], material.orientation || 'portrait');
                    const canvas = document.createElement('canvas'); canvas.width = dims.width; canvas.height = dims.height; const context = canvas.getContext('2d');
                    if (context) {
                        context.fillStyle = 'white'; context.fillRect(0, 0, dims.width, dims.height);
                        const bgType = material.pageBackgrounds?.[i] || 'blank';
                        if (bgType !== 'blank') {
                            context.strokeStyle = '#e2e8f0'; context.lineWidth = 1;
                            if (bgType === 'lines') for (let y = 30; y < dims.height; y += 30) { context.beginPath(); context.moveTo(0, y); context.lineTo(dims.width, y); context.stroke(); }
                            if (bgType === 'grid') {
                                for (let x = 0; x < dims.width; x += 20) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, dims.height); context.stroke(); }
                                for (let y = 0; y < dims.height; y += 20) { context.beginPath(); context.moveTo(0, y); context.lineTo(dims.width, y); context.stroke(); }
                            }
                        }
                        for(const anno of (material.annotations?.[i] || [])) await drawAnnotationOnContext(context, anno);
                    }
                    pdfExport.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, dims.width, dims.height);
                }
                pdfExport.save(`${material.name}-notebook.pdf`);

            } else { // PDF
                const reader = new FileReader();
                await new Promise<void>((resolve, reject) => {
                    reader.onload = async (e) => {
                        try {
                            const pdfDoc = await (window as any).pdfjsLib.getDocument({ data: new Uint8Array(e.target!.result as ArrayBuffer) }).promise;
                            const firstPageForFormat = await pdfDoc.getPage(1); const viewportForFormat = firstPageForFormat.getViewport({ scale: 1.5 });
                            const pdfExport = new jsPDF({ orientation: viewportForFormat.width > viewportForFormat.height ? 'l' : 'p', unit: 'pt', format: [viewportForFormat.width, viewportForFormat.height] });
                            for (let i = 1; i <= pdfDoc.numPages; i++) {
                                const page = await pdfDoc.getPage(i); const viewport = page.getViewport({ scale: 1.5 });
                                const canvas = document.createElement('canvas'); canvas.height = viewport.height; canvas.width = viewport.width; const context = canvas.getContext('2d');
                                if (context) {
                                    await page.render({ canvasContext: context, viewport }).promise;
                                    for(const anno of (material.annotations?.[i] || [])) await drawAnnotationOnContext(context, anno);
                                }
                                if (i > 1) pdfExport.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
                                pdfExport.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, viewport.width, viewport.height);
                            }
                            pdfExport.save(`${material.name.replace('.pdf', '')}-annotated.pdf`); resolve();
                        } catch (err) { reject(err); }
                    };
                    reader.onerror = reject; reader.readAsArrayBuffer(material.blob!);
                });
            }
        } catch (error) { console.error("Failed to export:", error); alert("An error occurred during export."); } 
        finally { setIsExporting(null); }
    };
    
    const renderGrid = (items: Material[]) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map(material => (
                <div key={material.id} className="bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col">
                    <div className="p-4 flex-grow">
                        <div className="flex justify-between items-start">
                            <span className="text-4xl">{getFileIcon(material)}</span>
                             <div className="flex items-center gap-1">
                                {material.type === 'NOTEBOOK' && (
                                    <button onClick={() => setEditingNotebook(material)} className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-100 rounded-full transition-colors"><PencilIcon className="w-5 h-5"/></button>
                                )}
                                <button onClick={() => handleDelete(material)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 mt-3 truncate" title={material.name}>{material.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">{material.type === MaterialType.NOTEBOOK ? `${material.pageCount || 1} page(s)` : formatBytes(material.metadata.size)}</p>
                        <div className="mt-3 flex gap-2">
                            <button onClick={() => onNavigateToPlayground(material.id)} className="flex-1 text-xs px-2 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300 transition flex items-center justify-center gap-1"><EyeIcon className="w-4 h-4"/><span>View</span></button>
                            {(material.type === MaterialType.PDF || material.type === MaterialType.NOTEBOOK) && (
                                <button onClick={() => handleExport(material)} disabled={isExporting === material.id} className="flex-1 text-xs px-2 py-1.5 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition disabled:bg-blue-300">{isExporting === material.id ? '...' : 'Export'}</button>
                            )}
                        </div>
                    </div>
                    <div className="border-t border-slate-200/80 px-4 py-2">
                         <p className="text-xs text-slate-600 truncate">
                            {workletsByMaterial.has(material.id) ? `Used in: ${workletsByMaterial.get(material.id)![0]}` : 'Not linked to any worklet'}
                            {(workletsByMaterial.get(material.id)?.length || 0) > 1 && ` and ${workletsByMaterial.get(material.id)!.length - 1} more`}
                         </p>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-4 sm:p-6">
            <input type="file" ref={pdfImportInputRef} className="hidden" accept=".pdf" onChange={handlePdfFileSelected} />
            <NotebookSettingsModal isOpen={!!editingNotebook} onClose={() => setEditingNotebook(null)} onSave={onSaveMaterial} notebookToEdit={editingNotebook} />
             <NotebookSettingsModal isOpen={!editingNotebook && isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={onSaveMaterial} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Library</h1>
                    <p className="text-lg text-slate-600 mt-1">Manage your study materials and notebooks.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => pdfImportInputRef.current?.click()}
                        disabled={isImporting}
                        className="px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 font-semibold transition shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5"/>{isImporting ? 'Importing...' : 'Import PDF'}
                    </button>
                    <button onClick={() => { setEditingNotebook(null); setIsCreateModalOpen(true); }} className="px-4 py-2 rounded-md text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:to-blue-500 font-semibold transition shadow-sm hover:shadow-md flex items-center gap-2"><BookOpenIcon className="w-5 h-5"/>Create Notebook</button>
                </div>
            </div>
            
            <div className="mb-6 flex items-center gap-2 border-b border-slate-200">
                <button onClick={() => setActiveTab('files')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'files' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Files ({files.length})</button>
                <button onClick={() => setActiveTab('notebooks')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'notebooks' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Notebooks ({notebooks.length})</button>
            </div>
            
            {activeTab === 'files' && (
                files.length > 0 ? renderGrid(files) : (
                    <div className="text-center py-16 px-4 bg-gradient-to-br from-sky-50 to-white/50 rounded-lg shadow-inner mt-8">
                        <p className="text-lg text-slate-500">No files uploaded.</p>
                        <p className="text-sm text-slate-400 mt-2">Upload materials when creating a new Assignment or Exam.</p>
                    </div>
                )
            )}

            {activeTab === 'notebooks' && (
                notebooks.length > 0 ? renderGrid(notebooks) : (
                     <div className="text-center py-16 px-4 bg-gradient-to-br from-sky-50 to-white/50 rounded-lg shadow-inner mt-8">
                        <p className="text-lg text-slate-500">No notebooks yet.</p>
                        <p className="text-sm text-slate-400 mt-2">Click "Create Notebook" or "Import PDF" to get started.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default MaterialsView;