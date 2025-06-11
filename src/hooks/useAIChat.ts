"use client";

import { useState, useCallback, useRef } from "react";
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
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const subscriptionRef = useRef<any>(null);

  // Get available models
  const { data: availableModels, isLoading: modelsLoading } = 
    api.aiChat.getAvailableModels.useQuery();

  // Generate non-streaming response
  const generateResponse = api.aiChat.generateResponse.useMutation({
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
      addMessage("assistant", response.content);

      return response;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }, [messages, addMessage, generateResponse, options.onError]);

  // Send message with streaming response
  const sendMessageStream = useCallback((
    content: string,
    config: ChatConfig,
    systemMessage?: string
  ) => {
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

    // Subscribe to streaming response
    subscriptionRef.current = api.aiChat.streamResponse.useSubscription(
      {
        messages: messagesForAPI,
        config,
      },
      {
        onData: (data) => {
          if (data.type === "chunk") {
            setCurrentStreamContent(prev => prev + data.content);
          } else if (data.type === "end") {
            // Finalize the assistant message
            setMessages(prev => [
              ...prev,
              {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                role: "assistant",
                content: currentStreamContent,
                timestamp: new Date(),
              }
            ]);
            
            setIsStreaming(false);
            setCurrentStreamContent("");
            options.onStreamEnd?.();
          } else if (data.type === "error") {
            setIsStreaming(false);
            setCurrentStreamContent("");
            options.onError?.(new Error(data.message));
          }
        },
        onError: (error) => {
          setIsStreaming(false);
          setCurrentStreamContent("");
          options.onError?.(new Error(error.message || 'Streaming error'));
        },
      }
    );
  }, [messages, addMessage, currentStreamContent, options]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    setIsStreaming(false);
    setCurrentStreamContent("");
  }, []);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([]);
    stopStreaming();
  }, [stopStreaming]);

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
    availableModels,
    modelsLoading,

    // Actions
    sendMessage,
    sendMessageStream,
    stopStreaming,
    addMessage,
    clearChat,
    deleteMessage,
    editMessage,

    // Utilities
    getDefaultConfig,
  };
} 