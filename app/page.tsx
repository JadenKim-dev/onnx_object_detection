'use client';

import { useRef, useState } from 'react';
import { VideoCapture } from './components/VideoCapture';
import { CanvasOverlay } from './components/CanvasOverlay';
import { VideoCaptureRef, VideoError } from './types/video';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const videoCaptureRef = useRef<VideoCaptureRef>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoInfo, setVideoInfo] = useState<string>('Waiting for camera...');
  const [isVideoReady, setIsVideoReady] = useState(false);

  const handleVideoReady = (video: HTMLVideoElement) => {
    videoRef.current = video;
    setIsVideoReady(true);
    setVideoInfo(`Camera ready: ${video.videoWidth}x${video.videoHeight}`);
    console.log('Video ready:', video.videoWidth, video.videoHeight);
  };

  const handleError = (error: VideoError) => {
    setVideoInfo(`Error: ${error.message}`);
    console.error('Camera error:', error);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Task 4: Webcam Capture Test</CardTitle>
            <p className="text-sm text-muted-foreground">{videoInfo}</p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <VideoCapture
                ref={videoCaptureRef}
                onVideoReady={handleVideoReady}
                onError={handleError}
                autoStart={true}
                className="w-full max-w-4xl mx-auto"
              />
              {isVideoReady && (
                <CanvasOverlay videoRef={videoRef} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
