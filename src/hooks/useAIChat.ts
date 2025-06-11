"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import type { AIProvider } from "~/server/lib/ai-model-manager";

export interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: Date;
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

export interface UseAIChatOptions {
  defaultConfig?: Partial<ChatConfig>;
  onError?: (error: Error) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  conversationId?: string; // For loading existing conversations
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(options.conversationId);
  const [conversationTitle, setConversationTitle] = useState<string | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

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
  const addMessage = useCallback((role: Message["role"], content: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
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
    systemMessage?: string
  ) => {
    try {
      // Add user message
      const userMessage = addMessage("user", content);

      // Prepare messages array
      const messagesForAPI = [
        ...(systemMessage ? [{ role: "system" as const, content: systemMessage }] : []),
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

  // Send message with simulated streaming response
  const sendMessageStream = useCallback(async (
    content: string,
    config: ChatConfig,
    systemMessage?: string
  ) => {
    try {
      // Add user message
      const userMessage = addMessage("user", content);

      // Prepare messages array
      const messagesForAPI = [
        ...(systemMessage ? [{ role: "system" as const, content: systemMessage }] : []),
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
      const words = fullContent.split(' ');
      let currentContent = '';
      
      for (let i = 0; i < words.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        
        currentContent += (i > 0 ? ' ' : '') + words[i];
        setCurrentStreamContent(currentContent);
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Finalize the assistant message
      if (!abortControllerRef.current?.signal.aborted) {
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
    }
  }, [messages, addMessage, generateResponse, autoSaveConversation, options]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setCurrentStreamContent("");
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

    // Utilities
    getDefaultConfig,
  };
} 