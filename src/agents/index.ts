import type { AgentMap } from '../lib/pipelineTypes';
import type { StubConfig } from './stubs/stubConfig';
import { defaultStubConfig } from './stubs/stubConfig';
import { createAgent1 } from './agent1';
import { createGate1 } from './gate1';
import { createAgent3Stub } from './stubs/agent3Stub';
import { createGate2Stub } from './stubs/gate2Stub';
import { createAgent5Stub } from './stubs/agent5Stub';
import { createGate3Stub } from './stubs/gate3Stub';
import { createAgent6Stub } from './stubs/agent6Stub';

export function createAgentMap(stubConfig?: Partial<StubConfig>): AgentMap {
  const config = { ...defaultStubConfig, ...stubConfig };

  return {
    agent1: createAgent1(),
    gate1: createGate1(),
    agent3: createAgent3Stub(config.delayMs),
    gate2: createGate2Stub(config),
    agent5: createAgent5Stub(config.delayMs),
    gate3: createGate3Stub(config),
    agent6: createAgent6Stub(config.delayMs),
  };
}
