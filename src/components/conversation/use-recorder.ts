"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toWav } from "@/lib/wav";

/**
 * The microphone: tap to start, tap again to stop. Hands back a WAV. The
 * stream is released after every turn, so the browser's microphone light
 * is only on while the person speaks. Stops by itself at the turn's limit.
 */

export type RecorderError = "denied" | "missing" | "failed";

export function useRecorder(maxSeconds: number, onAutoStop: (wav: Blob | null) => void) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<RecorderError | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const resolve = useRef<((wav: Blob | null) => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auto = useRef(onAutoStop);
  useEffect(() => {
    auto.current = onAutoStop;
  }, [onAutoStop]);

  const release = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    recorder.current = null;
    setRecording(false);
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("missing");
      return false;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch (e) {
      const name = (e as DOMException).name;
      setError(name === "NotFoundError" ? "missing" : "denied");
      return false;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    rec.onstop = async () => {
      // Stopped by the person (stop()) or by the turn's time limit.
      const done = resolve.current ?? auto.current;
      resolve.current = null;
      release();
      try {
        const blob = new Blob(chunks, { type: rec.mimeType });
        done?.(blob.size > 0 ? await toWav(blob) : null);
      } catch {
        setError("failed");
        done?.(null);
      }
    };
    recorder.current = rec;
    rec.start();
    setRecording(true);
    timer.current = setTimeout(() => rec.state === "recording" && rec.stop(), maxSeconds * 1000);
    return true;
  }, [maxSeconds, release]);

  /** Stops and resolves with the recording as WAV, or null when nothing was heard. */
  const stop = useCallback((): Promise<Blob | null> => {
    const rec = recorder.current;
    if (!rec || rec.state !== "recording") return Promise.resolve(null);
    return new Promise((r) => {
      resolve.current = r;
      rec.stop();
    });
  }, []);

  return { recording, error, start, stop };
}
