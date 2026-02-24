// src/pages/FilesPage.js — Dosya Yönetim Sistemi
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Paper, Button, IconButton, Chip, Avatar, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
    Card, CardContent, LinearProgress, List, ListItem, ListItemIcon,
    ListItemText, Breadcrumbs, Link, CircularProgress, Divider
} from '@mui/material';
import {
    Folder, CreateNewFolder, Upload, Download, Delete, InsertDriveFile,
    Image, PictureAsPdf, Description, VideoFile, AudioFile, Code,
    NavigateNext, Home, CloudUpload, Search, History, RestorePage,
    Refresh, FolderOpen
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/config';

const getSiteCode = () => localStorage.getItem('optima_current_site') || 'FXB';

const getFileIcon = (mimeType) => {
    if (!mimeType) return <InsertDriveFile />;
    if (mimeType.startsWith('image/')) return <Image sx={{ color: '#4caf50' }} />;
    if (mimeType === 'application/pdf') return <PictureAsPdf sx={{ color: '#f44336' }} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <Description sx={{ color: '#2196f3' }} />;
    if (mimeType.startsWith('video/')) return <VideoFile sx={{ color: '#9c27b0' }} />;
    if (mimeType.startsWith('audio/')) return <AudioFile sx={{ color: '#ff9800' }} />;
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html')) return <Code sx={{ color: '#607d8b' }} />;
    return <InsertDriveFile sx={{ color: '#757575' }} />;
};

const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function FilesPage() {
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderPath, setFolderPath] = useState([]);
    const [search, setSearch] = useState('');
    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [versionDialogOpen, setVersionDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [versions, setVersions] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const headers = { 'X-Site-Id': getSiteCode() };

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            const folderId = currentFolder ? currentFolder.id : 'root';
            const params = new URLSearchParams({ folder_id: folderId });
            if (search) params.set('search', search);

            const res = await fetch(`${API_BASE_URL}/api/files?${params}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files || []);
                setFolders(data.folders || []);
            }
        } catch (err) { console.error('Load error:', err); }
        finally { setLoading(false); }
    }, [currentFolder, search]);

    useEffect(() => { loadFiles(); }, [loadFiles]);

    const handleUpload = async (fileList) => {
        if (!fileList.length) return;
        setUploading(true);
        try {
            for (const file of fileList) {
                const formData = new FormData();
                formData.append('file', file);
                if (currentFolder) formData.append('folder_id', currentFolder.id);

                await fetch(`${API_BASE_URL}/api/files/upload`, {
                    method: 'POST', headers, body: formData
                });
            }
            loadFiles();
        } catch (err) { console.error('Upload error:', err); }
        finally { setUploading(false); }
    };

    const handleNewVersion = async (file, newFile) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', newFile);
            formData.append('comment', 'Yeni versiyon yüklendi');

            await fetch(`${API_BASE_URL}/api/files/${file.id}/new-version`, {
                method: 'POST', headers, body: formData
            });
            loadFiles();
        } catch (err) { console.error('Version upload error:', err); }
        finally { setUploading(false); }
    };

    const handleDownload = async (file) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/files/${file.id}/download`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data.url) window.open(data.url, '_blank');
            }
        } catch (err) { console.error('Download error:', err); }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_BASE_URL}/api/files/${fileId}`, { method: 'DELETE', headers });
            loadFiles();
        } catch (err) { console.error('Delete error:', err); }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await fetch(`${API_BASE_URL}/api/files/folder`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newFolderName,
                    parent_id: currentFolder?.id || null
                })
            });
            setNewFolderOpen(false);
            setNewFolderName('');
            loadFiles();
        } catch (err) { console.error('Create folder error:', err); }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!window.confirm('Bu klasörü silmek istediğinize emin misiniz? İçindeki dosyalar köke taşınacak.')) return;
        try {
            await fetch(`${API_BASE_URL}/api/files/folder/${folderId}`, { method: 'DELETE', headers });
            loadFiles();
        } catch (err) { console.error('Delete folder error:', err); }
    };

    const navigateToFolder = (folder) => {
        if (folder) {
            setFolderPath([...folderPath, folder]);
            setCurrentFolder(folder);
        } else {
            setFolderPath([]);
            setCurrentFolder(null);
        }
    };

    const navigateToPathIndex = (index) => {
        if (index < 0) {
            setFolderPath([]);
            setCurrentFolder(null);
        } else {
            const newPath = folderPath.slice(0, index + 1);
            setFolderPath(newPath);
            setCurrentFolder(newPath[newPath.length - 1]);
        }
    };

    const openVersionHistory = async (file) => {
        setSelectedFile(file);
        setVersionDialogOpen(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/files/${file.id}/versions`, { headers });
            if (res.ok) setVersions(await res.json());
        } catch (err) { console.error('Versions error:', err); }
    };

    const restoreVersion = async (versionId) => {
        try {
            await fetch(`${API_BASE_URL}/api/files/${selectedFile.id}/versions/${versionId}/restore`, {
                method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }
            });
            setVersionDialogOpen(false);
            loadFiles();
        } catch (err) { console.error('Restore error:', err); }
    };

    // Drag & Drop
    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(Array.from(e.dataTransfer.files));
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{
                    background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold'
                }}>
                    📁 Dosya Yönetimi
                </Typography>
                <Box display="flex" gap={1}>
                    <Button variant="outlined" startIcon={<CreateNewFolder />} onClick={() => setNewFolderOpen(true)}
                        sx={{ borderRadius: '12px' }}>Yeni Klasör</Button>
                    <Button variant="contained" startIcon={<Upload />} onClick={() => fileInputRef.current?.click()}
                        sx={{ background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)' }}>
                        Dosya Yükle
                    </Button>
                    <input ref={fileInputRef} type="file" multiple hidden
                        onChange={(e) => handleUpload(Array.from(e.target.files))} />
                </Box>
            </Box>

            {/* Breadcrumbs */}
            <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
                <Link underline="hover" sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                    onClick={() => navigateToFolder(null)}>
                    <Home fontSize="small" /> Ana Dizin
                </Link>
                {folderPath.map((folder, idx) => (
                    <Link key={folder.id} underline="hover" sx={{ cursor: 'pointer' }}
                        onClick={() => navigateToPathIndex(idx)}>
                        {folder.name}
                    </Link>
                ))}
            </Breadcrumbs>

            {/* Search */}
            <Paper sx={{ p: 1.5, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Search sx={{ color: 'text.secondary' }} />
                <TextField size="small" fullWidth variant="standard" placeholder="Dosya veya klasör ara..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    InputProps={{ disableUnderline: true }} />
                <IconButton size="small" onClick={loadFiles}><Refresh /></IconButton>
            </Paper>

            {uploading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {/* Drag & Drop Zone */}
            <Box
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                sx={{
                    minHeight: dragOver ? 200 : 'auto',
                    border: dragOver ? '2px dashed #1c61ab' : 'none',
                    borderRadius: 2, bgcolor: dragOver ? 'rgba(28, 97, 171, 0.05)' : 'transparent',
                    transition: 'all 0.3s', p: dragOver ? 3 : 0,
                    display: dragOver ? 'flex' : 'block',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                {dragOver ? (
                    <Box textAlign="center">
                        <CloudUpload sx={{ fontSize: 64, color: '#1c61ab', mb: 1 }} />
                        <Typography color="primary">Dosyaları buraya bırakın</Typography>
                    </Box>
                ) : loading ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                ) : (
                    <>
                        {/* Folders */}
                        {folders.length > 0 && (
                            <Grid container spacing={2} mb={2}>
                                {folders.map((folder) => (
                                    <Grid item xs={6} sm={4} md={3} lg={2} key={folder.id}>
                                        <Card sx={{
                                            cursor: 'pointer', transition: 'all 0.2s', borderRadius: '12px',
                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                                        }} onClick={() => navigateToFolder(folder)}>
                                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                                <Folder sx={{ fontSize: 48, color: folder.color || '#1c61ab', mb: 1 }} />
                                                <Typography variant="subtitle2" noWrap>{folder.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {folder.file_count || 0} dosya
                                                </Typography>
                                                <Box sx={{ mt: 1 }} onClick={(e) => e.stopPropagation()}>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteFolder(folder.id)}>
                                                        <Delete sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}

                        {folders.length > 0 && files.length > 0 && <Divider sx={{ my: 2 }} />}

                        {/* Files */}
                        {files.length > 0 ? (
                            <List>
                                {files.map((file) => (
                                    <ListItem key={file.id} sx={{
                                        borderRadius: '8px', mb: 0.5,
                                        '&:hover': { bgcolor: 'rgba(28, 97, 171, 0.04)' }
                                    }} secondaryAction={
                                        <Box display="flex" gap={0.5}>
                                            {file.version > 1 && (
                                                <Tooltip title="Versiyon Geçmişi">
                                                    <IconButton size="small" onClick={() => openVersionHistory(file)}>
                                                        <History fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="İndir">
                                                <IconButton size="small" onClick={() => handleDownload(file)}>
                                                    <Download fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Yeni Versiyon">
                                                <IconButton size="small" component="label" color="primary">
                                                    <Upload fontSize="small" />
                                                    <input type="file" hidden onChange={(e) => {
                                                        if (e.target.files[0]) handleNewVersion(file, e.target.files[0]);
                                                    }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Sil">
                                                <IconButton size="small" color="error" onClick={() => handleDelete(file.id)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    }>
                                        <ListItemIcon>{getFileIcon(file.mime_type)}</ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2" fontWeight={500}>{file.name}</Typography>
                                                    {file.version > 1 && (
                                                        <Chip label={`v${file.version}`} size="small"
                                                            sx={{ height: 18, fontSize: 10, bgcolor: '#e3f2fd', color: '#1565c0' }} />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box display="flex" gap={2} alignItems="center">
                                                    <Typography variant="caption">{formatSize(file.size)}</Typography>
                                                    <Typography variant="caption">
                                                        {new Date(file.created_at).toLocaleDateString('tr-TR')}
                                                    </Typography>
                                                    {file.uploader && (
                                                        <Typography variant="caption">
                                                            {file.uploader.first_name} {file.uploader.last_name}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : folders.length === 0 && (
                            <Paper sx={{ p: 6, textAlign: 'center' }}>
                                <CloudUpload sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">Henüz dosya yok</Typography>
                                <Typography variant="body2" color="text.secondary" mb={2}>
                                    Dosya yüklemek için yukarıdaki butonu kullanın veya sürükleyip bırakın
                                </Typography>
                            </Paper>
                        )}
                    </>
                )}
            </Box>

            {/* New Folder Dialog */}
            <Dialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>📁 Yeni Klasör</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Klasör Adı" value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)} autoFocus sx={{ mt: 1 }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewFolderOpen(false)}>İptal</Button>
                    <Button variant="contained" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                        Oluştur
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Version History Dialog */}
            <Dialog open={versionDialogOpen} onClose={() => setVersionDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)', color: 'white'
                }}>
                    📋 Versiyon Geçmişi — {selectedFile?.name}
                </DialogTitle>
                <DialogContent>
                    {selectedFile && (
                        <Box mt={2}>
                            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                                <Typography variant="subtitle2" color="success.main">
                                    Mevcut Versiyon (v{selectedFile.version})
                                </Typography>
                                <Typography variant="caption">{formatSize(selectedFile.size)}</Typography>
                            </Paper>
                            {versions.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                                    Henüz eski versiyon yok
                                </Typography>
                            ) : (
                                <List>
                                    {versions.map((v) => (
                                        <ListItem key={v.id} sx={{ borderRadius: '8px', mb: 1, border: '1px solid #eee' }}
                                            secondaryAction={
                                                <Tooltip title="Bu versiyonu geri yükle">
                                                    <IconButton onClick={() => restoreVersion(v.id)}>
                                                        <RestorePage />
                                                    </IconButton>
                                                </Tooltip>
                                            }>
                                            <ListItemText
                                                primary={`Versiyon ${v.version_number}`}
                                                secondary={
                                                    <>
                                                        {formatSize(v.size)} • {new Date(v.created_at).toLocaleString('tr-TR')}
                                                        {v.comment && ` • ${v.comment}`}
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}

export default FilesPage;
