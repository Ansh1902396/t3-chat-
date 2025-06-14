"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Command } from "cmdk";
import { 
  Search,
  MessageCircle,
  Clock,
  FileText,
  Sparkles
} from "lucide-react";
import { api } from "~/trpc/react";
import { useIsMac } from "~/hooks/use-command-k";
import { useRouter } from "next/navigation";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const isMac = useIsMac();
  
  // Search query with debouncing
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  // Search conversations
  const { data: conversations, isLoading } = api.search.searchConversations.useQuery(
    { query: debouncedQuery, limit: 8 },
    { 
      enabled: isOpen && debouncedQuery.length > 0 // Only search when query has content
    }
  );

  // Get recent conversations when no search query
  const { data: recentConversations } = api.aiChat.listConversations.useQuery(
    { limit: 8, offset: 0 },
    { 
      enabled: isOpen && debouncedQuery.length === 0 // Only fetch when no search query
    }
  );

  // Debug logging
  useEffect(() => {
    if (debouncedQuery.length > 0 && conversations) {
      console.log(`🔍 Frontend: Search results for "${debouncedQuery}":`, conversations);
    }
    if (debouncedQuery.length === 0 && recentConversations) {
      console.log(`📋 Frontend: Recent conversations:`, recentConversations);
    }
  }, [debouncedQuery, conversations, recentConversations]);

  // Combine search results with recent conversations
  // Note: search API returns conversations directly, but listConversations returns {conversations: [...]}
  const displayConversations = debouncedQuery.length > 0 ? conversations : recentConversations?.conversations;
  
  console.log(`🎯 Frontend Debug:`, {
    query,
    debouncedQuery,
    isOpen,
    isLoading,
    searchEnabled: isOpen && debouncedQuery.length > 0,
    recentEnabled: isOpen && debouncedQuery.length === 0,
    conversations: conversations?.length,
    recentConversations: recentConversations?.conversations?.length,
    displayConversations: displayConversations?.length,
    rawConversations: conversations,
    rawRecentConversations: recentConversations
  });

  // Generate summaries mutation
  const generateSummaries = api.search.generateMissingSummaries.useMutation();
  
  // Debug mutation
  const debugListConversations = api.search.debugListConversations.useQuery(
    undefined,
    { enabled: false }
  );

  const handleClose = () => {
    setQuery("");
    setDebouncedQuery("");
    onClose();
  };

  const handleSelectConversation = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
    handleClose();
  };

  const handleGenerateSummaries = () => {
    generateSummaries.mutate({ batchSize: 5 });
    handleClose();
  };

  // Reset query when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Dialog container */}
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh]">
        <DialogPanel className="w-full max-w-2xl mx-4">
          <Command shouldFilter={false} className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search input */}
            <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search className="h-5 w-5 text-gray-400 mr-3" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search conversations..."
                className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 border-0 outline-none text-base"
                autoFocus
              />
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">
                  {isMac ? "⌘" : "Ctrl"}
                </kbd>
                <span>+</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">K</kbd>
              </div>
            </div>

            {/* Results */}
            <Command.List className="max-h-80 overflow-y-auto p-2">
              {isLoading && (
                <div className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  Searching...
                </div>
              )}

              {!isLoading && displayConversations?.length === 0 && query && (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-base font-medium">No conversations found</p>
                  <p className="text-sm">Try searching with different keywords</p>
                </div>
              )}

              {!isLoading && displayConversations?.length === 0 && !query && (
                <div className="px-4 py-6">
                  <Command.Group heading="Quick Actions">
                    <Command.Item
                      onSelect={handleGenerateSummaries}
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-blue-500 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          Generate Summaries
                        </div>
                        <div className="text-xs text-gray-500">
                          Create summaries for recent conversations
                        </div>
                      </div>
                    </Command.Item>
                    
                    <Command.Item
                      onSelect={() => {
                        debugListConversations.refetch();
                        console.log("🐛 Debug: Fetching all conversations...");
                      }}
                      className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <Search className="h-4 w-4 text-orange-500 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          Debug: List All Conversations
                        </div>
                        <div className="text-xs text-gray-500">
                          Check console for conversation list
                        </div>
                      </div>
                    </Command.Item>
                  </Command.Group>
                </div>
              )}

              {!isLoading && displayConversations && displayConversations.length > 0 && (
                <Command.Group heading="Conversations">
                  {displayConversations.map((conversation) => (
                    <Command.Item
                      key={conversation.id}
                      value={conversation.id}
                      onSelect={() => handleSelectConversation(conversation.id)}
                      className="flex items-start px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <MessageCircle className="h-4 w-4 text-gray-400 mt-1 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {conversation.title || "Untitled Chat"}
                          </h4>
                          <div className="flex items-center text-xs text-gray-500 ml-2">
                            <FileText className="h-3 w-3 mr-1" />
                            {conversation._count.messages}
                          </div>
                        </div>
                        
                        {(conversation as any).summary && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                            {(conversation as any).summary}
                          </p>
                        )}
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                          {'similarity' in conversation && (
                            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {Math.round((conversation as any).similarity * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Empty className="px-4 py-8 text-center text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No results found for "{query}"</p>
              </Command.Empty>
            </Command.List>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border text-xs">↑↓</kbd>
                    <span className="ml-1">Navigate</span>
                  </div>
                  <div className="flex items-center">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border text-xs">⏎</kbd>
                    <span className="ml-1">Select</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border text-xs">esc</kbd>
                  <span className="ml-1">Close</span>
                </div>
              </div>
            </div>
          </Command>
        </DialogPanel>
      </div>
    </Dialog>
  );
} 