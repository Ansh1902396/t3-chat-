import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Download, Maximize2 } from "lucide-react";
import { cn } from "~/lib/utils";

interface GeneratedImageProps {
  url: string;
  prompt?: string;
  className?: string;
}

export function GeneratedImage({ url, prompt, className }: GeneratedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDownload = () => {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("relative group rounded-lg overflow-hidden bg-muted/20", className)}>
      {/* Image */}
      <div className="relative aspect-square w-full">
        <img
          src={url}
          alt={prompt || "Generated image"}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
        />
        
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        )}

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
              <img
                src={url}
                alt={prompt || "Generated image"}
                className="w-full h-full object-contain"
              />
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Prompt (if provided) */}
      {prompt && (
        <div className="p-3 text-sm text-muted-foreground line-clamp-2">
          {prompt}
        </div>
      )}
    </div>
  );
} 