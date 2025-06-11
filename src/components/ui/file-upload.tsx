"use client"

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '~/components/ui/button';
import { Upload, X, FileText, Image, Volume2, Video, AlertCircle } from 'lucide-react';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

interface UploadedFile {
  id: string;
  fileName: string;
  fileType: 'image' | 'document' | 'audio' | 'video';
  fileSize: number;
  mimeType: string;
  url: string;
  cloudinaryId: string;
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
  if (mimeType.startsWith('audio/')) return <Volume2 className="h-5 w-5" />;
  if (mimeType.startsWith('video/')) return <Video className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
};

export function FileUpload({
  onFilesUploaded,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
  ],
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);

  // Get allowed file types from server
  const { data: serverFileTypes } = api.fileUpload.getAllowedFileTypes.useQuery();

  const uploadFiles = api.fileUpload.uploadMultipleFiles.useMutation({
    onSuccess: (data) => {
      onFilesUploaded(data.files.map(file => ({
        id: Math.random().toString(36),
        fileName: file.fileName,
        fileType: file.fileType as 'image' | 'document' | 'audio' | 'video',
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        url: file.url,
        cloudinaryId: file.cloudinaryId,
      })));
      setUploading(false);
      setUploadProgress({});
      setErrors([]);
    },
    onError: (error) => {
      setErrors([error.message]);
      setUploading(false);
      setUploadProgress({});
    },
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64 || '');
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (files: File[]) => {
    setUploading(true);
    setErrors([]);
    
    try {
      const fileData = await Promise.all(
        files.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileData: base64,
          };
        })
      );

      await uploadFiles.mutateAsync({ files: fileData });
    } catch (error) {
      console.error('Upload error:', error);
      setErrors([error instanceof Error ? error.message : 'Upload failed']);
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectionErrors = rejectedFiles.map(({ file, errors }) => {
        const error = errors[0];
        if (error?.code === 'file-too-large') {
          return `${file.name} is too large (max ${formatFileSize(maxFileSize)})`;
        }
        if (error?.code === 'file-invalid-type') {
          return `${file.name} type is not supported`;
        }
        return `${file.name} was rejected`;
      });
      setErrors(rejectionErrors);
      return;
    }

    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles);
    }
  }, [maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce((acc: Record<string, string[]>, type) => {
      acc[type] = [];
      return acc;
    }, {}),
    maxFiles,
    maxSize: maxFileSize,
    disabled: uploading,
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/20",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <Upload className={cn("h-8 w-8 text-primary", uploading && "animate-pulse")} />
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              {isDragActive
                ? "Drop files here..."
                : uploading
                ? "Uploading files..."
                : "Upload files"}
            </p>
            
            <p className="text-sm text-muted-foreground">
              {uploading 
                ? "Please wait while we upload your files"
                : `Drag and drop or click to select files (max ${maxFiles} files, ${formatFileSize(maxFileSize)} each)`
              }
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {serverFileTypes?.images.slice(0, 3).map(type => (
                <span key={type} className="text-xs bg-muted px-2 py-1 rounded-full">
                  {type.split('/')[1]?.toUpperCase()}
                </span>
              ))}
              <span className="text-xs text-muted-foreground">+ more</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            <span className="text-sm font-medium">Uploading files...</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: '60%' }} // Placeholder progress
            />
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={() => setErrors(errors.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 