import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isConnected: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isConnected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : new Uint8Array(0);

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Background gradient/glow
      const gradient = ctx.createRadialGradient(rect.width/2, rect.height/2, 10, rect.width/2, rect.height/2, rect.width/2);
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.1)'); // Cyan
      gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      if (isConnected && analyser) {
        analyser.getByteFrequencyData(dataArray);
      }

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) / 3;

      ctx.beginPath();
      
      // Draw circular waveform
      const bars = 60; // Number of bars in the circle
      const step = (Math.PI * 2) / bars;

      for (let i = 0; i < bars; i++) {
        // Map frequency data to bar height
        // Use lower frequency bins for more movement
        const value = isConnected ? dataArray[i % (bufferLength/2)] || 0 : 5;
        const barHeight = (value / 255) * 60 + 5; // Base height 5

        const angle = i * step;
        
        // Calculate start and end points for the bar extending outwards
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        // Draw individual bar
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }

      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = isConnected ? '#22d3ee' : '#334155'; // Cyan or Slate
      ctx.stroke();

      // Inner circle pulse
      if (isConnected) {
         // Calculate average volume for pulse effect
         let sum = 0;
         for(let i=0; i<bufferLength; i++) sum += dataArray[i];
         const average = sum / bufferLength;
         
         ctx.beginPath();
         ctx.arc(centerX, centerY, radius - 10 + (average/10), 0, Math.PI * 2);
         ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
         ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isConnected]);

  return (
    <div className="w-full h-64 md:h-80 flex items-center justify-center relative">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full absolute inset-0 z-10"
      />
      {!isConnected && (
         <div className="z-20 text-slate-500 font-mono text-sm animate-pulse">
            Waiting for connection...
         </div>
      )}
    </div>
  );
};
