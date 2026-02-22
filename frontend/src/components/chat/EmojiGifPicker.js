import React, { useState, useEffect } from 'react';
import {
    Box,
    Tabs,
    Tab,
    InputBase,
    CircularProgress,
    Typography,
    ImageList,
    ImageListItem
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import axios from 'axios';

// Placeholder API Key - User needs to provide this in .env
const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY || 'YOUR_GIPHY_API_KEY';

const EmojiGifPicker = ({ onSelect }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [trendingGifs, setTrendingGifs] = useState([]);

    // Fetch trending GIFs on mount
    useEffect(() => {
        if (activeTab === 1 && trendingGifs.length === 0) {
            fetchTrendingGifs();
        }
    }, [activeTab]);

    // Debounce search
    useEffect(() => {
        if (activeTab === 1 && gifSearch.length > 2) {
            const timeoutId = setTimeout(() => {
                searchGifs(gifSearch);
            }, 500);
            return () => clearTimeout(timeoutId);
        } else if (activeTab === 1 && gifSearch.length === 0) {
            setGifs(trendingGifs);
        }
    }, [gifSearch, activeTab, trendingGifs]);

    const fetchTrendingGifs = async () => {
        if (GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') return;
        setLoading(true);
        try {
            const res = await axios.get('https://api.giphy.com/v1/gifs/trending', {
                params: { api_key: GIPHY_API_KEY, limit: 20, rating: 'g' }
            });
            setTrendingGifs(res.data.data);
            if (!gifSearch) setGifs(res.data.data);
        } catch (err) {
            console.error('Giphy Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const searchGifs = async (query) => {
        if (GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') return;
        setLoading(true);
        try {
            const res = await axios.get('https://api.giphy.com/v1/gifs/search', {
                params: { api_key: GIPHY_API_KEY, q: query, limit: 20, rating: 'g' }
            });
            setGifs(res.data.data);
        } catch (err) {
            console.error('Giphy Search Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: 350, height: 450, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    variant="fullWidth"
                    sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 1 } }}
                >
                    <Tab label="Emoji" />
                    <Tab label="GIF" />
                </Tabs>
            </Box>

            {/* Emoji Picker */}
            {activeTab === 0 && (
                <Box sx={{ flex: 1, '& em-emoji-picker': { width: '100%', height: '100%', border: 'none' } }}>
                    <Picker
                        data={data}
                        onEmojiSelect={(emoji) => onSelect({ type: 'emoji', content: emoji.native })}
                        theme="light"
                        previewPosition="none"
                        searchPosition="sticky"
                        skinTonePosition="none"
                    />
                </Box>
            )}

            {/* GIF Picker */}
            {activeTab === 1 && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1, overflow: 'hidden' }}>
                    {/* Search Bar */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.5,
                        mb: 1
                    }}>
                        <SearchIcon color="disabled" sx={{ mr: 1, fontSize: 20 }} />
                        <InputBase
                            placeholder="GIF Ara..."
                            fullWidth
                            value={gifSearch}
                            onChange={(e) => setGifSearch(e.target.value)}
                            sx={{ fontSize: 14 }}
                        />
                    </Box>

                    {/* GIF Grid */}
                    {loading ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <Box sx={{ flex: 1, overflowY: 'auto' }}>
                            {GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY' ? (
                                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    <Typography variant="body2">GIPHY API Key missing.</Typography>
                                    <Typography variant="caption">Please add REACT_APP_GIPHY_API_KEY to .env</Typography>
                                </Box>
                            ) : (
                                <ImageList cols={2} gap={8} variant="masonry">
                                    {gifs.map((gif) => (
                                        <ImageListItem
                                            key={gif.id}
                                            onClick={() => onSelect({ type: 'gif', content: gif.images.original.url })}
                                            sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden', '&:hover': { opacity: 0.8 } }}
                                        >
                                            <img
                                                src={gif.images.fixed_width_downsampled.url}
                                                alt={gif.title}
                                                loading="lazy"
                                                style={{ borderRadius: 4 }}
                                            />
                                        </ImageListItem>
                                    ))}
                                </ImageList>
                            )}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default EmojiGifPicker;
