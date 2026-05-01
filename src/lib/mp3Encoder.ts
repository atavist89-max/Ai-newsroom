const MP3_BITRATE = 128;

// lamejs is loaded via a classic <script> tag (public/lamejs/lame.all.js)
// to avoid Vite/Rollup CJS bundling issues with the MPEGMode dependency.
const _lamejs = (window as any).lamejs;
const Mp3Encoder = _lamejs?.Mp3Encoder as Mp3EncoderCtor;

interface Mp3EncoderCtor {
  new (channels: number, samplerate: number, kbps: number): Mp3EncoderInstance;
}

interface Mp3EncoderInstance {
  encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
  flush(): Int8Array;
}

export function createMp3Encoder(sampleRate: number): Mp3EncoderInstance {
  return new Mp3Encoder(2, sampleRate, MP3_BITRATE);
}

/**
 * Extract a single channel from an AudioBuffer as Int16Array.
 */
function extractChannelInt16(buffer: AudioBuffer, channelIndex: number): Int16Array {
  const floatData = buffer.getChannelData(channelIndex);
  const intData = new Int16Array(floatData.length);
  for (let i = 0; i < floatData.length; i++) {
    const s = Math.max(-1, Math.min(1, floatData[i]));
    intData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return intData;
}

/**
 * Encode an AudioBuffer to MP3 frames.
 * Mono buffers are automatically duplicated to stereo.
 */
export function encodeAudioBuffer(encoder: Mp3EncoderInstance, buffer: AudioBuffer): Int8Array {
  const left = extractChannelInt16(buffer, 0);
  const right = buffer.numberOfChannels > 1
    ? extractChannelInt16(buffer, 1)
    : left; // duplicate mono to stereo
  return encoder.encodeBuffer(left, right);
}

/**
 * Finalize the encoder and return the remaining MP3 frames.
 */
export function flushEncoder(encoder: Mp3EncoderInstance): Int8Array {
  return encoder.flush();
}
