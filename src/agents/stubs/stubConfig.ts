export interface StubConfig {
  gate1Decision?: 'APPROVE' | 'REJECT';
  gate2Decision?: 'PASS' | 'ISSUES_FOUND';
  gate3Decision?: 'APPROVE' | 'REJECT';
  delayMs?: number;
  failAfterRetries?: number;
}

export const defaultStubConfig: StubConfig = {
  gate1Decision: 'APPROVE',
  gate2Decision: 'PASS',
  gate3Decision: 'APPROVE',
  delayMs: 800,
  failAfterRetries: 0,
};
