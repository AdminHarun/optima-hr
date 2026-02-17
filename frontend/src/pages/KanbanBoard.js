// src/pages/KanbanBoard.js — Kanban Panosu (Drag & Drop)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Paper, Button, Chip, Avatar, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid,
    FormControl, InputLabel, Select, MenuItem, Card, CardContent, Badge
} from '@mui/material';
import {
    Add, Assignment, PlayArrow, RateReview, CheckCircle, Cancel,
    Flag, Schedule, Person, Edit, Delete, Close, DragIndicator,
    ViewKanban, ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config';

const COLUMNS = [
    { id: 'todo', label: 'Yapılacak', color: '#64748b', icon: <Assignment /> },
    { id: 'in_progress', label: 'Devam Ediyor', color: '#1976d2', icon: <PlayArrow /> },
    { id: 'review', label: 'İnceleme', color: '#f57c00', icon: <RateReview /> },
    { id: 'done', label: 'Tamamlandı', color: '#388e3c', icon: <CheckCircle /> }
];

const PRIORITIES = {
    low: { label: 'Düşük', color: '#4caf50' },
    medium: { label: 'Orta', color: '#ff9800' },
    high: { label: 'Yüksek', color: '#f44336' },
    urgent: { label: 'Acil', color: '#9c27b0' }
};

const getSiteCode = () => localStorage.getItem('optima_current_site') || 'FXB';

function KanbanBoard() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createColumn, setCreateColumn] = useState('todo');
    const [form, setForm] = useState({
        title: '', description: '', priority: 'medium', assigned_to: '', due_date: ''
    });

    const headers = { 'Content-Type': 'application/json', 'X-Site-Id': getSiteCode() };

    const loadTasks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/tasks?limit=200&status=todo,in_progress,review,done`, { headers });
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
            }
        } catch (err) { console.error('Load error:', err); }
        finally { setLoading(false); }
    }, []);

    const loadEmployees = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees`, { headers: { 'X-Site-Id': getSiteCode() } });
            if (res.ok) {
                const data = await res.json();
                setEmployees(Array.isArray(data) ? data : data.employees || []);
            }
        } catch (err) { console.error('Employee load error:', err); }
    };

    useEffect(() => { loadTasks(); loadEmployees(); }, [loadTasks]);

    // Drag & Drop Handlers
    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id.toString());
        // Add visual feedback
        setTimeout(() => e.target.style.opacity = '0.4', 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedTask(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e, columnId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnId);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = async (e, targetColumn) => {
        e.preventDefault();
        setDragOverColumn(null);

        if (!draggedTask || draggedTask.status === targetColumn) return;

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === draggedTask.id ? { ...t, status: targetColumn } : t
        ));

        try {
            await fetch(`${API_BASE_URL}/api/tasks/${draggedTask.id}`, {
                method: 'PUT', headers,
                body: JSON.stringify({ status: targetColumn })
            });
        } catch (err) {
            console.error('Status update error:', err);
            loadTasks(); // Revert on error
        }
    };

    const handleCreate = async () => {
        try {
            const body = { ...form, status: createColumn };
            if (!body.assigned_to) delete body.assigned_to;
            if (!body.due_date) delete body.due_date;

            const res = await fetch(`${API_BASE_URL}/api/tasks`, {
                method: 'POST', headers, body: JSON.stringify(body)
            });
            if (res.ok) {
                setCreateOpen(false);
                setForm({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' });
                loadTasks();
            }
        } catch (err) { console.error('Create error:', err); }
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, { method: 'DELETE', headers });
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) { console.error('Delete error:', err); }
    };

    const openCreateForColumn = (columnId) => {
        setCreateColumn(columnId);
        setCreateOpen(true);
    };

    const getTasksByColumn = (columnId) => tasks.filter(t => t.status === columnId);

    return (
        <Box sx={{ p: 3, height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h4" sx={{
                        background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold'
                    }}>
                        📌 Kanban Panosu
                    </Typography>
                    <Chip label={`${tasks.length} görev`} size="small" sx={{ bgcolor: 'rgba(28, 97, 171, 0.1)' }} />
                </Box>
                <Box display="flex" gap={1}>
                    <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/tasks')}
                        sx={{ borderRadius: '12px' }}>
                        Liste Görünümü
                    </Button>
                    <Button variant="contained" startIcon={<Add />} onClick={() => openCreateForColumn('todo')}
                        sx={{
                            background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #155a9c 0%, #7aa63d 100%)' }
                        }}>
                        Yeni Görev
                    </Button>
                </Box>
            </Box>

            {/* Kanban Columns */}
            <Box sx={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2,
                flex: 1, minHeight: 0, overflow: 'hidden'
            }}>
                {COLUMNS.map((column) => {
                    const columnTasks = getTasksByColumn(column.id);
                    const isOver = dragOverColumn === column.id;

                    return (
                        <Paper
                            key={column.id}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column.id)}
                            sx={{
                                display: 'flex', flexDirection: 'column',
                                borderRadius: '16px',
                                border: isOver ? `2px dashed ${column.color}` : '2px solid transparent',
                                bgcolor: isOver ? `${column.color}08` : 'rgba(255,255,255,0.85)',
                                transition: 'all 0.3s ease',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Column Header */}
                            <Box sx={{
                                p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                borderBottom: `3px solid ${column.color}`, bgcolor: `${column.color}10`
                            }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ bgcolor: column.color, width: 32, height: 32 }}>
                                        {column.icon}
                                    </Avatar>
                                    <Typography fontWeight={700} color={column.color}>{column.label}</Typography>
                                    <Badge badgeContent={columnTasks.length} color="primary" sx={{ ml: 1 }} />
                                </Box>
                                <IconButton size="small" onClick={() => openCreateForColumn(column.id)}
                                    sx={{ color: column.color }}>
                                    <Add fontSize="small" />
                                </IconButton>
                            </Box>

                            {/* Column Body */}
                            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {columnTasks.map((task) => (
                                    <Card
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        onDragEnd={handleDragEnd}
                                        sx={{
                                            cursor: 'grab', borderRadius: '12px',
                                            borderLeft: `4px solid ${PRIORITIES[task.priority]?.color || '#ccc'}`,
                                            transition: 'all 0.2s ease',
                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.12)' },
                                            '&:active': { cursor: 'grabbing' },
                                            opacity: draggedTask?.id === task.id ? 0.5 : 1
                                        }}
                                    >
                                        <CardContent sx={{ p: '12px !important', '&:last-child': { pb: '12px !important' } }}>
                                            {/* Task Header */}
                                            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                                                <Box display="flex" alignItems="center" gap={0.5} sx={{ opacity: 0.5, mb: 0.5 }}>
                                                    <DragIndicator sx={{ fontSize: 16 }} />
                                                    <Typography variant="caption" color="text.secondary">#{task.id}</Typography>
                                                </Box>
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                                    sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
                                                    <Delete sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Box>

                                            {/* Title */}
                                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, lineHeight: 1.3 }}>
                                                {task.title}
                                            </Typography>

                                            {/* Description preview */}
                                            {task.description && (
                                                <Typography variant="caption" color="text.secondary" sx={{
                                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden', mb: 1
                                                }}>
                                                    {task.description}
                                                </Typography>
                                            )}

                                            {/* Footer */}
                                            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <Chip size="small" icon={<Flag sx={{ fontSize: 12 }} />}
                                                        label={PRIORITIES[task.priority]?.label}
                                                        sx={{
                                                            height: 22, fontSize: 11,
                                                            bgcolor: `${PRIORITIES[task.priority]?.color}15`,
                                                            color: PRIORITIES[task.priority]?.color
                                                        }}
                                                    />
                                                    {task.due_date && (
                                                        <Chip size="small" icon={<Schedule sx={{ fontSize: 12 }} />}
                                                            label={new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                            sx={{
                                                                height: 22, fontSize: 11,
                                                                bgcolor: new Date(task.due_date) < new Date() && task.status !== 'done' ? '#ffebee' : '#e3f2fd',
                                                                color: new Date(task.due_date) < new Date() && task.status !== 'done' ? '#c62828' : '#1565c0'
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                                {task.assignee && (
                                                    <Tooltip title={`${task.assignee.first_name} ${task.assignee.last_name}`}>
                                                        <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: '#1c61ab' }}>
                                                            {task.assignee.first_name?.[0]}{task.assignee.last_name?.[0]}
                                                        </Avatar>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}

                                {columnTasks.length === 0 && (
                                    <Box sx={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexDirection: 'column', opacity: 0.4, py: 4
                                    }}>
                                        {column.icon}
                                        <Typography variant="caption" mt={1}>Görev yok</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    );
                })}
            </Box>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{
                    background: `linear-gradient(135deg, ${COLUMNS.find(c => c.id === createColumn)?.color || '#1c61ab'} 0%, #8bb94a 100%)`,
                    color: 'white'
                }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Add /> {COLUMNS.find(c => c.id === createColumn)?.label} — Yeni Görev
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Görev Başlığı" value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                autoFocus />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Açıklama" value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Öncelik</InputLabel>
                                <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} label="Öncelik">
                                    {Object.entries(PRIORITIES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Atanan Kişi</InputLabel>
                                <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} label="Atanan Kişi">
                                    <MenuItem value="">Atanmamış</MenuItem>
                                    {employees.map((emp) => (
                                        <MenuItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth type="date" label="Son Tarih" value={form.due_date}
                                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setCreateOpen(false)}>İptal</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={!form.title.trim()}
                        sx={{ background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)' }}>
                        Oluştur
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default KanbanBoard;
