import type { AgentMap } from '../lib/pipelineTypes';
import { createArticleResearcher } from './articleResearcher';
import { createScriptWriter } from './scriptWriter';
import { createFullScriptEditor } from './fullScriptEditor';
import { createFullScriptWriter } from './fullScriptWriter';
import { createSegmentWriter } from './segmentWriter';
import { createSegmentEditor } from './segmentEditor';
import { createAssembler } from './assembler';
import { createAudioProducer } from './audioProducer';

export function createAgentMap(): AgentMap {
  return {
    articleResearch: createArticleResearcher(),
    scriptWriter: createScriptWriter(),
    fullScriptEditor: createFullScriptEditor(),
    fullScriptWriter: createFullScriptWriter(),
    segmentWriter: createSegmentWriter(),
    segmentEditor: createSegmentEditor(),
    assembler: createAssembler(),
    agent6: createAudioProducer(),
  };
}
