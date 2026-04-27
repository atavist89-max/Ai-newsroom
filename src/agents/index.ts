import type { AgentMap } from '../lib/pipelineTypes';
import type { StubConfig } from './stubs/stubConfig';
import { defaultStubConfig } from './stubs/stubConfig';
import { createAgent1Stub } from './stubs/agent1Stub';
import { createGate1Stub } from './stubs/gate1Stub';
import { createAgent3Stub } from './stubs/agent3Stub';
import { createGate2Stub } from './stubs/gate2Stub';
import { createAgent5Stub } from './stubs/agent5Stub';
import { createGate3Stub } from './stubs/gate3Stub';

export function createAgentMap(stubConfig?: Partial<StubConfig>): AgentMap {
  const config = { ...defaultStubConfig, ...stubConfig };

  return {
    agent1: createAgent1Stub(config.delayMs),
    gate1: createGate1Stub(config),
    agent3: createAgent3Stub(config.delayMs),
    gate2: createGate2Stub(config),
    agent5: createAgent5Stub(config.delayMs),
    gate3: createGate3Stub(config),
  };
}
