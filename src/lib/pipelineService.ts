import { registerPlugin } from '@capacitor/core';

export interface PipelineServicePlugin {
  start(): Promise<{ success: boolean }>;
  update(options: { status: string }): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
}

const PipelineServiceNative = registerPlugin<PipelineServicePlugin>('PipelineService');

let isRunning = false;

export const PipelineService = {
  async start(): Promise<void> {
    try {
      await PipelineServiceNative.start();
      isRunning = true;
    } catch (err) {
      console.warn('PipelineService.start failed:', err);
    }
  },

  async update(status: string): Promise<void> {
    if (!isRunning) return;
    try {
      await PipelineServiceNative.update({ status });
    } catch (err) {
      console.warn('PipelineService.update failed:', err);
    }
  },

  async stop(): Promise<void> {
    if (!isRunning) return;
    try {
      await PipelineServiceNative.stop();
      isRunning = false;
    } catch (err) {
      console.warn('PipelineService.stop failed:', err);
    }
  },
};
