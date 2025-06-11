"use client";

import { useState } from "react";
import { useAIChat } from "~/hooks/useAIChat";
import type { ChatConfig } from "~/hooks/useAIChat";

export function AIChatExample() {
  const [input, setInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<"openai" | "anthropic" | "google">("openai");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");

  const {
    messages,
    isStreaming,
    currentStreamContent,
    isGenerating,
    availableModels,
    modelsLoading,
    sendMessage,
    sendMessageStream,
    clearChat,
  } = useAIChat({
    onError: (error) => {
      console.error("Chat error:", error);
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || isGenerating) return;

    const config: ChatConfig = {
      provider: selectedProvider,
      model: selectedModel,
      temperature: 0.7,
      maxTokens: 1000,
    };

    // Use streaming for better UX
    sendMessageStream(input.trim(), config);
    setInput("");
  };

  const getAvailableModelsForProvider = () => {
    if (!availableModels?.models || !availableModels.models[selectedProvider]) {
      return [];
    }
    return Object.entries(availableModels.models[selectedProvider]);
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4 rounded-lg bg-white/10 p-4">
        <h2 className="mb-4 text-xl font-bold text-white">AI Chat Example</h2>
        
        {/* Model Selection */}
        <div className="mb-4 flex gap-4">
          <div>
            <label className="block text-sm font-medium text-white">Provider:</label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value as any);
                // Reset model when provider changes
                const models = availableModels?.models?.[e.target.value as keyof typeof availableModels.models];
                if (models) {
                  setSelectedModel(Object.keys(models)[0] || "");
                }
              }}
              className="mt-1 rounded bg-white/20 px-3 py-2 text-white"
              disabled={modelsLoading}
            >
              {availableModels?.providers?.map((provider) => (
                <option key={provider} value={provider} className="text-black">
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white">Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="mt-1 rounded bg-white/20 px-3 py-2 text-white"
              disabled={modelsLoading}
            >
              {getAvailableModelsForProvider().map(([modelId, modelInfo]) => (
                <option key={modelId} value={modelId} className="text-black">
                  {modelInfo.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {modelsLoading && (
          <p className="text-yellow-300">Loading available models...</p>
        )}
      </div>

      {/* Chat Messages */}
      <div className="mb-4 max-h-96 overflow-y-auto rounded-lg bg-white/5 p-4">
        {messages.length === 0 ? (
          <p className="text-gray-400">Start a conversation with the AI...</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`mb-3 rounded-lg p-3 ${
                message.role === "user"
                  ? "ml-8 bg-blue-600/20 text-blue-100"
                  : "mr-8 bg-gray-600/20 text-gray-100"
              }`}
            >
              <div className="mb-1 text-xs font-semibold uppercase opacity-70">
                {message.role}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          ))
        )}
        
        {/* Streaming message */}
        {isStreaming && currentStreamContent && (
          <div className="mr-8 mb-3 rounded-lg bg-gray-600/20 p-3 text-gray-100">
            <div className="mb-1 text-xs font-semibold uppercase opacity-70">
              assistant
            </div>
            <div className="whitespace-pre-wrap">{currentStreamContent}</div>
            <div className="mt-1 text-xs opacity-50">Typing...</div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white placeholder-white/50"
          disabled={isStreaming || isGenerating || modelsLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming || isGenerating || modelsLoading}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isStreaming ? "..." : isGenerating ? "Sending" : "Send"}
        </button>
        <button
          type="button"
          onClick={clearChat}
          className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
        >
          Clear
        </button>
      </form>

      {/* Debug Info */}
      {availableModels && (
        <div className="mt-4 rounded-lg bg-white/5 p-4">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-white">
              Debug Info
            </summary>
            <pre className="mt-2 text-xs text-gray-300">
              Available Providers: {availableModels.providers.join(", ")}
              {"\n"}
              Total Messages: {messages.length}
              {"\n"}
              Current Config: {selectedProvider} / {selectedModel}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
} 