/**
 * Camera Component
 * Captures live photos using device camera
 */

import { useState, useRef, useEffect } from 'react';

const Camera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please grant camera permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Stop camera and return image
    stopCamera();
    onCapture(imageData);
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>{error}</p>
          <button onClick={onClose} style={styles.button}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.cameraBox}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={styles.video}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div style={styles.controls}>
          <button onClick={capturePhoto} style={styles.captureButton}>
            📷 Capture Photo
          </button>
          <button onClick={() => { stopCamera(); onClose(); }} style={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  },
  cameraBox: {
    maxWidth: '600px',
    width: '100%',
    backgroundColor: '#000',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  video: {
    width: '100%',
    height: 'auto',
    display: 'block'
  },
  controls: {
    padding: '20px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  },
  captureButton: {
    padding: '12px 30px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  cancelButton: {
    padding: '12px 30px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  error: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    textAlign: 'center'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '15px'
  }
};

export default Camera;
