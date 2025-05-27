import "./style.css";
import { generateCorpspeak } from "./callable.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>Corpspeak 💼</h1>
  <p class="instructions">Enter your plain English, and we'll "strategically enhance" it with enterprise-level "synergy."
      <br>See the TTFB (Time To First Byte) difference with streaming!</p>

  <div class="main-controls">
      <label for="userInput" style="display:block; margin-bottom:5px; font-weight:bold; text-align: left;">Your Plain English:</label>
      <textarea id="userInput" rows="4" placeholder="e.g., We need to finish the project. Let's have a meeting. The server is down."></textarea>
      <div class="button-group">
          <button id="btnNonStreaming">Jargonize (Standard)</button>
          <button id="btnStreaming">Jargonize (Stream Live)</button>
          <button id="btnImFeelingLucky" class="lucky-button">💡 I'm Feeling Synergistic!</button>
      </div>
  </div>

  <div class="container">
      <div class="column">
          <h2>Standard Corpspeak Output:</h2>
          <div class="timer" id="timerNonStreaming">TTFB: --- ms</div>
          <pre id="outputNonStreaming">(Awaiting strategic imperatives...)</pre>
      </div>
      <div class="column">
          <h2>Streamed Corpspeak Output:</h2>
          <div class="timer" id="timerStreaming">TTFB: --- ms</div>
          <pre id="outputStreaming">(Preparing for dynamic paradigm shifts...)</pre>
      </div>
  </div>
`;

const userInputElement = document.getElementById(
  "userInput",
) as HTMLTextAreaElement;
const outputNonStreamingDiv = document.getElementById(
  "outputNonStreaming",
) as HTMLPreElement;
const outputStreamingDiv = document.getElementById(
  "outputStreaming",
) as HTMLPreElement;
const btnNonStreaming = document.getElementById(
  "btnNonStreaming",
) as HTMLButtonElement;
const btnStreaming = document.getElementById(
  "btnStreaming",
) as HTMLButtonElement;
const btnImFeelingLucky = document.getElementById(
  "btnImFeelingLucky",
) as HTMLButtonElement;
const timerNonStreamingDiv = document.getElementById(
  "timerNonStreaming",
) as HTMLDivElement;
const timerStreamingDiv = document.getElementById(
  "timerStreaming",
) as HTMLDivElement;

const samplePrompts: string[] = [
  "We need to fix this bug quickly.",
  "Let's have a meeting to discuss the new marketing plan.",
  "The website is slow.",
  "Our sales numbers are down this quarter.",
  "We should hire more developers.",
  "Can you send me the report?",
  "The coffee machine is broken again.",
  "We need to cut costs.",
  "Let's brainstorm some new ideas for the product.",
  "The customer is unhappy with the service.",
];

let nonStreamingStartTime: number | undefined;
let streamingStartTime: number | undefined;
let nonStreamingOpInProgress = false;
let streamingOpInProgress = false;

function setLoading(isLoading: boolean) {
  btnNonStreaming.disabled = isLoading;
  btnStreaming.disabled = isLoading;
  btnImFeelingLucky.disabled = isLoading;
}

function updateTimerDisplay(
  timerDiv: HTMLDivElement,
  startTimeValue?: number,
  status: "running" | "stopped" | "reset" = "running",
) {
  if (status === "stopped" && startTimeValue !== undefined) {
    const duration = (performance.now() - startTimeValue).toFixed(1);
    timerDiv.textContent = `TTFB: ${duration} ms`;
  } else if (status === "running") {
    timerDiv.textContent = `TTFB: Measuring...`;
  } else {
    // reset
    timerDiv.textContent = `TTFB: --- ms`;
  }
}

// --- Request Handler Functions ---
async function handleNonStreamingRequest(promptText: string) {
  if (!promptText.trim()) {
    if (!streamingOpInProgress) setLoading(false);
    return;
  }

  nonStreamingOpInProgress = true;
  outputNonStreamingDiv.textContent = "Leveraging core competencies...";
  updateTimerDisplay(timerNonStreamingDiv, undefined, "reset");

  nonStreamingStartTime = performance.now();
  updateTimerDisplay(timerNonStreamingDiv, nonStreamingStartTime, "running");

  try {
    const result = await generateCorpspeak({ prompt: promptText });
    if (nonStreamingOpInProgress) {
      updateTimerDisplay(
        timerNonStreamingDiv,
        nonStreamingStartTime,
        "stopped",
      );
    }
    outputNonStreamingDiv.textContent = result.data.completion;
  } catch (error: any) {
    if (nonStreamingOpInProgress) {
      updateTimerDisplay(
        timerNonStreamingDiv,
        nonStreamingStartTime,
        "stopped",
      );
    }
    console.error("Error non-streaming corpspeak:", error);
    outputNonStreamingDiv.textContent = `Error: ${error.message || String(error)}`;
  } finally {
    nonStreamingOpInProgress = false;
    if (!streamingOpInProgress) {
      setLoading(false);
    }
  }
}

async function handleStreamingRequest(promptText: string) {
  if (!promptText.trim()) {
    if (!nonStreamingOpInProgress) setLoading(false);
    return;
  }

  streamingOpInProgress = true;
  outputStreamingDiv.textContent = "Initiating proactive synergy stream...";
  updateTimerDisplay(timerStreamingDiv, undefined, "reset");

  let streamedContent = "";
  streamingStartTime = performance.now();
  updateTimerDisplay(timerStreamingDiv, streamingStartTime, "running");
  let firstChunkReceived = false; // Tracks if TTFB for stream has been recorded

  try {
    const { stream: resultStream, data: dataPromise } =
      await generateCorpspeak.stream({ prompt: promptText });

    streamedContent = "";
    outputStreamingDiv.textContent = streamedContent;

    for await (const chunkData of resultStream) {
      if (!firstChunkReceived && chunkData.partial) {
        updateTimerDisplay(timerStreamingDiv, streamingStartTime, "stopped");
        firstChunkReceived = true;
      }

      if (chunkData.partial) {
        streamedContent += chunkData.partial;
      }
      outputStreamingDiv.textContent = streamedContent.trim();
    }

    if (!firstChunkReceived && streamingOpInProgress) {
      updateTimerDisplay(timerStreamingDiv, streamingStartTime, "stopped");
    }

    const finalResult = await dataPromise;
    outputStreamingDiv.textContent =
      streamedContent.trim() + `\n(Final object: ${finalResult.completion})`;
  } catch (error: any) {
    if (!firstChunkReceived && streamingOpInProgress) {
      updateTimerDisplay(timerStreamingDiv, streamingStartTime, "stopped");
    }
    console.error("Error streaming corpspeak:", error);
    outputStreamingDiv.textContent = `Error: ${error.message || String(error)}`;
  } finally {
    streamingOpInProgress = false;
    if (!nonStreamingOpInProgress) {
      // Only re-enable buttons if the other process is also done
      setLoading(false);
    }
  }
}

// --- Event Listeners ---
btnNonStreaming.addEventListener("click", () => {
  if (nonStreamingOpInProgress || streamingOpInProgress) return; // Prevent multiple clicks if already running
  setLoading(true);
  handleNonStreamingRequest(userInputElement.value);
});

btnStreaming.addEventListener("click", () => {
  if (nonStreamingOpInProgress || streamingOpInProgress) return;
  setLoading(true);
  handleStreamingRequest(userInputElement.value);
});

btnImFeelingLucky.addEventListener("click", async () => {
  if (nonStreamingOpInProgress || streamingOpInProgress) {
    console.log("Operations already in progress. Please wait.");
    return;
  }

  const randomIndex = Math.floor(Math.random() * samplePrompts.length);
  const luckyPrompt = samplePrompts[randomIndex];
  userInputElement.value = luckyPrompt;

  outputNonStreamingDiv.textContent = "(Awaiting strategic imperatives...)";
  updateTimerDisplay(timerNonStreamingDiv, undefined, "reset");
  outputStreamingDiv.textContent = "(Preparing for dynamic paradigm shifts...)";
  updateTimerDisplay(timerStreamingDiv, undefined, "reset");

  setLoading(true); // Disable all buttons at the start

  nonStreamingOpInProgress = false;
  streamingOpInProgress = false;

  const nonStreamingOp = handleNonStreamingRequest(luckyPrompt);
  const streamingOp = handleStreamingRequest(luckyPrompt);

  // Await both operations to complete.
  // The finally blocks within each handler will manage the setLoading(false) call
  // when *both* are confirmed to be done.
  try {
    await Promise.allSettled([nonStreamingOp, streamingOp]);
  } catch (e) {
    console.warn(
      "One or both 'I'm feeling lucky' operations encountered an issue.",
      e,
    );
  }
  // Redundant setLoading(false) here might cause issues if one handler's finally block
  // hasn't run yet. The individual handlers are better suited to manage this.
});

// --- Initial Checks (Optional) ---
if (
  typeof generateCorpspeak !== "function" ||
  typeof (generateCorpspeak as any).stream !== "function"
) {
  console.error(
    "generateCorpspeak or generateCorpspeak.stream is not correctly imported or defined.",
  );
  outputNonStreamingDiv.textContent =
    "ERROR: Callable function not loaded. Check console.";
  outputStreamingDiv.textContent =
    "ERROR: Callable function not loaded. Check console.";
  setLoading(true);
}
