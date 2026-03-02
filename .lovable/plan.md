

## Plan para diagnosticar y solucionar el problema

### Paso 1: Agregar logging detallado para diagnóstico
- Añadir más logs en el componente `VoiceAssistant` para capturar:
  - El momento exacto de conexión/desconexión
  - Cualquier error específico del SDK de ElevenLabs
  - El estado de `conversation.status` en diferentes momentos

### Paso 2: Manejar mejor el ciclo de vida del hook
- Usar `useRef` para mantener la referencia de `conversation` estable
- Evitar que re-renders del componente causen desconexiones no deseadas
- Agregar un flag para evitar múltiples llamadas a `endSession()`

### Paso 3: Mejorar el manejo de la conexión WebRTC
- Verificar que la pista de audio del micrófono se está enviando correctamente
- Añadir listeners para eventos de conexión/desconexión de WebRTC

### Paso 4: Implementar reconexión automática (opcional)
- Si la desconexión es por timeout del lado de ElevenLabs, implementar lógica de reconexión

### Cambios específicos en el código:

```typescript
// En VoiceAssistant.tsx
// 1. Añadir estado para rastrear razón de desconexión
const [disconnectReason, setDisconnectReason] = useState<string>('');

// 2. Mejorar los callbacks con más información
onDisconnect: (reason?: any) => {
  console.log('Disconnected from ElevenLabs agent:', reason);
  setDisconnectReason(JSON.stringify(reason));
  toast.info('Desconectado del asistente');
},

// 3. Usar useRef para evitar problemas de ciclo de vida
const conversationRef = useRef(conversation);
useEffect(() => {
  conversationRef.current = conversation;
}, [conversation]);

// 4. Cleanup más seguro
useEffect(() => {
  return () => {
    // Solo terminar si realmente está conectado
    if (conversationRef.current?.status === 'connected') {
      conversationRef.current.endSession();
    }
  };
}, []); // Array vacío - solo se ejecuta al desmontar
```

