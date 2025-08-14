'use client';

import React, { useState, useRef } from 'react';

interface MusicUploadProps {
  onUploadSuccess: (fileData: {
    publicId: string;
    url: string;
    originalFilename: string;
    fileSize: number;
    duration: number;
    format: string;
  }) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
  currentFile?: {
    url: string;
    filename: string;
  } | null;
}

export default function MusicUpload({ 
  onUploadSuccess, 
  onUploadError, 
  disabled = false,
  currentFile = null 
}: MusicUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/aac', 'audio/mp4'];
    if (!allowedTypes.includes(file.type)) {
      onUploadError('Invalid file type. Please upload MP3, WAV, AAC, or M4A files only.');
      return;
    }

    // Validate file size (50MB)
    if (file.size > 50000000) {
      onUploadError('File too large. Maximum size is 50MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/music', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onUploadSuccess(result.data);
        setUploadProgress(100);
      } else {
        onUploadError(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('Upload failed. Please check your connection and try again.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Current File Display */}
      {currentFile && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600">🎵</span>
              </div>
              <div>
                <p className="font-medium text-green-800">Music File Uploaded</p>
                <p className="text-sm text-green-600">{currentFile.filename}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <audio 
                controls 
                className="h-8"
                style={{ width: '200px' }}
              >
                <source src={currentFile.url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
          dragActive
            ? 'border-purple-400 bg-purple-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading ? (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
            <p className="text-sm font-medium text-gray-900">Uploading music...</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{uploadProgress}% complete</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
            <p className="text-sm font-medium text-gray-900">
              {currentFile ? 'Replace music file' : 'Upload music file'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop or click to select
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: MP3, WAV, AAC, M4A (max 50MB)
            </p>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={`mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {currentFile ? 'Choose New File' : 'Choose File'}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.aac,.m4a,audio/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Music file will be used during live performances</p>
        <p>• Judges can play and download the file during scoring</p>
        <p>• Make sure the file is the correct version for your performance</p>
      </div>
    </div>
  );
}
