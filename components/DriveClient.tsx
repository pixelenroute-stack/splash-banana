
import React, { useEffect, useState } from 'react';
import { googleService } from '../services/googleService';
import { DriveFile } from '../types';
import { 
    Folder, FileText, Image as ImageIcon, Film, Music, MoreVertical, 
    Download, Trash2, UploadCloud, FolderPlus, ChevronRight, Home, Loader2, ArrowLeft, RefreshCw 
} from 'lucide-react';

export const DriveClient: React.FC = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([{id: 'root', name: 'Mon Drive'}]);
  const [dragActive, setDragActive] = useState(false);

  const CURRENT_USER_ID = "user_1";

  useEffect(() => {
      loadFiles(currentFolderId);
  }, [currentFolderId]);

  const loadFiles = async (folderId: string) => {
      setLoading(true);
      try {
          const res = await googleService.listDriveFiles(CURRENT_USER_ID, folderId);
          setFiles(res);
      } catch (e) {
          alert("Erreur Drive: " + (e as Error).message);
      } finally {
          setLoading(false);
      }
  };

  const handleSync = async () => {
      setIsSyncing(true);
      try {
          const status = await googleService.getAccountStatus(CURRENT_USER_ID);
          // Utilise l'email des settings ou de l'OAuth
          if(status.connected && status.email) {
             await googleService.triggerN8NSync(CURRENT_USER_ID, status.email);
             loadFiles(currentFolderId);
          } else {
             alert("Aucun compte configuré pour la synchronisation.");
          }
      } catch(e) { console.error(e); }
      setIsSyncing(false);
  };

  const navigateTo = (folderId: string, folderName: string) => {
      setCurrentFolderId(folderId);
      setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateUp = () => {
      if (folderHistory.length <= 1) return;
      const newHistory = [...folderHistory];
      newHistory.pop();
      const parent = newHistory[newHistory.length - 1];
      setCurrentFolderId(parent.id);
      setFolderHistory(newHistory);
  };

  const handleBreadcrumbClick = (index: number) => {
      const newHistory = folderHistory.slice(0, index + 1);
      const target = newHistory[newHistory.length - 1];
      setCurrentFolderId(target.id);
      setFolderHistory(newHistory);
  };

  const handleCreateFolder = async () => {
      const name = prompt("Nom du dossier ?");
      if (!name) return;
      setLoading(true);
      try {
          await googleService.createDriveFolder(CURRENT_USER_ID, name, currentFolderId);
          loadFiles(currentFolderId);
      } catch (e) { alert((e as Error).message); }
      setLoading(false);
  };

  const handleFileUpload = async (file: File) => {
      setLoading(true);
      try {
          await googleService.uploadFile(CURRENT_USER_ID, file, currentFolderId);
          loadFiles(currentFolderId);
      } catch (e) { alert((e as Error).message); }
      setLoading(false);
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
      else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileUpload(e.dataTransfer.files[0]);
      }
  };

  // Helper Icon
  const getFileIcon = (mime: string) => {
      if (mime.includes('folder')) return <Folder className="text-blue-400 fill-blue-400/20" size={24} />;
      if (mime.includes('image')) return <ImageIcon className="text-purple-400" size={24} />;
      if (mime.includes('video')) return <Film className="text-red-400" size={24} />;
      if (mime.includes('audio')) return <Music className="text-pink-400" size={24} />;
      if (mime.includes('pdf')) return <FileText className="text-orange-400" size={24} />;
      return <FileText className="text-slate-400" size={24} />;
  };

  const formatSize = (bytes?: number) => {
      if (!bytes) return '-';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col h-full bg-[#020617]" onDragEnter={handleDrag}>
      
      {/* HEADER & TOOLBAR */}
      <header className="bg-surface border-b border-slate-700 p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-6 h-6"/>
                  Mon Drive
              </h1>
              <div className="flex gap-2">
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-600 transition-colors"
                    title="Synchroniser (N8N)"
                  >
                      <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  </button>

                  <button onClick={handleCreateFolder} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm border border-slate-600 transition-colors">
                      <FolderPlus size={16}/> Nouveau dossier
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors shadow-lg shadow-primary/20">
                      <UploadCloud size={16}/> Importer
                      <input type="file" className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} />
                  </label>
              </div>
          </div>

          {/* BREADCRUMBS */}
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              {folderHistory.length > 1 && (
                   <button onClick={navigateUp} className="p-1 hover:bg-slate-800 rounded text-white mr-2">
                       <ArrowLeft size={16}/>
                   </button>
              )}
              {folderHistory.map((folder, idx) => (
                  <React.Fragment key={folder.id}>
                      {idx > 0 && <ChevronRight size={14} className="text-slate-600"/>}
                      <button 
                          onClick={() => handleBreadcrumbClick(idx)}
                          className={`hover:text-white px-1 py-0.5 rounded hover:bg-slate-800 transition-colors ${idx === folderHistory.length - 1 ? 'font-bold text-white' : ''}`}
                      >
                          {idx === 0 ? <Home size={14}/> : folder.name}
                      </button>
                  </React.Fragment>
              ))}
          </div>
      </header>

      {/* DRAG OVERLAY */}
      {dragActive && (
          <div 
            className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-primary m-4 rounded-xl"
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
              <div className="text-center pointer-events-none">
                  <UploadCloud size={64} className="mx-auto text-white mb-4 animate-bounce"/>
                  <h3 className="text-2xl font-bold text-white">Déposez vos fichiers ici</h3>
              </div>
          </div>
      )}

      {/* FILE LIST */}
      <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500 gap-3">
                  <Loader2 className="animate-spin" /> Chargement du Drive...
              </div>
          ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 opacity-50">
                  <FolderPlus size={48} />
                  <p>Ce dossier est vide.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {files.map(file => (
                      <div 
                        key={file.id} 
                        className="group bg-surface border border-slate-700 rounded-xl p-4 hover:border-slate-500 hover:bg-slate-800/50 transition-all cursor-pointer relative"
                        onClick={() => file.mimeType.includes('folder') && navigateTo(file.id, file.name)}
                      >
                          <div className="flex items-start justify-between mb-3">
                              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 group-hover:border-slate-600">
                                  {getFileIcon(file.mimeType)}
                              </div>
                              <button className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700">
                                  <MoreVertical size={16} />
                              </button>
                          </div>
                          <h3 className="font-medium text-white truncate mb-1" title={file.name}>{file.name}</h3>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                              <span>{file.mimeType.includes('folder') ? 'Dossier' : formatSize(file.size)}</span>
                              <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                          </div>
                          
                          {/* Hover Actions */}
                          {!file.mimeType.includes('folder') && (
                              <div className="absolute top-4 right-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-surface rounded-lg border border-slate-700 p-1 shadow-lg">
                                  <button className="p-1.5 hover:bg-slate-700 rounded text-primary" title="Télécharger">
                                      <Download size={14}/>
                                  </button>
                                  <button className="p-1.5 hover:bg-slate-700 rounded text-red-400" title="Supprimer">
                                      <Trash2 size={14}/>
                                  </button>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};
