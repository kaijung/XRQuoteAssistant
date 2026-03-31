import { useRef, useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import { Transcript, SpeakerType } from '../types';

interface UseLiveAPIOptions {
  onTranscriptUpdate: (transcript: Transcript) => void;
}

export const useLiveAPI = ({ onTranscriptUpdate }: UseLiveAPIOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Management
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Transcription State (Mutable for performance in callbacks)
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');

  // Analyser for Visualization
  const analyserRef = useRef<AnalyserNode | null>(null);

  const disconnect = useCallback(async () => {
    setIsConnected(false);
    setIsConnecting(false);
    
    // Stop all audio sources
    if (sourcesRef.current) {
      for (const source of sourcesRef.current) {
        try {
          source.stop();
        } catch (e) {
          // Ignore errors if already stopped
        }
      }
      sourcesRef.current.clear();
    }

    // Close Audio Contexts
    if (inputAudioContextRef.current) {
      try {
        await inputAudioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      try {
        await outputAudioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      outputAudioContextRef.current = null;
    }

    // Stop Media Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close Session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try {
          session.close();
        } catch(e) {
           console.warn("Error closing session", e);
        }
      }).catch(() => {
        // Ignore errors during closing if session wasn't fully established
      });
      sessionPromiseRef.current = null;
    }
    
    // Reset state
    nextStartTimeRef.current = 0;
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found in environment.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      
      let inputAudioContext: AudioContext;
      let outputAudioContext: AudioContext;

      try {
        inputAudioContext = new InputContextClass({ sampleRate: 16000 });
      } catch (e) {
        console.warn("Could not create AudioContext with sampleRate 16000, falling back to default", e);
        inputAudioContext = new InputContextClass();
      }

      try {
         outputAudioContext = new InputContextClass({ sampleRate: 24000 });
      } catch (e) {
         console.warn("Could not create AudioContext with sampleRate 24000, falling back to default", e);
         outputAudioContext = new InputContextClass();
      }

      // Explicitly resume contexts to ensure they are active (browsers often suspend them)
      if (inputAudioContext.state === 'suspended') {
        await inputAudioContext.resume();
      }
      if (outputAudioContext.state === 'suspended') {
        await outputAudioContext.resume();
      }

      inputAudioContextRef.current = inputAudioContext;
      outputAudioContextRef.current = outputAudioContext;

      // Setup Visualizer Analyser
      const analyser = outputAudioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const outputNode = outputAudioContext.createGain();
      outputNode.connect(analyser); // Connect to analyser
      analyser.connect(outputAudioContext.destination); // Connect analyser to destination
      outputNodeRef.current = outputNode;

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Session
      // Use Modality.AUDIO
      const config = {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        inputAudioTranscription: {}, 
        outputAudioTranscription: {}, 
      };

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: config,
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setIsConnected(true);
            setIsConnecting(false);

            // Setup Input Stream Processing
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              // Pass the actual sample rate from the context to ensure MIME type matches data
              const pcmBlob = createBlob(inputData, inputAudioContext.sampleRate);
              
              // Send audio chunk to session
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(e => {
                  console.error("Failed to send audio", e);
              });
            };

            source.connect(scriptProcessor);
            // Connect to a silent gain node instead of destination to prevent audio feedback
            const silence = inputAudioContext.createGain();
            silence.gain.value = 0;
            scriptProcessor.connect(silence);
            silence.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text) currentOutputTranscriptionRef.current += text;
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) currentInputTranscriptionRef.current += text;
            }

            if (message.serverContent?.turnComplete) {
              const userInput = currentInputTranscriptionRef.current;
              const modelOutput = currentOutputTranscriptionRef.current;

              if (userInput.trim()) {
                onTranscriptUpdate({
                  id: `user-${Date.now()}`,
                  speaker: SpeakerType.USER,
                  text: userInput,
                  timestamp: new Date()
                });
              }
              if (modelOutput.trim()) {
                onTranscriptUpdate({
                  id: `model-${Date.now()}`,
                  speaker: SpeakerType.MODEL,
                  text: modelOutput,
                  timestamp: new Date()
                });
              }

              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
               // Ensure nextStartTime is at least current time to avoid playing in the past
               nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContext.currentTime
              );

              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContext,
                24000,
                1
              );

              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              console.log('Interrupted');
              sourcesRef.current.forEach(source => {
                try {
                  source.stop();
                } catch(e) {} // ignore if already stopped
                sourcesRef.current.delete(source);
              });
              nextStartTimeRef.current = 0;
              currentOutputTranscriptionRef.current = ''; // Clear partial output
            }
          },
          onclose: () => {
            console.log('Session closed');
            setIsConnected(false);
            setIsConnecting(false);
          },
          onerror: (err) => {
            console.error('Session error', err);
            setError(err instanceof Error ? err.message : 'Session Error detected');
            setIsConnected(false);
            setIsConnecting(false);
          }
        }
      });

      // Catch initial connection errors (e.g. 4xx/5xx from handshake)
      sessionPromise.catch(err => {
         console.error("Connection handshake failed", err);
         setError(err.message || "Connection failed");
         setIsConnecting(false);
         setIsConnected(false);
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error("Connection failed", err);
      setError("Failed to connect to XR Assistant. Please check your microphone permissions and API Key.");
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [isConnecting, isConnected, onTranscriptUpdate]);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error,
    analyser: analyserRef.current
  };
};