// src/pages/TasksPage.js — Görev Yönetim Sistemi
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Button, TextField, IconButton, Avatar, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, InputAdornment, Tooltip,
    List, ListItem, ListItemAvatar, ListItemText, Divider, CircularProgress, Fab
} from '@mui/material';
import {
    Add, Search, Edit, Delete, CheckCircle, Schedule, Flag, Person,
    Comment, FilterList, Sort, Assignment, PlayArrow, RateReview,
    Cancel, DragIndicator, Close, Send
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/config';

const STATUSES = {
    todo: { label: 'Yapılacak', color: '#64748b', icon: <Assignment /> },
    in_progress: { label: 'Devam Ediyor', color: '#1976d2', icon: <PlayArrow /> },
    review: { label: 'İnceleme', color: '#f57c00', icon: <RateReview /> },
    done: { label: 'Tamamlandı', color: '#388e3c', icon: <CheckCircle /> },
    cancelled: { label: 'İptal', color: '#d32f2f', icon: <Cancel /> }
};

const PRIORITIES = {
    low: { label: 'Düşük', color: '#4caf50' },
    medium: { label: 'Orta', color: '#ff9800' },
    high: { label: 'Yüksek', color: '#f44336' },
    urgent: { label: 'Acil', color: '#9c27b0' }
};

const getSiteCode = () => localStorage.getItem('optima_current_site') || 'FXB';

function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);

    // Form state
    const [form, setForm] = useState({
        title: '', description: '', status: 'todo', priority: 'medium',
        assigned_to: '', due_date: '', tags: []
    });

    const headers = { 'Content-Type': 'application/json', 'X-Site-Id': getSiteCode() };

    const loadTasks = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (priorityFilter) params.set('priority', priorityFilter);
            params.set('sort', sortField);
            params.set('order', sortOrder);
            params.set('limit', '100');

            const res = await fetch(`${API_BASE_URL}/api/tasks?${params}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
                setTotal(data.total || 0);
            }
        } catch (err) {
            console.error('Task load error:', err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, priorityFilter, sortField, sortOrder]);

    const loadEmployees = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees`, { headers: { 'X-Site-Id': getSiteCode() } });
            if (res.ok) {
                const data = await res.json();
                setEmployees(Array.isArray(data) ? data : data.employees || []);
            }
        } catch (err) {
            console.error('Employee load error:', err);
        }
    };

    useEffect(() => { loadTasks(); }, [loadTasks]);
    useEffect(() => { loadEmployees(); }, []);

    const handleCreate = async () => {
        try {
            const body = { ...form };
            if (!body.assigned_to) delete body.assigned_to;
            if (!body.due_date) delete body.due_date;

            const res = await fetch(`${API_BASE_URL}/api/tasks`, {
                method: 'POST', headers, body: JSON.stringify(body)
            });
            if (res.ok) {
                setCreateOpen(false);
                setForm({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '', tags: [] });
                loadTasks();
            }
        } catch (err) { console.error('Create error:', err); }
    };

    const handleUpdate = async () => {
        try {
            const body = { ...form };
            if (body.assigned_to === '') body.assigned_to = null;
            if (body.due_date === '') body.due_date = null;

            const res = await fetch(`${API_BASE_URL}/api/tasks/${selectedTask.id}`, {
                method: 'PUT', headers, body: JSON.stringify(body)
            });
            if (res.ok) {
                setEditOpen(false);
                loadTasks();
            }
        } catch (err) { console.error('Update error:', err); }
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'DELETE', headers
            });
            if (res.ok) loadTasks();
        } catch (err) { console.error('Delete error:', err); }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'PUT', headers, body: JSON.stringify({ status: newStatus })
            });
            loadTasks();
        } catch (err) { console.error('Status change error:', err); }
    };

    const openDetail = async (task) => {
        setSelectedTask(task);
        setDetailOpen(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } catch (err) { console.error('Detail load error:', err); }
    };

    const openEdit = (task) => {
        setSelectedTask(task);
        setForm({
            title: task.title, description: task.description || '',
            status: task.status, priority: task.priority,
            assigned_to: task.assigned_to || '', due_date: task.due_date ? task.due_date.split('T')[0] : '',
            tags: task.tags || []
        });
        setEditOpen(true);
    };

    const handleComment = async () => {
        if (!commentText.trim() || !selectedTask) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${selectedTask.id}/comments`, {
                method: 'POST', headers, body: JSON.stringify({ content: commentText })
            });
            if (res.ok) {
                const comment = await res.json();
                setComments([...comments, comment]);
                setCommentText('');
            }
        } catch (err) { console.error('Comment error:', err); }
    };

    // Stats
    const stats = {
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length
    };

    const getEmployeeName = (emp) => emp ? `${emp.first_name} ${emp.last_name}` : '';

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{
                    background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold'
                }}>
                    📋 Görev Yönetimi
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #155a9c 0%, #7aa63d 100%)' }
                    }}>
                    Yeni Görev
                </Button>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} mb={3}>
                {Object.entries(STATUSES).slice(0, 4).map(([key, { label, color, icon }]) => (
                    <Grid item xs={6} md={3} key={key}>
                        <Card sx={{
                            cursor: 'pointer', border: statusFilter === key ? `2px solid ${color}` : '1px solid transparent',
                            transition: 'all 0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 20px ${color}33` }
                        }} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '16px !important' }}>
                                <Avatar sx={{ bgcolor: `${color}20`, color, width: 48, height: 48 }}>{icon}</Avatar>
                                <Box>
                                    <Typography variant="h4" fontWeight="bold" color={color}>{stats[key] || 0}</Typography>
                                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField size="small" placeholder="Görev ara..." value={search} onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: 250 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Durum</InputLabel>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Durum">
                        <MenuItem value="">Tümü</MenuItem>
                        {Object.entries(STATUSES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Öncelik</InputLabel>
                    <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} label="Öncelik">
                        <MenuItem value="">Tümü</MenuItem>
                        {Object.entries(PRIORITIES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Sıralama</InputLabel>
                    <Select value={sortField} onChange={(e) => setSortField(e.target.value)} label="Sıralama">
                        <MenuItem value="created_at">Oluşturma</MenuItem>
                        <MenuItem value="due_date">Son Tarih</MenuItem>
                        <MenuItem value="priority">Öncelik</MenuItem>
                        <MenuItem value="status">Durum</MenuItem>
                    </Select>
                </FormControl>
                <IconButton onClick={() => setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC')}>
                    <Sort sx={{ transform: sortOrder === 'ASC' ? 'scaleY(-1)' : 'none' }} />
                </IconButton>
            </Paper>

            {/* Task List */}
            {loading ? (
                <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            ) : tasks.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <Assignment sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">Henüz görev yok</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>İlk görevinizi oluşturarak başlayın</Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Görev Oluştur</Button>
                </Paper>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {tasks.map((task) => (
                        <Paper key={task.id} sx={{
                            p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer',
                            transition: 'all 0.2s', '&:hover': { transform: 'translateX(4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                            borderLeft: `4px solid ${PRIORITIES[task.priority]?.color || '#ccc'}`
                        }} onClick={() => openDetail(task)}>

                            {/* Status chip */}
                            <Chip
                                size="small" label={STATUSES[task.status]?.label}
                                sx={{ bgcolor: `${STATUSES[task.status]?.color}18`, color: STATUSES[task.status]?.color, fontWeight: 600, minWidth: 90 }}
                            />

                            {/* Title & Description */}
                            <Box flex={1} minWidth={0}>
                                <Typography fontWeight={600} noWrap>{task.title}</Typography>
                                {task.description && (
                                    <Typography variant="caption" color="text.secondary" noWrap>{task.description}</Typography>
                                )}
                            </Box>

                            {/* Priority */}
                            <Chip size="small" icon={<Flag sx={{ fontSize: 14 }} />}
                                label={PRIORITIES[task.priority]?.label}
                                sx={{ bgcolor: `${PRIORITIES[task.priority]?.color}18`, color: PRIORITIES[task.priority]?.color }}
                            />

                            {/* Assignee */}
                            {task.assignee && (
                                <Tooltip title={getEmployeeName(task.assignee)}>
                                    <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: '#1c61ab' }}>
                                        {task.assignee.first_name?.[0]}{task.assignee.last_name?.[0]}
                                    </Avatar>
                                </Tooltip>
                            )}

                            {/* Due date */}
                            {task.due_date && (
                                <Chip size="small" icon={<Schedule sx={{ fontSize: 14 }} />}
                                    label={new Date(task.due_date).toLocaleDateString('tr-TR')}
                                    sx={{
                                        bgcolor: new Date(task.due_date) < new Date() && task.status !== 'done' ? '#ffebee' : '#e8f5e9',
                                        color: new Date(task.due_date) < new Date() && task.status !== 'done' ? '#c62828' : '#2e7d32'
                                    }}
                                />
                            )}

                            {/* Actions */}
                            <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="Düzenle">
                                    <IconButton size="small" onClick={() => openEdit(task)}><Edit fontSize="small" /></IconButton>
                                </Tooltip>
                                <Tooltip title="Sil">
                                    <IconButton size="small" color="error" onClick={() => handleDelete(task.id)}><Delete fontSize="small" /></IconButton>
                                </Tooltip>
                            </Box>
                        </Paper>
                    ))}
                </Box>
            )}

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)', color: 'white' }}>
                    <Box display="flex" alignItems="center" gap={1}><Add /> Yeni Görev Oluştur</Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Görev Başlığı" value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={3} label="Açıklama" value={form.description}
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
                                <InputLabel>Durum</InputLabel>
                                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} label="Durum">
                                    {Object.entries(STATUSES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
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
                        <Grid item xs={6}>
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

            {/* Edit Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle sx={{ background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)', color: 'white' }}>
                    <Box display="flex" alignItems="center" gap={1}><Edit /> Görevi Düzenle</Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Görev Başlığı" value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={3} label="Açıklama" value={form.description}
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
                                <InputLabel>Durum</InputLabel>
                                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} label="Durum">
                                    {Object.entries(STATUSES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
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
                        <Grid item xs={6}>
                            <TextField fullWidth type="date" label="Son Tarih" value={form.due_date}
                                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setEditOpen(false)}>İptal</Button>
                    <Button variant="contained" onClick={handleUpdate} disabled={!form.title.trim()}
                        sx={{ background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)' }}>
                        Güncelle
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                {selectedTask && (
                    <>
                        <DialogTitle sx={{
                            background: `linear-gradient(135deg, ${STATUSES[selectedTask.status]?.color} 0%, ${PRIORITIES[selectedTask.priority]?.color} 100%)`,
                            color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <Box display="flex" alignItems="center" gap={1}>
                                {STATUSES[selectedTask.status]?.icon}
                                <Typography variant="h6">{selectedTask.title}</Typography>
                            </Box>
                            <IconButton color="inherit" onClick={() => setDetailOpen(false)}><Close /></IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ mt: 2 }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={8}>
                                    {/* Description */}
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>📝 Açıklama</Typography>
                                    <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                                        {selectedTask.description || 'Açıklama eklenmemiş'}
                                    </Typography>

                                    {/* Comments */}
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        💬 Yorumlar ({comments.length})
                                    </Typography>
                                    <List>
                                        {comments.map((c) => (
                                            <ListItem key={c.id} alignItems="flex-start" sx={{ px: 0 }}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: '#1c61ab', width: 32, height: 32, fontSize: 13 }}>
                                                        {c.author?.first_name?.[0]}{c.author?.last_name?.[0]}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={<Typography variant="subtitle2">{getEmployeeName(c.author)}</Typography>}
                                                    secondary={
                                                        <>
                                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.content}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {new Date(c.created_at).toLocaleString('tr-TR')}
                                                            </Typography>
                                                        </>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                    <Box display="flex" gap={1} mt={1}>
                                        <TextField fullWidth size="small" placeholder="Yorum yaz..." value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()} />
                                        <IconButton color="primary" onClick={handleComment} disabled={!commentText.trim()}>
                                            <Send />
                                        </IconButton>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>Detaylar</Typography>

                                        <Box mb={2}>
                                            <Typography variant="caption" color="text.secondary">Durum</Typography>
                                            <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                                                <Select value={selectedTask.status}
                                                    onChange={(e) => {
                                                        handleStatusChange(selectedTask.id, e.target.value);
                                                        setSelectedTask({ ...selectedTask, status: e.target.value });
                                                    }}>
                                                    {Object.entries(STATUSES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Box>

                                        <Box mb={2}>
                                            <Typography variant="caption" color="text.secondary">Öncelik</Typography>
                                            <Box mt={0.5}>
                                                <Chip size="small" icon={<Flag />}
                                                    label={PRIORITIES[selectedTask.priority]?.label}
                                                    sx={{ bgcolor: `${PRIORITIES[selectedTask.priority]?.color}18`, color: PRIORITIES[selectedTask.priority]?.color }}
                                                />
                                            </Box>
                                        </Box>

                                        {selectedTask.assignee && (
                                            <Box mb={2}>
                                                <Typography variant="caption" color="text.secondary">Atanan Kişi</Typography>
                                                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#1c61ab' }}>
                                                        {selectedTask.assignee.first_name?.[0]}{selectedTask.assignee.last_name?.[0]}
                                                    </Avatar>
                                                    <Typography variant="body2">{getEmployeeName(selectedTask.assignee)}</Typography>
                                                </Box>
                                            </Box>
                                        )}

                                        {selectedTask.creator && (
                                            <Box mb={2}>
                                                <Typography variant="caption" color="text.secondary">Oluşturan</Typography>
                                                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#8bb94a' }}>
                                                        {selectedTask.creator.first_name?.[0]}{selectedTask.creator.last_name?.[0]}
                                                    </Avatar>
                                                    <Typography variant="body2">{getEmployeeName(selectedTask.creator)}</Typography>
                                                </Box>
                                            </Box>
                                        )}

                                        {selectedTask.due_date && (
                                            <Box mb={2}>
                                                <Typography variant="caption" color="text.secondary">Son Tarih</Typography>
                                                <Typography variant="body2" mt={0.5}>
                                                    📅 {new Date(selectedTask.due_date).toLocaleDateString('tr-TR')}
                                                </Typography>
                                            </Box>
                                        )}

                                        <Box mb={2}>
                                            <Typography variant="caption" color="text.secondary">Oluşturulma</Typography>
                                            <Typography variant="body2" mt={0.5}>
                                                {new Date(selectedTask.created_at).toLocaleString('tr-TR')}
                                            </Typography>
                                        </Box>

                                        {selectedTask.completed_at && (
                                            <Box mb={2}>
                                                <Typography variant="caption" color="text.secondary">Tamamlanma</Typography>
                                                <Typography variant="body2" mt={0.5}>
                                                    ✅ {new Date(selectedTask.completed_at).toLocaleString('tr-TR')}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Paper>
                                </Grid>
                            </Grid>
                        </DialogContent>
                    </>
                )}
            </Dialog>
        </Box>
    );
}

export default TasksPage;
