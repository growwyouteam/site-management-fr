import React, { useRef, useState, useEffect } from 'react';

const CameraModal = ({ onCapture, onClose }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        startCamera();
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setError('Unable to access camera. Please check permissions.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onCapture(file);
                }
            }, 'image/jpeg', 0.8);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg overflow-hidden w-full max-w-lg">
                <div className="p-4 bg-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Take Photo</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 font-bold text-xl">&times;</button>
                </div>

                <div className="relative bg-black h-64 md:h-80 flex items-center justify-center">
                    {error ? (
                        <div className="text-white text-center p-4">
                            <p className="mb-2">⚠️ {error}</p>
                            <button onClick={startCamera} className="text-blue-300 underline">Retry</button>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    )}
                </div>

                <div className="p-4 flex justify-center gap-4 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCapture}
                        className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                        Capture
                    </button>
                </div>
            </div>
        </div>
    );
};

const ImageUpload = ({ onImageSelect, previewUrl, label = "Upload Photo" }) => {
    const fileInputRef = useRef(null);
    const [internalPreview, setInternalPreview] = useState(null);
    const [showCamera, setShowCamera] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            setInternalPreview(reader.result);
            if (onImageSelect) {
                onImageSelect(file, reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleCameraCapture = (file) => {
        processFile(file);
        setShowCamera(false);
    };

    const currentPreview = previewUrl || internalPreview;

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

            <div className="flex flex-col gap-3">
                {/* Hidden Input for File Select */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />

                {/* Buttons */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={triggerFileSelect}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        <span className="text-xl">📁</span>
                        <span>Choose File</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        <span className="text-xl">📸</span>
                        <span>Use Camera</span>
                    </button>
                </div>

                {/* Preview Area */}
                {currentPreview && (
                    <div className="relative mt-2">
                        <img
                            src={currentPreview}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setInternalPreview(null);
                                if (onImageSelect) onImageSelect(null, null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <CameraModal
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
};

export default ImageUpload;
