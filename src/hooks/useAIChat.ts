"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import type { AIProvider } from "~/server/lib/ai-model-manager";

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: 'image' | 'document' | 'audio' | 'video';
  fileSize: number;
  mimeType: string;
  cloudinaryId?: string;
  url: string;
}

export interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

export interface ChatConfig {
  provider: AIProvider;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export interface ImageGenerationConfig extends ChatConfig {
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface GeneratedImage {
  url: string;
  revisedPrompt?: string;
}

export interface UseAIChatOptions {
  defaultConfig?: Partial<ChatConfig>;
  onError?: (error: Error) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  conversationId?: string; // For loading existing conversations
  onImageGenerationStart?: () => void;
  onImageGenerationEnd?: () => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(options.conversationId);
  const [conversationTitle, setConversationTitle] = useState<string | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // Get available models
  const { data: availableModels, isLoading: modelsLoading } = 
    api.aiChat.getAvailableModels.useQuery();

  // Load conversation history if conversationId is provided
  const { data: conversationData, isLoading: conversationLoading } = 
    api.aiChat.getConversationHistory.useQuery(
      { conversationId: options.conversationId! },
      { enabled: !!options.conversationId }
    );

  // Load conversation data when it's available
  useEffect(() => {
    if (conversationData?.success && conversationData.messages) {
      const loadedMessages: Message[] = conversationData.messages.map(msg => ({
        id: msg.id,
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(loadedMessages);
      setConversationTitle(conversationData.conversation.title || undefined);
      setCurrentConversationId(conversationData.conversation.id);
    }
  }, [conversationData]);

  // Generate non-streaming response
  const generateResponse = api.aiChat.generateResponse.useMutation({
    onError: (error) => {
      options.onError?.(new Error(error.message));
    },
  });

  // Save conversation mutation
  const saveConversation = api.aiChat.saveConversation.useMutation({
    onError: (error) => {
      options.onError?.(new Error(error.message));
    },
  });

  // Get default config for a provider
  const getDefaultConfig = useCallback((provider: AIProvider) => {
    return api.aiChat.getDefaultConfig.useQuery({ provider });
  }, []);

  // Add a message to the chat
  const addMessage = useCallback((role: Message["role"], content: string, attachments?: MessageAttachment[]) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      attachments: attachments?.length ? attachments : undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Auto-save conversation after each message exchange
  const autoSaveConversation = useCallback(async (
    messagesSnapshot: Message[],
    config: ChatConfig
  ) => {
    try {
      const result = await saveConversation.mutateAsync({
        messages: messagesSnapshot.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        config,
        conversationId: currentConversationId,
        title: conversationTitle,
      });

      if (result.success && !currentConversationId) {
        setCurrentConversationId(result.conversationId);
        setConversationTitle(result.title || undefined);
      }
    } catch (error) {
      console.error("Failed to auto-save conversation:", error);
      // Don't throw here to avoid interrupting the chat flow
    }
  }, [saveConversation, currentConversationId, conversationTitle]);

  // Send message with non-streaming response
  const sendMessage = useCallback(async (
    content: string,
    config: ChatConfig,
    attachments: MessageAttachment[] = []
  ) => {
    try {
      // Add user message
      const userMessage = addMessage("user", content, attachments);

      // Prepare messages array with formatting system prompt
      const defaultSystemPrompt = `You are a helpful AI assistant. When providing code examples, always format them properly using markdown code blocks with language specification.

For example:
- Use \`\`\`typescript for TypeScript code
- Use \`\`\`javascript for JavaScript code  
- Use \`\`\`python for Python code
- Use \`\`\`json for JSON data
- Use \`\`\`css for CSS styles
- Use \`\`\`html for HTML markup
- Use \`\`\`bash for shell commands

Always include the language identifier after the opening triple backticks for proper syntax highlighting.

For inline code, use single backticks: \`variableName\` or \`functionName()\`.

Format your responses with proper markdown structure including headers, lists, and code blocks as appropriate.`;

      const messagesForAPI = [
        { role: "system" as const, content: defaultSystemPrompt },
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user" as const, content }
      ];

      // Generate response
      const response = await generateResponse.mutateAsync({
        messages: messagesForAPI,
        config,
      });

      // Add assistant response
      const assistantMessage = addMessage("assistant", response.content);

      // Auto-save conversation
      const finalMessages = [...messages, userMessage, assistantMessage];
      await autoSaveConversation(finalMessages, config);

      return response;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }, [messages, addMessage, generateResponse, autoSaveConversation, options.onError]);

  // Send message with streaming response
  const sendMessageStream = useCallback(async (
    content: string,
    config: ChatConfig,
    attachments: MessageAttachment[] = []
  ) => {
    try {
      // Add user message
      const userMessage = addMessage("user", content, attachments);

      // Prepare messages array with formatting system prompt
      const defaultSystemPrompt = `You are a helpful AI assistant. When providing code examples, always format them properly using markdown code blocks with language specification.

For example:
- Use \`\`\`typescript for TypeScript code
- Use \`\`\`javascript for JavaScript code  
- Use \`\`\`python for Python code
- Use \`\`\`json for JSON data
- Use \`\`\`css for CSS styles
- Use \`\`\`html for HTML markup
- Use \`\`\`bash for shell commands

Always include the language identifier after the opening triple backticks for proper syntax highlighting.

For inline code, use single backticks: \`variableName\` or \`functionName()\`.

Format your responses with proper markdown structure including headers, lists, and code blocks as appropriate.`;

      const messagesForAPI = [
        { role: "system" as const, content: defaultSystemPrompt },
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user" as const, content }
      ];

      setIsStreaming(true);
      setCurrentStreamContent("");
      options.onStreamStart?.();

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Generate response (non-streaming for now)
      const response = await generateResponse.mutateAsync({
        messages: messagesForAPI,
        config,
      });

      // Simulate streaming by gradually revealing the content
      const fullContent = response.content;
      let currentContent = '';
      let lastUpdateTime = Date.now();
      const minUpdateInterval = 16; // ~60fps
      
      // Stream character by character for more realistic effect
      for (let i = 0; i < fullContent.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          // If aborted, add the partial message and break
          if (currentContent.trim()) {
            const assistantMessage = addMessage("assistant", currentContent + " [stopped]");
            const finalMessages = [...messages, userMessage, assistantMessage];
            await autoSaveConversation(finalMessages, config);
          }
          break;
        }
        
        currentContent += fullContent[i];
        
        // Throttle updates to prevent UI jank
        const now = Date.now();
        if (now - lastUpdateTime >= minUpdateInterval) {
          setCurrentStreamContent(currentContent);
          lastUpdateTime = now;
        }
        
        // Variable delay based on character type
        const char = fullContent[i] || '';
        let delay = 10; // base delay (faster)
        
        if (char === '\n') delay = 50; // shorter pause at line breaks
        else if (char === ' ') delay = 15; // shorter for spaces
        else if (/[.!?]/.test(char)) delay = 100; // shorter pause at sentence endings
        else if (/[,;:]/.test(char)) delay = 40; // shorter pause at punctuation
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Final update to ensure we show all content
      if (!abortControllerRef.current?.signal.aborted) {
        setCurrentStreamContent(fullContent);
        const assistantMessage = addMessage("assistant", fullContent);
        
        // Auto-save conversation
        const finalMessages = [...messages, userMessage, assistantMessage];
        await autoSaveConversation(finalMessages, config);
      }
      
      setIsStreaming(false);
      setCurrentStreamContent("");
      options.onStreamEnd?.();

    } catch (error) {
      setIsStreaming(false);
      setCurrentStreamContent("");
      options.onError?.(error as Error);
    } finally {
      abortControllerRef.current = null;
    }
  }, [messages, addMessage, generateResponse, autoSaveConversation, options]);

  // Stop streaming with proper cleanup
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    // Don't clear currentStreamContent immediately to show partial response
  }, []);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(undefined);
    setConversationTitle(undefined);
    stopStreaming();
  }, [stopStreaming]);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    clearChat();
  }, [clearChat]);

  // Load conversation
  const loadConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    // The conversation data will be loaded automatically via the query
  }, []);

  // Manually save conversation with custom title
  const saveConversationManually = useCallback(async (title?: string) => {
    if (messages.length === 0) return;

    // Get the last used config (you might want to store this in state)
    const defaultConfig: ChatConfig = {
      provider: "google",
      model: "gemini-1.5-flash",
      temperature: 0.7,
      maxTokens: 1000,
    };

    try {
      const result = await saveConversation.mutateAsync({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        config: defaultConfig,
        conversationId: currentConversationId,
        title: title || conversationTitle,
      });

      if (result.success) {
        setCurrentConversationId(result.conversationId);
        setConversationTitle(result.title || undefined);
        return result.conversationId;
      }
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }, [messages, saveConversation, currentConversationId, conversationTitle, options.onError]);

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Edit message
  const editMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content: newContent } : msg
    ));
  }, []);

  // Generate image mutation
  const generateImage = api.aiChat.generateImage.useMutation({
    onError: (error) => {
      options.onError?.(new Error(error.message));
    },
  });

  // Generate image function
  const generateImageResponse = useCallback(async (
    prompt: string,
    config: ImageGenerationConfig
  ) => {
    try {
      setIsGeneratingImage(true);
      setGeneratedImages([]);
      options.onImageGenerationStart?.();

      const response = await generateImage.mutateAsync({
        prompt,
        config,
      });

      if (response.success && response.images) {
        setGeneratedImages(response.images);
        
        // Add the image generation as a message
        const imageUrls = response.images.map(img => img.url).join('\n');
        const messageContent = `Generated images for prompt: "${prompt}"\n\n${imageUrls}`;
        const imageMessage: Message = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: "assistant",
          content: messageContent,
          timestamp: new Date(),
        };
        addMessage("assistant", messageContent);

        // Auto-save conversation
        const finalMessages = [...messages, imageMessage];
        await autoSaveConversation(finalMessages, config);
      }

      return response;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsGeneratingImage(false);
      options.onImageGenerationEnd?.();
    }
  }, [messages, addMessage, generateImage, autoSaveConversation, options]);

  return {
    // State
    messages,
    isStreaming,
    currentStreamContent,
    isGenerating: generateResponse.isPending,
    isSaving: saveConversation.isPending,
    isLoadingConversation: conversationLoading,
    availableModels,
    modelsLoading,
    currentConversationId,
    conversationTitle,
    isGeneratingImage,
    generatedImages,

    // Actions
    sendMessage,
    sendMessageStream,
    stopStreaming,
    addMessage,
    clearChat,
    startNewConversation,
    loadConversation,
    saveConversationManually,
    deleteMessage,
    editMessage,
    generateImageResponse,

    // Utilities
    getDefaultConfig,
  };
} 