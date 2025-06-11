import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cloudinaryService } from "~/server/lib/cloudinary";
import { TRPCError } from "@trpc/server";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp3',
  'audio/ogg',
];

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_AUDIO_TYPES,
];

// Input validation schema
const fileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().min(1).max(MAX_FILE_SIZE),
  mimeType: z.enum(ALL_ALLOWED_TYPES as [string, ...string[]]),
  fileData: z.string(), // Base64 encoded file data
});

const multipleFileUploadSchema = z.object({
  files: z.array(fileUploadSchema).min(1).max(5), // Allow up to 5 files at once
});

export const fileUploadRouter = createTRPCRouter({
  // Upload single file
  uploadFile: protectedProcedure
    .input(fileUploadSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Validate file size
        if (input.fileSize > MAX_FILE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          });
        }

        // Validate file type
        if (!ALL_ALLOWED_TYPES.includes(input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File type not supported",
          });
        }

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(input.fileData, 'base64');

        // Verify actual file size matches declared size
        if (fileBuffer.length !== input.fileSize) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File size mismatch",
          });
        }

        // Upload to Cloudinary
        const uploadResult = await cloudinaryService.uploadFile(
          fileBuffer,
          input.fileName,
          input.mimeType,
          {
            folder: `chat-attachments/${ctx.session.user.id}`,
            resourceType: input.mimeType.startsWith('image/') ? 'image' : 'raw',
          }
        );

        return {
          success: true,
          file: uploadResult,
        };
      } catch (error) {
        console.error("File upload error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to upload file",
        });
      }
    }),

  // Upload multiple files
  uploadMultipleFiles: protectedProcedure
    .input(multipleFileUploadSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const uploadResults = [];
        const userId = ctx.session.user.id;

        for (const file of input.files) {
          // Validate each file
          if (file.fileSize > MAX_FILE_SIZE) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `File ${file.fileName} exceeds maximum size limit`,
            });
          }

          if (!ALL_ALLOWED_TYPES.includes(file.mimeType)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `File type not supported for ${file.fileName}`,
            });
          }

          // Convert base64 to buffer
          const fileBuffer = Buffer.from(file.fileData, 'base64');

          // Upload to Cloudinary
          const uploadResult = await cloudinaryService.uploadFile(
            fileBuffer,
            file.fileName,
            file.mimeType,
            {
              folder: `chat-attachments/${userId}`,
              resourceType: file.mimeType.startsWith('image/') ? 'image' : 'raw',
            }
          );

          uploadResults.push(uploadResult);
        }

        return {
          success: true,
          files: uploadResults,
        };
      } catch (error) {
        console.error("Multiple file upload error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to upload files",
        });
      }
    }),

  // Delete file
  deleteFile: protectedProcedure
    .input(z.object({
      cloudinaryId: z.string(),
      attachmentId: z.string().optional(), // If deleting from database too
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Delete from Cloudinary
        await cloudinaryService.deleteFile(input.cloudinaryId);

        // Delete from database if attachment ID provided
        if (input.attachmentId) {
          // First verify the user owns this attachment through their messages
          const attachment = await ctx.db.attachment.findFirst({
            where: {
              id: input.attachmentId,
              message: {
                conversation: {
                  userId: ctx.session.user.id,
                },
              },
            },
          });

          if (!attachment) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Attachment not found or you don't have permission to delete it",
            });
          }

          await ctx.db.attachment.delete({
            where: {
              id: input.attachmentId,
            },
          });
        }

        return {
          success: true,
          message: "File deleted successfully",
        };
      } catch (error) {
        console.error("File deletion error:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to delete file",
        });
      }
    }),

  // Get allowed file types
  getAllowedFileTypes: protectedProcedure.query(() => {
    return {
      images: ALLOWED_IMAGE_TYPES,
      documents: ALLOWED_DOCUMENT_TYPES,
      audio: ALLOWED_AUDIO_TYPES,
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 5,
    };
  }),
}); 