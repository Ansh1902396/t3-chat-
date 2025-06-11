import { v2 as cloudinary } from 'cloudinary';
import { env } from '~/env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  bytes: number;
}

export interface FileUploadResult {
  cloudinaryId: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
}

export class CloudinaryService {
  private static instance: CloudinaryService;

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    options: {
      folder?: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
      transformation?: any;
    } = {}
  ): Promise<FileUploadResult> {
    try {
      const base64File = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      
      const uploadResult = await cloudinary.uploader.upload(base64File, {
        folder: options.folder || 'chat-attachments',
        resource_type: options.resourceType || 'auto',
        transformation: options.transformation,
        use_filename: true,
        filename_override: originalName.split('.')[0], // Remove extension
        quality: 'auto',
        fetch_format: 'auto',
      });

      // Determine file type based on resource type and format
      let fileType = 'document';
      if (uploadResult.resource_type === 'image') {
        fileType = 'image';
      } else if (uploadResult.resource_type === 'video') {
        fileType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        fileType = 'audio';
      }

      return {
        cloudinaryId: uploadResult.public_id,
        url: uploadResult.secure_url,
        fileName: originalName,
        fileType,
        fileSize: uploadResult.bytes,
        mimeType,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateThumbnail(publicId: string, width = 200, height = 200): Promise<string> {
    try {
      const url = cloudinary.url(publicId, {
        width,
        height,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
      });
      return url;
    } catch (error) {
      console.error('Cloudinary thumbnail error:', error);
      throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const cloudinaryService = CloudinaryService.getInstance(); 