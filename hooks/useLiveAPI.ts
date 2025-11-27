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
  const inputNodeRef = useRef<GainNode | null>(null);
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
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      await outputAudioContextRef.current.close();
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
        session.close();
      });
      sessionPromiseRef.current = null;
    }

    setIsConnecting(false);
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
      const inputAudioContext = new InputContextClass({ sampleRate: 16000 });
      const outputAudioContext = new InputContextClass({ sampleRate: 24000 });

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
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
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
              const pcmBlob = createBlob(inputData);
              
              // Send audio chunk to session
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
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
                source.stop();
                sourcesRef.current.delete(source);
              });
              nextStartTimeRef.current = 0;
              currentOutputTranscriptionRef.current = ''; // Clear partial output
            }
          },
          onclose: () => {
            console.log('Session closed');
            disconnect();
          },
          onerror: (err) => {
            console.error('Session error', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            disconnect();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error("Connection failed", err);
      setError("Failed to connect to XR Assistant. Please check your microphone permissions and API Key.");
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [disconnect, isConnecting, isConnected, onTranscriptUpdate]);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error,
    analyser: analyserRef.current
  };
};
