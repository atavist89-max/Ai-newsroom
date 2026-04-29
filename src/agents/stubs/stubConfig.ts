export interface StubConfig {
  gate1Decision?: 'APPROVED' | 'REJECTED';
  gate2Decision?: 'PASS' | 'ISSUES_FOUND';
  gate3Decision?: 'APPROVED' | 'REJECTED';
  delayMs?: number;
  failAfterRetries?: number;
}

export const defaultStubConfig: StubConfig = {
  gate1Decision: 'APPROVED',
  gate2Decision: 'PASS',
  gate3Decision: 'APPROVED',
  delayMs: 800,
  failAfterRetries: 0,
};
