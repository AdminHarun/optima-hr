// Voice Recorder Component - WhatsApp/Telegram style
// Allows recording, playback, and sending voice messages
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Slider,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Mic,
  Stop,
  Delete,
  Send,
  PlayArrow,
  Pause
} from '@mui/icons-material';

/**
 * Voice Recorder Component
 * Features:
 * - Real-time recording with waveform animation
 * - Recording timer
 * - Playback before sending
 * - Delete and send options
 * - WhatsApp/Telegram UI pattern
 */
const VoiceRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioElementRef = useRef(null);
  const streamRef = useRef(null);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Best quality for voice
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);

        // Create audio element for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
        };
        audioElementRef.current = audio;

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini kontrol edin.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Play/pause audio
  const togglePlayback = () => {
    if (!audioElementRef.current) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);

      // Update playback time
      const interval = setInterval(() => {
        if (audioElementRef.current) {
          setPlaybackTime(audioElementRef.current.currentTime);

          if (audioElementRef.current.ended) {
            setIsPlaying(false);
            setPlaybackTime(0);
            clearInterval(interval);
          }
        }
      }, 100);
    }
  };

  // Delete recording
  const handleDelete = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      URL.revokeObjectURL(audioElementRef.current.src);
    }
    setAudioBlob(null);
    setRecordingTime(0);
    setPlaybackTime(0);
    setDuration(0);
    setIsPlaying(false);
    audioChunksRef.current = [];
    onCancel();
  };

  // Send voice message
  const handleSend = () => {
    if (audioBlob) {
      // Convert blob to file
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      onSend(file, duration);
      handleDelete();
    }
  };

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();

    return () => {
      // Cleanup on unmount
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        URL.revokeObjectURL(audioElementRef.current.src);
      }
    };
  }, []);

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        p: 2,
        background: 'linear-gradient(180deg, #ffffff 0%, rgba(250, 251, 252, 0.98) 100%)',
        borderTop: '2px solid rgba(90, 159, 212, 0.2)',
        zIndex: 100
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Delete Button */}
        <IconButton
          onClick={handleDelete}
          sx={{
            color: '#fc8181',
            backgroundColor: 'rgba(252, 129, 129, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(252, 129, 129, 0.2)'
            }
          }}
        >
          <Delete />
        </IconButton>

        {/* Recording/Playback UI */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Recording Animation or Playback Button */}
          {isRecording ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      opacity: 1,
                      transform: 'scale(1)'
                    },
                    '50%': {
                      opacity: 0.5,
                      transform: 'scale(1.1)'
                    }
                  }
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Kaydediliyor...
              </Typography>
            </Box>
          ) : (
            <IconButton
              onClick={togglePlayback}
              disabled={!audioBlob}
              sx={{
                color: '#5a9fd4',
                backgroundColor: 'rgba(90, 159, 212, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(90, 159, 212, 0.2)'
                }
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          )}

          {/* Waveform Animation / Progress Bar */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            {isRecording ? (
              // Recording waveform animation
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  height: 32,
                  px: 1
                }}
              >
                {[...Array(20)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      flex: 1,
                      height: `${Math.random() * 100}%`,
                      minHeight: '20%',
                      backgroundColor: '#5a9fd4',
                      borderRadius: '2px',
                      animation: `wave 1s ease-in-out infinite`,
                      animationDelay: `${i * 0.05}s`,
                      '@keyframes wave': {
                        '0%, 100%': {
                          transform: 'scaleY(0.5)'
                        },
                        '50%': {
                          transform: 'scaleY(1)'
                        }
                      }
                    }}
                  />
                ))}
              </Box>
            ) : (
              // Playback progress bar
              <Box sx={{ width: '100%', px: 1 }}>
                <Slider
                  value={playbackTime}
                  max={duration || 1}
                  onChange={(e, newValue) => {
                    if (audioElementRef.current) {
                      audioElementRef.current.currentTime = newValue;
                      setPlaybackTime(newValue);
                    }
                  }}
                  sx={{
                    color: '#5a9fd4',
                    height: 4,
                    '& .MuiSlider-thumb': {
                      width: 12,
                      height: 12
                    }
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Timer */}
          <Typography
            variant="body2"
            sx={{
              color: '#718096',
              fontWeight: 500,
              fontSize: '13px',
              minWidth: 45
            }}
          >
            {formatTime(isRecording ? recordingTime : playbackTime)}
          </Typography>
        </Box>

        {/* Stop/Send Button */}
        {isRecording ? (
          <IconButton
            onClick={stopRecording}
            sx={{
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.2)'
              }
            }}
          >
            <Stop />
          </IconButton>
        ) : (
          <IconButton
            onClick={handleSend}
            disabled={!audioBlob}
            sx={{
              color: '#ffffff',
              backgroundColor: '#5a9fd4',
              '&:hover': {
                backgroundColor: '#4a8fc4'
              },
              '&:disabled': {
                backgroundColor: '#cbd5e0',
                color: '#a0aec0'
              }
            }}
          >
            <Send />
          </IconButton>
        )}
      </Box>
    </Paper>
  );
};

export default VoiceRecorder;
