import { useState, useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2 } from 'lucide-react';

interface VoiceAssistantProps {
  projectId: string;
}

export function VoiceAssistant({ projectId }: VoiceAssistantProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [disconnectReason, setDisconnectReason] = useState<string>('');
  const endingSessionRef = useRef(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[VoiceAssistant] Connected at', new Date().toISOString());
      endingSessionRef.current = false;
      toast.success('Conectado al asistente de voz');
    },
    onDisconnect: (reason?: any) => {
      console.log('[VoiceAssistant] Disconnected at', new Date().toISOString(), 'reason:', reason);
      setDisconnectReason(reason ? JSON.stringify(reason) : 'unknown');
      if (!endingSessionRef.current) {
        toast.info('Desconectado del asistente');
      }
    },
    onMessage: (message: any) => {
      console.log('[VoiceAssistant] Message:', message.type, message);
      if (message.type === 'user_transcript' && message.user_transcription_event?.user_transcript) {
        setTranscript(prev => [...prev, `Tú: ${message.user_transcription_event.user_transcript}`]);
      } else if (message.type === 'agent_response' && message.agent_response_event?.agent_response) {
        setTranscript(prev => [...prev, `Asistente: ${message.agent_response_event.agent_response}`]);
      }
    },
    onError: (error: any) => {
      console.error('[VoiceAssistant] Error:', error);
      toast.error('Error en la conversación');
    },
  });

  // Keep a stable ref to conversation for cleanup
  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[VoiceAssistant] Microphone granted, tracks:', stream.getAudioTracks().length);

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token');

      if (error) {
        console.error('[VoiceAssistant] Token error:', error);
        throw new Error('No se pudo obtener el token de conversación');
      }

      if (!data?.token) {
        throw new Error('No se recibió token');
      }

      console.log('[VoiceAssistant] Starting session with token');

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
      });

      setTranscript([]);
      setDisconnectReason('');
    } catch (error: any) {
      console.error('[VoiceAssistant] Failed to start:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Permiso de micrófono denegado. Habilita el acceso al micrófono.');
      } else {
        toast.error(error.message || 'Error al iniciar la conversación');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    endingSessionRef.current = true;
    await conversation.endSession();
    toast.info('Conversación terminada');
  }, [conversation]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current?.status === 'connected') {
        conversationRef.current.endSession();
      }
    };
  }, []);

  const isConnected = conversation.status === 'connected';

  return (
    <Card className="glass-strong">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-6">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-muted'}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {/* Voice visualization */}
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isConnected 
              ? conversation.isSpeaking 
                ? 'gradient-primary glow scale-110' 
                : 'bg-primary/20 border-2 border-primary/50'
              : 'bg-muted/50 border-2 border-border'
          }`}>
            {isConnecting ? (
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            ) : isConnected ? (
              conversation.isSpeaking ? (
                <Volume2 className="w-12 h-12 text-primary-foreground animate-pulse" />
              ) : (
                <Mic className="w-12 h-12 text-primary" />
              )
            ) : (
              <MicOff className="w-12 h-12 text-muted-foreground" />
            )}
            
            {/* Speaking animation rings */}
            {isConnected && conversation.isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDelay: '0.2s' }} />
              </>
            )}
          </div>

          {/* Status text */}
          <p className="text-center text-sm text-muted-foreground">
            {isConnecting 
              ? 'Conectando...' 
              : isConnected 
                ? conversation.isSpeaking 
                  ? 'El asistente está hablando...'
                  : 'Escuchando...'
                : 'Haz clic en el botón para iniciar'}
          </p>

          {/* Disconnect reason for debugging */}
          {disconnectReason && !isConnected && (
            <p className="text-xs text-muted-foreground/60">
              Última desconexión: {disconnectReason}
            </p>
          )}

          {/* Control button */}
          {!isConnected ? (
            <Button
              onClick={startConversation}
              disabled={isConnecting}
              size="lg"
              className="gradient-primary glow hover:scale-105 transition-transform"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-5 w-5" />
                  Iniciar conversación
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopConversation}
              variant="destructive"
              size="lg"
              className="hover:scale-105 transition-transform"
            >
              <PhoneOff className="mr-2 h-5 w-5" />
              Terminar conversación
            </Button>
          )}

          {/* Transcript */}
          {transcript.length > 0 && (
            <div className="w-full mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Transcripción</h4>
              <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {transcript.map((line, index) => (
                  <p 
                    key={index} 
                    className={`text-sm ${line.startsWith('Tú:') ? 'text-primary' : 'text-foreground'}`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
