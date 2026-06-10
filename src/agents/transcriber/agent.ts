import type { Language, Dialect } from "../../shared/types/index.js";
import { createServiceLogger } from "../../shared/logger.js";
import { selectPipeline, type TranscriberInput } from "./router.js";
import { transcriberRegistry, type TranscriberState, type TranscriberToolContext } from "./registry.js";

const log = createServiceLogger("transcriber-subagent");

export interface TranscriberSubagentResult {
  text: string;
  normalizedText: string;
  confidence: number;
  pipeline: string[];
}

export async function runTranscriberSubagent(
  input: TranscriberInput,
  ctx: { language: Language; dialect?: Dialect },
): Promise<TranscriberSubagentResult> {
  const pipeline = selectPipeline(input);

  log.info({ mode: input.mode, dialect: input.dialect, pipeline }, "Transcriber subagent selected pipeline");

  const toolCtx: TranscriberToolContext = {
    dialect: input.dialect,
    language: ctx.language,
  };

  let state: TranscriberState = {
    audioBase64: input.audioBase64,
    mimeType: input.mimeType,
    rawText: input.text ?? "",
    normalizedText: "",
    confidence: 1.0,
  };

  for (const toolName of pipeline) {
    const tool = transcriberRegistry[toolName];
    state = await tool(state, toolCtx);
  }

  return {
    text: state.rawText,
    normalizedText: state.normalizedText || state.rawText,
    confidence: state.transcriptionConfidence ?? state.confidence,
    pipeline,
  };
}
