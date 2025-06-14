# Spotlight-Style Search Setup Guide

This guide walks you through setting up the semantic search functionality for your T3 Chat application.

## Features Implemented

✅ **Command Palette**: Spotlight-style search interface  
✅ **Keyboard Shortcuts**: Cmd/Ctrl+K to open search  
✅ **Semantic Search**: AI-powered similarity search using OpenAI embeddings  
✅ **Automatic Summarization**: Background summary generation for conversations  
✅ **Vector Storage**: Embedding storage in PostgreSQL (fallback to JSON)  
✅ **tRPC Integration**: Type-safe search endpoints  
✅ **UI Components**: Modern command palette with Tailwind + Headless UI  

## Setup Instructions

### 1. Environment Variables

Add your OpenAI API key to your `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Database Schema

The database schema has been updated with:
- `summary` field for conversation summaries
- `embedding` field for vector embeddings (stored as JSON string)

Apply the schema changes:

```bash
pnpm prisma db push
```

### 3. pgvector Extension (Optional - For Production)

For better performance in production, install the pgvector extension:

#### macOS (Homebrew)
```bash
brew install pgvector
```

#### Ubuntu/Debian
```bash
sudo apt install postgresql-contrib-17 postgresql-17-pgvector
```

#### Docker
```dockerfile
FROM postgres:17
RUN apt-get update && apt-get install -y postgresql-contrib-17 postgresql-17-pgvector
```

#### Manual Installation
```bash
git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

After installation, enable the extension in your database:

```sql
CREATE EXTENSION vector;
```

### 4. Usage

#### Opening the Command Palette
- **Keyboard**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
- **UI Button**: Click the search button in the sidebar

#### Search Features
- **Text Search**: Searches conversation titles and summaries
- **Semantic Search**: Uses AI embeddings for intelligent matching
- **Recent Conversations**: Shows recent chats when search is empty
- **Quick Actions**: Generate summaries for conversations without them

#### Examples
- Search "education project" → finds chats about "tRPC project for open education"
- Search "database" → finds conversations about PostgreSQL, MongoDB, etc.
- Search "react components" → finds UI development discussions

### 5. Automatic Summary Generation

Summaries are automatically generated when:
- A conversation has 4+ messages
- The conversation doesn't already have a summary
- The conversation is saved (triggered in the background)

Manual summary generation:
- Use the "Generate Summaries" option in the command palette
- Call the `generateMissingSummaries` tRPC procedure

### 6. Performance Optimization

For production environments with many conversations:

1. **Enable pgvector extension** for true vector operations
2. **Update Prisma schema** to use proper vector types:

```prisma
model Conversation {
  // ... other fields
  embedding Unsupported("vector(1536)")
  
  @@index([userId], name: "idx_user_embedding", type: Hnsw)
}
```

3. **Create vector indexes** for faster similarity search:

```sql
CREATE INDEX ON conversations USING hnsw (embedding vector_cosine_ops);
```

### 7. Customization

#### Search Behavior
Modify search logic in `src/server/api/routers/search.ts`:
- Adjust similarity thresholds
- Change embedding models
- Modify summary generation prompts

#### UI Appearance
Customize the command palette in `src/components/command-palette.tsx`:
- Update keyboard shortcuts
- Modify search result display
- Add new quick actions

#### Summary Generation
Adjust automatic summary generation in `src/server/api/routers/ai-chat.ts`:
- Change trigger conditions (message count)
- Modify summary prompts
- Adjust OpenAI model settings

## API Endpoints

### Search Router (`api.search`)

- `searchConversations(query, limit)` - Search conversations
- `generateSummary(conversationId)` - Generate summary for specific conversation
- `generateMissingSummaries(batchSize)` - Bulk generate summaries

### Usage in Components

```typescript
import { api } from "~/trpc/react";
import { useCommandPalette } from "~/components/command-palette-provider";

// Search conversations
const { data: results } = api.search.searchConversations.useQuery({
  query: "your search query",
  limit: 10
});

// Open command palette
const { open } = useCommandPalette();
```

## Troubleshooting

### Common Issues

1. **Search not working**: Ensure OpenAI API key is set correctly
2. **No semantic results**: Generate summaries first using the command palette
3. **Slow search**: Consider implementing pgvector for production
4. **Migration errors**: The current setup uses JSON strings for embeddings

### Migration from JSON to pgvector

When ready to migrate to true vector storage:

1. Install pgvector extension
2. Update Prisma schema with proper vector types
3. Create migration to convert JSON strings to vectors
4. Update similarity search queries to use vector operations

This implementation provides a solid foundation for semantic search that can be enhanced with pgvector for production use. 