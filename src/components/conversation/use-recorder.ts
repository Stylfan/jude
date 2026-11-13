"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sharedContext } from "@/lib/audio-unlock";
import { toWav } from "@/lib/wav";

/**
 * The microphone for a spoken conversation. The person taps once; after
 * that Jude listens, hears when they have finished speaking (a short
 * silence after speech), and hands back the turn as WAV. The stream stays
 * open for the whole conversation, so the browser asks only once, and is
 * released when the conversation ends.
 */

export type RecorderError = "denied" | "missing" | "failed";

/** How long a pause after speech ends the turn. */
const SILENCE_MS = 1300;
/** Speech must last this long to count, so a cough or a click does not. */
const SPEECH_MS = 250;
/** With no speech at all for this long, the microphone stops listening. */
const NOTHING_MS = 12_000;
/** The first moment measures the room, so the threshold follows the noise. */
const CALIBRATE_MS = 300;
const TICK_MS = 50;

function level(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (const v of buffer) sum += v * v;
  return Math.sqrt(sum / buffer.length);
}

export function useRecorder(maxSeconds: number, onTurn: (wav: Blob | null) => void) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<RecorderError | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const heard = useRef(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const turn = useRef(onTurn);
  useEffect(() => {
    turn.current = onTurn;
  }, [onTurn]);

  const stopTicker = () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  };

  /** Ends the conversation's use of the microphone. */
  const close = useCallback(() => {
    stopTicker();
    const rec = recorder.current;
    recorder.current = null;
    if (rec && rec.state === "recording") {
      rec.onstop = null;
      rec.stop();
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    source.current?.disconnect();
    source.current = null;
    analyser.current = null;
    setRecording(false);
  }, []);

  useEffect(() => close, [close]);

  const open = useCallback(async (): Promise<boolean> => {
    const ctx = sharedContext();
    if (stream.current) {
      await ctx.resume().catch(() => undefined);
      return true;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("missing");
      return false;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch (e) {
      setError((e as DOMException).name === "NotFoundError" ? "missing" : "denied");
      return false;
    }
    const node = ctx.createAnalyser();
    node.fftSize = 1024;
    source.current = ctx.createMediaStreamSource(stream.current);
    source.current.connect(node);
    analyser.current = node;
    await ctx.resume().catch(() => undefined);
    return true;
  }, []);

  /** Starts listening for one turn. Resolves false when the microphone cannot be used. */
  const listen = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (recorder.current) return true;
    if (!(await open()) || !stream.current) return false;

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream.current);
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    rec.onstop = async () => {
      stopTicker();
      recorder.current = null;
      setRecording(false);
      if (!heard.current || chunks.length === 0) {
        turn.current(null);
        return;
      }
      try {
        turn.current(await toWav(new Blob(chunks, { type: rec.mimeType })));
      } catch {
        setError("failed");
        turn.current(null);
      }
    };
    recorder.current = rec;
    heard.current = false;
    rec.start();
    setRecording(true);

    const node = analyser.current;
    const buffer = new Float32Array(node?.fftSize ?? 1024);
    const began = Date.now();
    let noise = 0;
    let samples = 0;
    let loudSince = 0;
    let lastLoud = 0;
    ticker.current = setInterval(() => {
      if (rec.state !== "recording") return stopTicker();
      const now = Date.now();
      const elapsed = now - began;
      if (elapsed > maxSeconds * 1000) return rec.stop();
      if (!node) return;
      const rms = level(node, buffer);
      if (elapsed < CALIBRATE_MS) {
        noise = (noise * samples + rms) / ++samples;
        return;
      }
      const loud = rms > Math.max(0.012, noise * 2.5);
      if (loud) {
        loudSince ||= now;
        lastLoud = now;
        if (now - loudSince >= SPEECH_MS) heard.current = true;
      } else {
        loudSince = 0;
      }
      if (heard.current && now - lastLoud > SILENCE_MS) rec.stop();
      else if (!heard.current && elapsed > NOTHING_MS) rec.stop();
    }, TICK_MS);
    return true;
  }, [maxSeconds, open]);

  /** Sends what has been said now, without waiting for the pause. */
  const send = useCallback(() => {
    const rec = recorder.current;
    if (!rec || rec.state !== "recording") return;
    heard.current = true;
    rec.stop();
  }, []);

  return { recording, error, listen, send, close };
}
