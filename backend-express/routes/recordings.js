// routes/recordings.js - Recording management API
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const videoCallService = require('../services/videoCallService');
const recordingService = require('../services/recordingService');

/**
 * GET /api/recordings
 * Get all recordings with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      participantName: req.query.participantName,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };

    const recordings = await videoCallService.getRecordings(filters);

    res.json({
      success: true,
      count: recordings.length,
      recordings
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recordings'
    });
  }
});

/**
 * GET /api/recordings/stats
 * Get recording storage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await recordingService.getStorageStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching recording stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/recordings/download/:fileName
 * Download a specific recording
 */
router.get('/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const recording = await recordingService.getRecording(fileName);

    if (!recording.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'video/webm');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', recording.fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(recording.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download recording'
    });
  }
});

/**
 * GET /api/recordings/stream/:fileName
 * Stream a recording (for playback in browser)
 */
router.get('/stream/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const recording = await recordingService.getRecording(fileName);

    if (!recording.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found'
      });
    }

    // Get file stats
    const stats = fs.statSync(recording.filePath);
    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const fileStream = fs.createReadStream(recording.filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/webm'
      });

      fileStream.pipe(res);
    } else {
      // No range, send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/webm'
      });

      fs.createReadStream(recording.filePath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream recording'
    });
  }
});

/**
 * POST /api/recordings/upload/:callId
 * Upload recording from client (browser recording)
 */
router.post('/upload/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    // Get call data
    const callQuery = await videoCallService.pool.query(
      'SELECT * FROM video_calls WHERE call_id = $1',
      [callId]
    );

    if (callQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    const call = callQuery.rows[0];

    // Generate filename
    const fileName = recordingService.generateFileName(
      call.participant_name,
      call.started_at
    );

    const filePath = path.join(recordingService.recordingsDir, fileName);

    // Save uploaded file
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(filePath, buffer);

      // Save to database
      const recordingData = {
        filePath,
        fileName,
        fileSize: buffer.length,
        duration: call.duration_seconds || 0
      };

      await videoCallService.saveRecording(callId, recordingData);

      res.json({
        success: true,
        fileName,
        fileSize: buffer.length
      });
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload recording'
    });
  }
});

/**
 * DELETE /api/recordings/:fileName
 * Delete a recording
 */
router.delete('/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(recordingService.recordingsDir, fileName);

    // Delete file
    fs.unlinkSync(filePath);

    // Update database
    await videoCallService.pool.query(
      `UPDATE video_calls
       SET recording_status = 'deleted', recording_file_path = NULL
       WHERE recording_file_name = $1`,
      [fileName]
    );

    res.json({
      success: true,
      message: 'Recording deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recording'
    });
  }
});

module.exports = router;
