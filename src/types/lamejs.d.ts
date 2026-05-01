// lamejs is loaded via a classic <script> tag to avoid Vite CJS bundling issues.
declare global {
  interface Window {
    lamejs: {
      Mp3Encoder: {
        new (channels: number, samplerate: number, kbps: number): {
          encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
          flush(): Int8Array;
        };
      };
    };
  }
}

export {};
