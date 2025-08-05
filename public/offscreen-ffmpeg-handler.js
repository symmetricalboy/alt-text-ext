// public/offscreen-ffmpeg-handler.js
console.log('[Offscreen] Handler script loaded.');

const runtimeAPI = typeof browser !== 'undefined' ? browser : chrome;

let ffmpegInstance = null;
let FFMPEG_LOADED = false;
let loadInProgress = false;
let loadPromise = null;

// === IndexedDB Helper Functions ===
const DB_NAME = 'MediaProcessingDB';
const STORE_NAME = 'PendingFiles';
const DB_VERSION = 1;

async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => {
            console.error('[Offscreen] IndexedDB error:', request.error);
            reject(new Error('Error opening IndexedDB: ' + request.error?.name));
        };
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function getFileFromIndexedDB(key) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onerror = () => {
            console.error('[Offscreen] IndexedDB get error:', request.error);
            reject(new Error('Error retrieving file: ' + request.error?.name));
        };
        request.onsuccess = () => resolve(request.result || null);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
            console.error('[Offscreen] IndexedDB get transaction error:', transaction.error);
            reject(new Error('Get transaction error: ' + transaction.error?.name));
        };
    });
}

// === Simplified FFmpeg Management (Based on Web Client) ===
async function loadFFmpeg() {
    if (FFMPEG_LOADED && ffmpegInstance) {
        console.log('[Offscreen] FFmpeg is already loaded.');
        return { ffmpeg: ffmpegInstance, fetchFile: FFmpeg.fetchFile };
    }
    
    if (loadInProgress) {
        console.log('[Offscreen] FFmpeg load already in progress, awaiting completion...');
        return loadPromise;
    }

    loadInProgress = true;
    loadPromise = new Promise(async (resolve, reject) => {
        try {
            console.log('[Offscreen] ⚙️ Loading FFmpeg...');
            
            // Check if FFmpeg is available
            if (typeof FFmpeg === 'undefined') {
                throw new Error('FFmpeg library not loaded. Please refresh the page and try again.');
            }
            
            const { createFFmpeg, fetchFile } = FFmpeg;
            
            console.log('[Offscreen] ⚙️ Creating FFmpeg instance...');
            ffmpegInstance = createFFmpeg({
                corePath: `${runtimeAPI.runtime.getURL('assets/ffmpeg/ffmpeg-core.js')}`,
                log: true,
                logger: ({ type, message }) => {
                    if (type === 'fferr') {
                        console.log(`[Offscreen FFmpeg]: ${message}`);
                    }
                },
                progress: (progress) => {
                    const percent = Math.round(progress.ratio * 100);
                    if (percent < 100) {
                        console.log(`[Offscreen] FFmpeg progress: ${percent}%`);
                        // Send progress update to background
                        runtimeAPI.runtime.sendMessage({
                            type: 'ffmpegProgress',
                            payload: { percent, message: `Compressing video... ${percent}%` }
                        }).catch(e => console.warn('[Offscreen] Error sending progress:', e.message));
                    }
                },
            });
            
            console.log('[Offscreen] ⚙️ Loading FFmpeg core...');
            
            // Add a timeout to prevent indefinite hanging
            const loadPromise = ffmpegInstance.load();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('FFmpeg loading timed out after 30 seconds. Please refresh the page and try again.'));
                }, 30000);
            });
            
            await Promise.race([loadPromise, timeoutPromise]);
            FFMPEG_LOADED = true;
            console.log('[Offscreen] ✅ FFmpeg loaded successfully!');
            
            resolve({ ffmpeg: ffmpegInstance, fetchFile });
        } catch (error) {
            console.error(`[Offscreen] ❌ Error loading FFmpeg: ${error.message}`);
            console.error('[Offscreen] 💡 Try refreshing the page if the problem persists');
            FFMPEG_LOADED = false;
            ffmpegInstance = null;
            reject(error);
        } finally {
            loadInProgress = false;
        }
    });
    
    return loadPromise;
}

// === Simplified Compression Function (Based on Web Client Success) ===
async function handleCompression(fileData) {
    try {
        console.log('[Offscreen] 🔄 Starting compression process');
        
        const { ffmpeg, fetchFile } = await loadFFmpeg();
        console.log('[Offscreen] ✅ FFmpeg loaded, starting compression process');
        
        const { buffer, name, size, type } = fileData;
        const originalSizeMB = (size / 1024 / 1024).toFixed(2);
        console.log(`[Offscreen] 🔄 Starting compression of ${name} (${originalSizeMB}MB)`);
        
        console.log('[Offscreen] Writing file to FFmpeg filesystem...');
        const fileBytes = new Uint8Array(buffer);
        ffmpeg.FS('writeFile', name, fileBytes);
        console.log('[Offscreen] ✅ File written to FFmpeg filesystem');
        
        // Use the same quality settings as the successful web client
        const qualitySettings = {
            codec: 'libx264',
            crf: 23,  // Higher quality starting point
            preset: 'medium',  // Better quality preset
            audioBitrate: '128k',
            movflags: '+faststart',
            vf: []
        };
        
        if (size > 100 * 1024 * 1024) {
            console.log('[Offscreen] 📦 Very large file (>100MB), using moderate compression.');
            qualitySettings.crf = 26;  // Much less aggressive
            qualitySettings.preset = 'fast';
            qualitySettings.vf.push('fps=30');
            qualitySettings.vf.push('scale=min(iw\\,1920):min(ih\\,1080):force_original_aspect_ratio=decrease');
        } else if (size > 50 * 1024 * 1024) {
            console.log('[Offscreen] 📦 Large file (>50MB), using light compression.');
            qualitySettings.crf = 25;  // Lighter compression
            qualitySettings.preset = 'medium';
            qualitySettings.vf.push('scale=min(iw\\,1920):min(ih\\,1080):force_original_aspect_ratio=decrease');
        } else if (size > 20 * 1024 * 1024) {
            console.log('[Offscreen] 📦 Medium file (>20MB), using gentle compression.');
            qualitySettings.crf = 24;
            qualitySettings.preset = 'medium';
        }
        
        qualitySettings.vf.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
        
        const ffmpegArgs = [
            '-i', name,
            '-c:v', qualitySettings.codec,
            '-pix_fmt', 'yuv420p',
            '-crf', qualitySettings.crf.toString(),
            '-preset', qualitySettings.preset,
            '-c:a', 'aac',
            '-b:a', qualitySettings.audioBitrate,
        ];
        
        if (qualitySettings.vf.length > 0) {
            ffmpegArgs.push('-vf', qualitySettings.vf.join(','));
        }
        
        ffmpegArgs.push('-movflags', qualitySettings.movflags, 'output.mp4');
        
        console.log(`[Offscreen] ⚙️ Running FFmpeg command: ${ffmpegArgs.join(' ')}`);
        
        await ffmpeg.run(...ffmpegArgs);
        console.log('[Offscreen] ✅ FFmpeg compression completed');
        
        console.log('[Offscreen] Reading compressed file...');
        const data = ffmpeg.FS('readFile', 'output.mp4');
        const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });
        
        console.log(`[Offscreen] ✅ FFmpeg processing finished. Original: ${originalSizeMB}MB → Compressed: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);
        
        console.log('[Offscreen] Cleaning up temporary files...');
        ffmpeg.FS('unlink', name);
        ffmpeg.FS('unlink', 'output.mp4');
        console.log('[Offscreen] ✅ Temporary files cleaned up');
        
        return {
            blob: compressedBlob,
            originalSize: size,
            compressedSize: compressedBlob.size,
            success: true
        };
    } catch (error) {
        console.error(`[Offscreen] ❌ Compression error: ${error.message}`);
        throw error;
    }
}

// === Message Handling ===
runtimeAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Offscreen] Message received:', message.type);

    if (!message.target || message.target !== 'offscreen-ffmpeg') {
        return;
    }

    if (message.type === 'loadFFmpegOffscreen') {
        console.log('[Offscreen] Processing loadFFmpegOffscreen message...');
        
        if (typeof WebAssembly === 'undefined') {
            const errorMsg = 'WebAssembly is not supported in this browser';
            console.error('[Offscreen]', errorMsg);
            return;
        }
        
        loadFFmpeg()
            .then(() => {
                console.log('[Offscreen] FFmpeg instance loaded successfully.');
                runtimeAPI.runtime.sendMessage({ 
                    type: 'ffmpegStatusOffscreen', 
                    payload: { status: 'FFmpeg loaded and ready in offscreen document.', progress: 'complete' }
                }).catch(e => console.warn('[Offscreen] Error sending status message:', e.message));
            })
            .catch((error) => {
                console.error('[Offscreen] FFmpeg load failed:', error);
                runtimeAPI.runtime.sendMessage({ 
                    type: 'ffmpegStatusOffscreen', 
                    payload: { status: `FFmpeg load failed: ${error.message}`, error: error.message, progress: 'error' }
                }).catch(e => console.warn('[Offscreen] Error sending error message:', e.message));
            });
        return;
    }
    
    if (message.type === 'compressVideo') {
        console.log('[Offscreen] Processing compressVideo message...');
        
        const payload = message.payload;
        if (!payload) {
            console.error('[Offscreen] No payload in compressVideo message');
            return;
        }
        
        const { operationId, indexedDbKey, fileName, mimeType, compressionSettings, fileSize } = payload;
        
        console.log(`[Offscreen] Compression request - File: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(1)}MB)`);
        
        // Handle the compression asynchronously
        (async () => {
            try {
                // Get file from IndexedDB
                console.log('[Offscreen] Retrieving file from IndexedDB...');
                const file = await getFileFromIndexedDB(indexedDbKey);
                
                if (!file) {
                    throw new Error('File not found in IndexedDB');
                }
                
                console.log('[Offscreen] File retrieved from IndexedDB, starting compression...');
                
                // Convert file to array buffer
                const arrayBuffer = await file.arrayBuffer();
                
                // Prepare file data for compression
                const fileData = {
                    buffer: arrayBuffer,
                    name: fileName,
                    size: file.size,
                    type: mimeType
                };
                
                // Perform compression using the web client's successful approach
                const result = await handleCompression(fileData);
                
                // Convert blob to array buffer for message passing
                const compressedArrayBuffer = await result.blob.arrayBuffer();
                
                // Send success response
                runtimeAPI.runtime.sendMessage({
                    target: 'background',
                    type: 'compressionComplete',
                    payload: {
                        operationId,
                        success: true,
                        data: compressedArrayBuffer,
                        originalSize: result.originalSize,
                        compressedSize: result.compressedSize,
                        compressionRatio: ((result.originalSize - result.compressedSize) / result.originalSize) * 100,
                        codec: 'libx264',
                        quality: 'adaptive'
                    }
                }).catch(e => console.warn('[Offscreen] Error sending compression result:', e.message));
                
                console.log('[Offscreen] Compression completed successfully');
                
            } catch (error) {
                console.error('[Offscreen] Compression failed:', error);
                
                // Send error response
                runtimeAPI.runtime.sendMessage({
                    target: 'background',
                    type: 'compressionComplete', 
                    payload: {
                        operationId,
                        success: false,
                        error: error.message
                    }
                }).catch(e => console.warn('[Offscreen] Error sending compression error:', e.message));
            }
        })();
        
        return;
    }
    
    // Handle other FFmpeg operations
    if (message.type === 'runFFmpeg') {
        const { operationName, command, input, outputFileName } = message.payload;
        console.log(`[Offscreen] Running FFmpeg operation: ${operationName}`);
        
        (async () => {
            try {
                const { ffmpeg, fetchFile } = await loadFFmpeg();
                
                // Handle input file
                if (input && input.srcUrl) {
                    console.log(`[Offscreen] Fetching input from: ${input.srcUrl}`);
                    const response = await fetch(input.srcUrl);
                    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
                    const blob = await response.blob();
                    ffmpeg.FS('writeFile', input.fileName, await fetchFile(blob));
                }
                
                // Run FFmpeg command
                if (Array.isArray(command)) {
                    await ffmpeg.run(...command);
                } else {
                    await ffmpeg.run(command);
                }
                
                // Read output
                let result;
                if (operationName === 'getDuration') {
                    // For duration operations, parse the logs
                    result = { success: true, duration: 0 }; // Simplified for now
                } else {
                    const data = ffmpeg.FS('readFile', outputFileName);
                    result = {
                        success: true,
                        fileName: outputFileName,
                        data: data.buffer
                    };
                    
                    // Clean up
                    ffmpeg.FS('unlink', outputFileName);
                }
                
                if (input && input.fileName) {
                    ffmpeg.FS('unlink', input.fileName);
                }
                
                // Send result
                runtimeAPI.runtime.sendMessage({
                    target: 'background',
                    type: 'ffmpegResult',
                    payload: result
                }).catch(e => console.warn('[Offscreen] Error sending FFmpeg result:', e.message));
                
            } catch (error) {
                console.error(`[Offscreen] FFmpeg operation failed:`, error);
                runtimeAPI.runtime.sendMessage({
                    target: 'background',
                    type: 'ffmpegResult',
                    payload: {
                        success: false,
                        error: error.message
                    }
                }).catch(e => console.warn('[Offscreen] Error sending FFmpeg error:', e.message));
            }
        })();
        
        return;
    }
});

console.log('[Offscreen] Message listeners set up. Ready to handle FFmpeg operations.'); 