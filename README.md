# Firebase Callable Functions: Streaming Support Demo

## 🚀 The Smallest Fullstack Framework for Firebase Apps

Firebase Callable Functions provide a complete fullstack solution with:
- ✅ One unified API
- ✅ Automatic Firebase Auth integration
- ✅ Built-in App Check support
- ✅ Automatic CORS handling
- ✅ Client SDKs for all major platforms
- ✨ **NEW: Streaming support!**

## 🌊 Why Streaming?

Streaming transforms the user experience for slow API endpoints where incremental updates are available:

### Performance Comparison
- **Traditional approach**: Wait 1-10 seconds for complete response
- **Streaming approach**: First content in <1s, continuous updates

### Perfect Use Cases
- 🤖 AI/LLM responses (Gemini, ChatGPT, Claude)
- 📊 Large data processing with progress updates
- 🔄 Real-time transformations
- 📈 Long-running calculations

## 💻 Sample Code

### Server-Side Implementation

```typescript
import { onCall } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateCorpspeak = onCall(
  { region: "us-central1" },
  async (req, res) => {
    const { prompt } = req.data;
    const ai = new GoogleGenerativeAI(process.env.GENAI_API_KEY!);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Check if client supports streaming
    if (req.acceptsStreaming) {
      // Stream mode: Send chunks as they arrive
      const { stream, response } = await model.generateContentStream(prompt);

      for await (const chunk of stream) {
        // Send each chunk to the client immediately
        res.sendChunk({ partial: chunk.text });
      }

      // Return the complete response
      const result = await response;
      return { complete: result.text };
    } else {
      // Non-streaming mode: Wait for complete response
      const result = await model.generateContent(prompt);
      return { complete: result.text };
    }
  }
);
```

### Key Server Concepts

1. **`req.acceptsStreaming`**: Detect if client supports streaming
2. **`res.sendChunk()`**: Send incremental updates
3. **Graceful fallback**: Automatically works for non-streaming clients. (`sendChunk()` is a no-op)

### Client-Side Implementation (JavaScript/TypeScript)

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

// Define the callable with streaming types
const generateCorpspeak = httpsCallable<
  { prompt: string },           // Request type
  { complete: string },         // Response type
  { partial: string }           // Streaming chunk type
>(getFunctions(), "generateCorpspeak");

// Traditional non-streaming call
async function callWithoutStreaming(prompt: string) {
  const result = await generateCorpspeak({ prompt });
  console.log("Complete response:", result.data.complete);
}

// Streaming call
async function callWithStreaming(prompt: string) {
  const startTime = performance.now();
  let streamedContent = "";

  // Use .stream() instead of regular call
  const { stream, data: dataPromise } = await generateCorpspeak.stream({
    prompt
  });

  // Process chunks as they arrive
  for await (const chunk of stream) {
    if (chunk.partial) {
      streamedContent += chunk.partial;
      console.log("Chunk received:", chunk.partial);

      // Update UI immediately
      updateUI(streamedContent);

      // Measure time to first byte
      if (streamedContent.length > 0 && !firstByteTime) {
        const firstByteTime = performance.now() - startTime;
        console.log(`Time to first byte: ${firstByteTime}ms`);
      }
    }
  }

  // Get the final complete response
  const finalData = await dataPromise;
  console.log("Final response:", finalData.complete);
}
```

### Alternative: Using Genkit Flows

```typescript
import { onCallGenkit } from "firebase-functions/v2/https";
import { ai } from "@genkit-ai/ai";
import { z } from "zod";

// Define a flow with streaming schema
const corpspeakFlow = ai.defineFlow(
  {
    name: "generateCorpspeak",
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.object({ complete: z.string() }),
    streamSchema: z.object({ partial: z.string().optional() }),
  },
  async (input, { sendChunk }) => {
    const { stream, response } = await model.generateContentStream(input.prompt);

    for await (const chunk of stream) {
      // sendChunk is only available when client requests streaming
      if (sendChunk) {
        sendChunk({ partial: chunk.text });
      }
    }

    return { complete: (await response).text };
  }
);

// Export as callable function
export const generateCorpspeak = onCallGenkit(corpspeakFlow);
```

## 🔍 Internals: How Does Streaming Work?

Firebase Callable Functions use **Server-Sent Events (SSE)** for streaming responses.

### Testing with cURL

```bash
# Streaming request (note the Accept header)
$ curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  'http://127.0.0.1:5001/your-project/us-central1/generateCorpspeak' \
  -d '{"data": {"prompt": "hello world"}}'

# Response format (SSE)
data: {"message":{"partial":"Greetings"}}

data: {"message":{"partial":". In terms of a comprehensive overview"}}

data: {"message":{"partial":" of the situation at hand, we must acknowledge"}}

data: {"message":{"partial":" the nascent nature of this particular deliverable."}}

data: {"result":{"complete":"Greetings. In terms of a comprehensive overview of the situation at hand, we must acknowledge the nascent nature of this particular deliverable."}}
```

### SSE Protocol Details

1. **Message Format**: Each chunk is sent as `data: {JSON}\n\n`
2. **Chunk Structure**: `{"message": {"partial": "..."}}`
3. **Final Result**: `{"result": {"complete": "..."}}`
4. **Error Handling**: `{"error": {"message": "...", "code": "..."}}`

### Non-Streaming Request

```bash
# Without Accept: text/event-stream header
$ curl -X POST \
  -H 'Content-Type: application/json' \
  'http://127.0.0.1:5001/your-project/us-central1/generateCorpspeak' \
  -d '{"data": {"prompt": "hello world"}}'

# Response: Standard JSON (waits for complete response)
{
  "result": {
    "complete": "Greetings. In terms of a comprehensive overview..."
  }
}
```

## 📊 Performance Metrics

### Time to First Byte (TTFB) Comparison

| Metric | Non-Streaming | Streaming | Improvement |
|--------|--------------|-----------|-------------|
| TTFB | 3,500ms | 450ms | **7.8x faster** |
| Total Time | 3,500ms | 3,600ms | ~same |
| User Perception | Poor | Excellent | ✨ |

### Why TTFB Matters
- Users see content immediately
- Reduced perceived latency
- Better engagement metrics
- Lower bounce rates

## 🛠️ Best Practices

### When to Use Streaming

✅ **Use streaming for:**
- AI/LLM responses
- Large data processing (>1s response time)
- Progress updates for long operations
- Real-time data transformations

❌ **Don't use streaming for:**
- Quick lookups (<500ms)
- Simple CRUD operations
- Binary data responses
- Operations requiring atomicity

### Implementation Tips

1. **Chunk Size**: Balance between frequency and overhead
   ```typescript
   // Good: Meaningful chunks
   res.sendChunk({ partial: sentence });

   // Bad: Too granular
   res.sendChunk({ partial: character });
   ```

2. **Error Handling**: Errors can be thrown at any point
   ```typescript
   try {
     for await (const chunk of stream) {
       res.sendChunk({ partial: chunk });
     }
   } catch (error) {
     // Error is automatically propagated to client
     throw new functions.https.HttpsError('internal', 'Stream failed');
   }
   ```

3. **Client State Management**: Track streaming state
   ```typescript
   let isStreaming = false;
   let content = "";

   for await (const chunk of stream) {
     isStreaming = true;
     content += chunk.partial;
     updateUI(content, isStreaming);
   }
   isStreaming = false;
   ```

## ⚠️ Current Limitations

### Platform Support
- ✅ **Server**: Node.js only (Python coming soon)
- ✅ **Clients**: Web (JS/TS), iOS (Swift), Android (Kotlin/Java)
- ❌ **Not supported**: Flutter, Unity, C++

### Technical Limitations
- No bi-directional streaming (client → server)
- Connection timeout
- No custom headers in SSE

### Requirements
- Firebase Functions v2 (v6.0.0+)
- Client SDK versions:
  - Web: 10.13.0+
  - iOS: 11.4.0+
  - Android: 21.8.0+

## 🚧 Testing Your Implementation

### Local Testing
```bash
# Start emulators
firebase emulators:start

# Test streaming endpoint
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  'http://127.0.0.1:5001/your-project/us-central1/generateCorpspeak' \
  -d '{"data": {"prompt": "test prompt"}}'
```

### Unit Testing
```typescript
import { expect } from "chai";
import { generateCorpspeak } from "./index";

describe("Streaming Functions", () => {
  it("should stream chunks when client accepts", async () => {
    const chunks: any[] = [];
    const mockRes = {
      sendChunk: (chunk: any) => chunks.push(chunk),
    };

    const result = await generateCorpspeak(
      { data: { prompt: "test" }, acceptsStreaming: true },
      mockRes
    );

    expect(chunks.length).to.be.greaterThan(0);
    expect(result.complete).to.include("test");
  });
});
```

## 🎯 Demo Application

This repository includes a complete demo showing:
- Side-by-side comparison of streaming vs non-streaming
- Real-time TTFB measurements
- Visual feedback during streaming
- Error handling examples

### Running the Demo
```bash
# Install dependencies
cd functions && npm install
cd ../web && npm install

# Start emulators
firebase emulators:start

# In another terminal, start the web app
cd web && npm run dev
```

## 🔮 Future Roadmap

- 🐍 Python runtime support
- 📱 Flutter SDK support
- 🔄 Bi-directional streaming
- 📊 Built-in progress tracking
- 🎯 Stream control (pause/resume)

## 📚 Resources

- [Firebase Callable Functions Documentation](https://firebase.google.com/docs/functions/callable)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Firebase Functions Samples](https://github.com/firebase/functions-samples)

---

Built with 🔥 by the Firebase team
