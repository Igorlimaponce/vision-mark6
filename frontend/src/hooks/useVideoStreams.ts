// Hook para gerenciar múltiplos streams de vídeo
// Facilita o controle de várias câmeras simultaneamente

import { useState, useCallback, useRef, useEffect } from 'react';
import { StreamStatus } from '../components/common/VideoStream';

export interface StreamInfo {
  id: string;
  rtspUrl: string;
  deviceName?: string;
  status: StreamStatus;
  error?: string;
  fps?: number;
  frameCount?: number;
  lastFrameTime?: Date;
}

export interface UseVideoStreamsReturn {
  streams: Map<string, StreamInfo>;
  activeStreams: StreamInfo[];
  startStream: (id: string, rtspUrl: string, deviceName?: string) => void;
  stopStream: (id: string) => void;
  stopAllStreams: () => void;
  getStreamStatus: (id: string) => StreamStatus;
  getStreamError: (id: string) => string | undefined;
  updateStreamInfo: (id: string, updates: Partial<StreamInfo>) => void;
  isStreamActive: (id: string) => boolean;
  getActiveStreamCount: () => number;
}

export const useVideoStreams = (): UseVideoStreamsReturn => {
  const [streams, setStreams] = useState<Map<string, StreamInfo>>(new Map());
  const streamsRef = useRef<Map<string, StreamInfo>>(new Map());

  // Sincronizar ref com state
  useEffect(() => {
    streamsRef.current = streams;
  }, [streams]);

  const updateStreams = useCallback((updater: (prev: Map<string, StreamInfo>) => Map<string, StreamInfo>) => {
    setStreams(prevStreams => {
      const newStreams = updater(new Map(prevStreams));
      streamsRef.current = newStreams;
      return newStreams;
    });
  }, []);

  const startStream = useCallback((id: string, rtspUrl: string, deviceName?: string) => {
    updateStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.set(id, {
        id,
        rtspUrl,
        deviceName,
        status: StreamStatus.STARTING,
        error: undefined,
        fps: 0,
        frameCount: 0,
        lastFrameTime: new Date()
      });
      return newStreams;
    });

    console.log(`Iniciando stream: ${id} (${deviceName || 'Sem nome'})`);
  }, [updateStreams]);

  const stopStream = useCallback((id: string) => {
    updateStreams(prev => {
      const newStreams = new Map(prev);
      const stream = newStreams.get(id);
      if (stream) {
        newStreams.set(id, {
          ...stream,
          status: StreamStatus.STOPPED,
          error: undefined,
          fps: 0,
          frameCount: 0
        });
      }
      return newStreams;
    });

    console.log(`Parando stream: ${id}`);
  }, [updateStreams]);

  const stopAllStreams = useCallback(() => {
    updateStreams(prev => {
      const newStreams = new Map();
      prev.forEach((stream, id) => {
        newStreams.set(id, {
          ...stream,
          status: StreamStatus.STOPPED,
          error: undefined,
          fps: 0,
          frameCount: 0
        });
      });
      return newStreams;
    });

    console.log('Parando todos os streams');
  }, [updateStreams]);

  const updateStreamInfo = useCallback((id: string, updates: Partial<StreamInfo>) => {
    updateStreams(prev => {
      const newStreams = new Map(prev);
      const stream = newStreams.get(id);
      if (stream) {
        newStreams.set(id, {
          ...stream,
          ...updates,
          lastFrameTime: new Date()
        });
      }
      return newStreams;
    });
  }, [updateStreams]);

  const getStreamStatus = useCallback((id: string): StreamStatus => {
    return streamsRef.current.get(id)?.status || StreamStatus.STOPPED;
  }, []);

  const getStreamError = useCallback((id: string): string | undefined => {
    return streamsRef.current.get(id)?.error;
  }, []);

  const isStreamActive = useCallback((id: string): boolean => {
    const status = getStreamStatus(id);
    return status === StreamStatus.RUNNING || status === StreamStatus.STARTING || status === StreamStatus.RECONNECTING;
  }, [getStreamStatus]);

  const getActiveStreamCount = useCallback((): number => {
    let count = 0;
    streamsRef.current.forEach(stream => {
      if (stream.status === StreamStatus.RUNNING || 
          stream.status === StreamStatus.STARTING || 
          stream.status === StreamStatus.RECONNECTING) {
        count++;
      }
    });
    return count;
  }, []);

  const activeStreams = Array.from(streams.values()).filter(stream => 
    stream.status === StreamStatus.RUNNING || 
    stream.status === StreamStatus.STARTING || 
    stream.status === StreamStatus.RECONNECTING
  );

  return {
    streams,
    activeStreams,
    startStream,
    stopStream,
    stopAllStreams,
    getStreamStatus,
    getStreamError,
    updateStreamInfo,
    isStreamActive,
    getActiveStreamCount
  };
};
