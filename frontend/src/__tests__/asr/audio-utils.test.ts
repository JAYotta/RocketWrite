/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { utils } from "@ricky0123/vad-react";

/**
 * Tests for WAV encoding using VAD library's built-in utils.encodeWAV
 */

describe("VAD Library - utils.encodeWAV", () => {
  it("should convert Float32Array to WAV ArrayBuffer", () => {
    const samples = new Float32Array([0.5, -0.5, 0.0, 0.8, -0.8]);
    const wavBuffer = utils.encodeWAV(samples);

    expect(wavBuffer).toBeInstanceOf(ArrayBuffer);
    expect(wavBuffer.byteLength).toBeGreaterThan(0);
  });

  it("should create WAV file for empty audio", () => {
    const samples = new Float32Array(0);
    const wavBuffer = utils.encodeWAV(samples);

    expect(wavBuffer).toBeInstanceOf(ArrayBuffer);
    // Should have at least WAV header (44 bytes minimum)
    expect(wavBuffer.byteLength).toBeGreaterThanOrEqual(44);
  });

  it("should create WAV file for large audio", () => {
    const samples = new Float32Array(16000); // 1 second at 16kHz
    const wavBuffer = utils.encodeWAV(samples);

    expect(wavBuffer).toBeInstanceOf(ArrayBuffer);
    // Should have header + data
    expect(wavBuffer.byteLength).toBeGreaterThan(44);
  });

  it("should handle audio samples at different amplitudes", async () => {
    const samples = new Float32Array([
      0.0, // Silence
      0.5, // Positive
      -0.5, // Negative
      1.0, // Max positive
      -1.0, // Max negative
      0.8, // High positive
      -0.8, // High negative
    ]);

    const wavBuffer = utils.encodeWAV(samples);
    const view = new DataView(wavBuffer);

    // Check WAV header (RIFF)
    expect(view.getUint8(0)).toBe(0x52); // 'R'
    expect(view.getUint8(1)).toBe(0x49); // 'I'
    expect(view.getUint8(2)).toBe(0x46); // 'F'
    expect(view.getUint8(3)).toBe(0x46); // 'F'

    // Check WAVE header
    expect(view.getUint8(8)).toBe(0x57); // 'W'
    expect(view.getUint8(9)).toBe(0x41); // 'A'
    expect(view.getUint8(10)).toBe(0x56); // 'V'
    expect(view.getUint8(11)).toBe(0x45); // 'E'
  });

  it("should convert ArrayBuffer to Blob for file upload", () => {
    const samples = new Float32Array([0.5, -0.5, 0.0]);
    const wavBuffer = utils.encodeWAV(samples);
    const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

    expect(wavBlob).toBeInstanceOf(Blob);
    expect(wavBlob.type).toBe("audio/wav");
    expect(wavBlob.size).toBe(wavBuffer.byteLength);
  });

  it("should work with default parameters (16kHz, mono, 16-bit)", () => {
    const samples = new Float32Array(100);
    const wavBuffer = utils.encodeWAV(samples);

    expect(wavBuffer).toBeInstanceOf(ArrayBuffer);
    // Default should be 16kHz, mono, 16-bit PCM
    const view = new DataView(wavBuffer);
    expect(view.getUint32(24, true)).toBe(16000); // Sample rate
    expect(view.getUint16(22, true)).toBe(1); // Mono
    expect(view.getUint16(34, true)).toBe(32); // 32-bit
  });
});
