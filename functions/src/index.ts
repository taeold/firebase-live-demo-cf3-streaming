/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { HttpsError } from "firebase-functions/https";
import { onCall } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

import { googleAI } from "@genkit-ai/googleai";
import { genkit } from "genkit";

defineSecret("GEMINI_API_KEY");

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

export const generateCorpspeak = onCall(async (req, res) => {
  const userInput = req.data.prompt;
  if (typeof userInput !== "string" || !userInput.trim()) {
    throw new HttpsError(
      "invalid-argument",
      'The function must be called with a non-empty "prompt" string.',
    );
  }

  const fullPrompt = createCorpspeakPrompt(userInput);

  if (req.acceptsStreaming) {
    logger.info("Streaming request accepted:", { prompt: userInput });
    try {
      const { stream, response } = ai.generateStream({
        prompt: fullPrompt,
      });
      for await (const chunk of stream) {
        res!.sendChunk({ partial: chunk.text });
      }
      return {
        completion: (await response).text,
      };
    } catch (error) {
      logger.error("Error during streaming generation:", error);
      throw new HttpsError(
        "internal",
        `Streaming generation failed: ${(error as any).message}`,
      );
    }
  } else {
    try {
      const response = await ai.generate({
        prompt: fullPrompt,
      });
      return {
        completion: response.text,
      };
    } catch (error) {
      logger.error("Error during non-streaming generation:", error);
      throw new HttpsError(
        "internal",
        `Non-streaming generation failed: ${(error as any).message}`,
      );
    }
  }
});
