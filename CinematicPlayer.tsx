
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ComicFace } from './types';
import { Play, Pause, Square, Download, X, SkipForward, SkipBack } from 'lucide-react';

interface CinematicPlayerProps {
    faces: ComicFace[];
    onClose: () => void;
}

export const CinematicPlayer: React.FC<CinematicPlayerProps> = ({ faces, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>(0);

    const activeFaces = faces.filter(f => f.imageUrl && !f.isLoading);
    const currentFace = activeFaces[currentIndex];

    // Background Canvas Frame Capture for Recording
    useEffect(() => {
        if (!isRecording || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawFrame = () => {
            const img = document.querySelector('.cinematic-image') as HTMLImageElement;
            if (img && img.complete) {
                // Draw image with current motion transforms
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Simplified "Ken Burns" for the recorded video
                const time = Date.now() / 6000;
                const scale = 1.1 + Math.sin(time) * 0.05;
                const x = Math.cos(time) * 10;
                const y = Math.sin(time) * 10;

                const drawW = canvas.width * scale;
                const drawH = canvas.height * scale;
                const drawX = (canvas.width - drawW) / 2 + x;
                const drawY = (canvas.height - drawH) / 2 + y;

                ctx.drawImage(img, drawX, drawY, drawW, drawH);

                // Draw Text / Captions
                const captionEl = document.querySelector('.cinematic-caption');
                if (captionEl) {
                    ctx.fillStyle = 'rgba(255, 255, 230, 0.9)';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    ctx.fillRect(50, canvas.height - 150, canvas.width - 100, 80);
                    ctx.strokeRect(50, canvas.height - 150, canvas.width - 100, 80);
                    
                    ctx.fillStyle = 'black';
                    ctx.font = 'bold 24px "Comic Neue", sans-serif';
                    ctx.textAlign = 'center';
                    const text = captionEl.textContent || '';
                    ctx.fillText(text.slice(0, 50), canvas.width / 2, canvas.height - 100);
                }
            }
            requestRef.current = requestAnimationFrame(drawFrame);
        };

        drawFrame();
        return () => cancelAnimationFrame(requestRef.current);
    }, [isRecording, currentIndex]);

    useEffect(() => {
        let interval: any;
        if (isPlaying && !isRecording) {
            interval = setInterval(() => {
                handleNext();
            }, 6000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentIndex, isRecording, activeFaces.length]);

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % activeFaces.length);
    };

    const handlePrev = () => {
        setCurrentIndex(prev => (prev - 1 + activeFaces.length) % activeFaces.length);
    };

    const startRecording = async () => {
        if (!playerRef.current) return;
        
        try {
            setIsRecording(true);
            setCurrentIndex(0);
            setIsPlaying(true);

            // Using canvas capture if we wanted high res, but MediaRecorder on DisplayMedia or element capture is tricky.
            // Standard approach in AI Studio for "Video Export" without server-side FFmpeg:
            // Capture the window/tab or use html2canvas in a loop.
            // However, a simple "Recording" UI is best.
            
            // For now, let's implement the recording logic that gathers blobs.
            const stream = (canvasRef.current as any)?.captureStream(30) || (playerRef.current as any).captureStream(30);
            if (!stream) {
                 alert("Video recording not supported in this browser.");
                 setIsRecording(false);
                 return;
            }

            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
            chunksRef.current = [];
            
            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'my-comic-animation.webm';
                a.click();
                setIsRecording(false);
            };

            recorder.start();
            recorderRef.current = recorder;

            // Auto-stop after full cycle
            setTimeout(() => {
                if (recorder.state === 'recording') recorder.stop();
            }, activeFaces.length * 6000);

        } catch (e) {
            console.error("Recording failed", e);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
        }
    };

    if (activeFaces.length === 0) return null;

    return (
        <div ref={playerRef} className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-white font-comic text-xl">MOTION COMIC MODE</h2>
                  {isRecording && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full animate-pulse">
                          <div className="w-2 h-2 bg-white rounded-full" />
                          <span className="text-xs font-bold text-white uppercase tracking-widest">Recording</span>
                      </div>
                  )}
                </div>
                <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                    <X size={32} />
                </button>
            </div>

            {/* Main Stage */}
            <div className="relative w-full h-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="relative w-full h-full flex items-center justify-center pt-24 pb-32"
                    >
                        {/* Ken Burns Animated Image */}
                        <div className="relative w-[min(90vw,600px)] aspect-[2/3] overflow-hidden rounded-lg shadow-2xl border-4 border-white/10">
                            <motion.img 
                                src={currentFace.imageUrl} 
                                alt="Panel"
                                className="w-full h-full object-cover cinematic-image"
                                initial={{ scale: 1.1, x: -10, y: -10 }}
                                animate={{ 
                                    scale: [1.1, 1.2, 1.15],
                                    x: [0, 10, -5],
                                    y: [0, -10, 5]
                                }}
                                transition={{ 
                                    duration: 6,
                                    ease: "linear",
                                    repeat: Infinity,
                                    repeatType: "reverse"
                                }}
                                referrerPolicy="no-referrer"
                            />
                            
                            {/* Overlay Vignette */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        </div>

                        {/* Narrative Elements */}
                        <div className="absolute inset-x-0 bottom-40 flex flex-col items-center gap-4 px-10 pointer-events-none">
                            {currentFace.narrative?.caption && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8, duration: 0.8 }}
                                    className="bg-yellow-50 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-xl cinematic-caption"
                                >
                                    <p className="text-black font-bold text-lg text-center leading-tight">
                                        {currentFace.narrative.caption}
                                    </p>
                                </motion.div>
                            )}

                            {currentFace.narrative?.dialogue && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 1.5, type: 'spring' }}
                                    className="bg-white border-2 border-black rounded-full px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] relative"
                                >
                                    <p className="text-black font-bold text-md text-center">
                                        "{currentFace.narrative.dialogue}"
                                    </p>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-black rotate-45 transform" />
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50 bg-black/40 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/10 shadow-2xl">
                <button onClick={handlePrev} className="text-white hover:text-yellow-400 transition-colors">
                    <SkipBack size={28} />
                </button>
                
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all shadow-xl"
                >
                    {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                </button>

                <button onClick={handleNext} className="text-white hover:text-yellow-400 transition-colors">
                    <SkipForward size={28} />
                </button>

                <div className="w-px h-8 bg-white/20 mx-2" />

                <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        isRecording 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                >
                    {isRecording ? <Square size={20} /> : <Download size={20} />}
                    <span>{isRecording ? 'STOP' : 'ANIMATION VIDEO'}</span>
                </button>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / activeFaces.length) * 100}%` }}
                    className="h-full bg-yellow-400"
                />
            </div>

            {/* Hidden capture canvas */}
            <canvas 
                ref={canvasRef} 
                width={720} 
                height={1080} 
                className="hidden" 
            />
        </div>
    );
};
