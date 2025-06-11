"use client"

import React from 'react';
import { Button } from '~/components/ui/button';
import { X, Download, FileText, Image, Volume2, Video, Eye } from 'lucide-react';
import { cn } from '~/lib/utils';

interface FileAttachment {
  id: string;
  fileName: string;
  fileType: 'image' | 'document' | 'audio' | 'video';
  fileSize: number;
  mimeType: string;
  url: string;
  cloudinaryId?: string;
}

interface FileAttachmentProps {
  attachment: FileAttachment;
  showPreview?: boolean;
  onRemove?: (id: string) => void;
  onDownload?: (attachment: FileAttachment) => void;
  onPreview?: (attachment: FileAttachment) => void;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string, mimeType: string) => {
  switch (fileType) {
    case 'image':
      return <Image className="h-4 w-4" />;
    case 'audio':
      return <Volume2 className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getTypeColor = (fileType: string) => {
  switch (fileType) {
    case 'image':
      return 'from-green-500/10 to-green-600/10 border-green-500/20';
    case 'audio':
      return 'from-purple-500/10 to-purple-600/10 border-purple-500/20';
    case 'video':
      return 'from-red-500/10 to-red-600/10 border-red-500/20';
    default:
      return 'from-blue-500/10 to-blue-600/10 border-blue-500/20';
  }
};

export function FileAttachment({
  attachment,
  showPreview = false,
  onRemove,
  onDownload,
  onPreview,
  className,
}: FileAttachmentProps) {
  const { fileName, fileType, fileSize, url, id } = attachment;
  const isImage = fileType === 'image';

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 transition-all duration-200",
        getTypeColor(fileType),
        "hover:shadow-md hover:scale-[1.02]",
        className
      )}
    >
      {/* Preview for images */}
      {showPreview && isImage && (
        <div className="aspect-video relative bg-muted/20 overflow-hidden">
          <img
            src={url}
            alt={fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* File Info */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-muted/40 to-muted/60 flex items-center justify-center">
            {getFileIcon(fileType, attachment.mimeType)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate mb-1" title={fileName}>
              {fileName}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatFileSize(fileSize)}</span>
              <span>•</span>
              <span className="capitalize">{fileType}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onPreview && isImage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onPreview(attachment)}
                title="Preview"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            
            {onDownload && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDownload(attachment)}
                title="Download"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => onRemove(id)}
                title="Remove"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FileAttachmentListProps {
  attachments: FileAttachment[];
  showPreviews?: boolean;
  onRemove?: (id: string) => void;
  onDownload?: (attachment: FileAttachment) => void;
  onPreview?: (attachment: FileAttachment) => void;
  className?: string;
}

export function FileAttachmentList({
  attachments,
  showPreviews = false,
  onRemove,
  onDownload,
  onPreview,
  className,
}: FileAttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {attachments.map((attachment) => (
        <FileAttachment
          key={attachment.id}
          attachment={attachment}
          showPreview={showPreviews}
          onRemove={onRemove}
          onDownload={onDownload}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
} 