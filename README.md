# Marvin's Chat

A modern ChatGPT-like interface built with Next.js, TypeScript, and Tailwind CSS. This application integrates with the AI Builder Space API to provide chat functionality with multiple AI models.

## Features

- 🎨 **Two-Column Layout**: Clean sidebar for conversations and main chat interface
- 💬 **Multiple Conversations**: Create, switch, and delete conversations
- 🤖 **Dynamic Model Selection**: Choose from available AI models (Grok, Gemini, DeepSeek, etc.)
- ⚡ **Streaming Responses**: Real-time streaming of AI responses with automatic fallback
- 📝 **Markdown & HTML Rendering**: Beautiful formatted responses with syntax highlighting
- 💾 **Local Storage**: Conversations are saved in browser localStorage
- 🎯 **Modern UI**: ChatGPT-inspired dark theme design
- 🔄 **Real-time Updates**: Smooth message streaming and UI updates

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- AI Builder Space API token

### Installation

1. Clone the repository:
```bash
cd chatgpt-clone
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` and add your AI Builder Space API token:
```
AI_BUILDER_TOKEN=your_token_here
```

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
chatgpt-clone/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # API route for chat completions
│   ├── layout.tsx             # Root layout
│   ├── page.tsx              # Main page component
│   └── globals.css            # Global styles
├── components/
│   ├── Sidebar.tsx            # Conversation sidebar
│   ├── ChatInterface.tsx      # Main chat interface
│   ├── MessageList.tsx        # Message display component
│   ├── MessageInput.tsx       # Message input component
│   └── ConversationItem.tsx   # Individual conversation item
├── lib/
│   ├── api.ts                 # API client utilities
│   ├── storage.ts             # localStorage utilities
│   └── types.ts               # TypeScript type definitions
└── .env.local.example          # Environment variables example
```

## Usage

1. **Create a New Conversation**: Click "New Chat" in the sidebar
2. **Send Messages**: Type your message and press Enter or click Send
3. **Switch Conversations**: Click on any conversation in the sidebar
4. **Delete Conversations**: Hover over a conversation and click the delete icon
5. **Collapse Sidebar**: Click the collapse button to minimize the sidebar

## API Integration

This application uses the AI Builder Space API with the following configuration:

- **Base URL**: `https://space.ai-builders.com/backend/v1`
- **Models**: Dynamically loaded from API (Grok-4-fast, Grok-4, Gemini, DeepSeek, Supermind Agent, etc.)
- **Authentication**: Bearer token (AI_BUILDER_TOKEN)

The API routes handle:
- Dynamic model discovery (`/app/api/models/route.ts`)
- Streaming and non-streaming chat completions (`/app/api/chat/route.ts`)
- Automatic fallback for models that don't support streaming

## Technologies Used

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Markdown**: Markdown rendering with syntax highlighting
- **date-fns**: Date formatting utilities

## License

This project is for personal/educational use.

## Notes

- Conversations are stored in browser localStorage
- The application requires an active internet connection
- API token must be valid and have access to the Grok-4-fast model
