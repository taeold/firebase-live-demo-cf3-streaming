/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCallGenkit } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

import { googleAI } from "@genkit-ai/googleai";
import { genkit, z } from "genkit";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model("gemini-2.0-flash-lite"),
});

const createCorpspeakPrompt = (userInput: string): string => `
Transform the following straightforward text into verbose, jargon-filled "corpspeak."
The goal is to make it sound like a high-level executive trying to be overly formal, indirect, and use as many buzzwords as possible.
Think about synergy, leveraging, paradigm shifts, value-add, core competencies, proactive engagement, deliverables, stakeholders, strategic alignment, etc.
Avoid being too nonsensical, but lean heavily into obfuscation and grandiosity.
Output ONLY the corpspeak version.

Corpspeak transformation must be at least 5 sentences, ideally more, to conveny gravity of the matter.


User's straightforward text: "${userInput}"

Corpspeak Transformation:
`;

const corpspeakGeneratorFlow = ai.defineFlow(
  {
    name: "corpspeakGenerator",
    inputSchema: z.object({ prompt: z.string().min(1) }),
    outputSchema: z.object({ corpspeak: z.string() }),
    streamSchema: z.object({
      partial: z.string().optional(),
    }),
  },
  async (input, { sendChunk }) => {
    const userInput = input.prompt;
    logger.info("Corpspeak flow received input:", { userInput });

    const fullPrompt = createCorpspeakPrompt(userInput);

    const { stream: aiStream, response } = ai.generateStream({
      prompt: fullPrompt,
    });

    for await (const chunk of aiStream) {
      const textChunk = chunk.text.replace(/\n/g, " ").trim(); // Clean up chunk
      if (textChunk) {
        if (sendChunk) {
          sendChunk({ partial: textChunk });
        }
        logger.info(
          "Sent corpspeak chunk:",
          textChunk.substring(0, 50) + "...",
        );
      }
    }
    return { corpspeak: (await response).text };
  },
);

export const generateCorpspeak = onCallGenkit(
  {
    secrets: [geminiApiKey],
  },
  corpspeakGeneratorFlow,
);
