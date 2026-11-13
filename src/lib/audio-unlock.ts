import { encodeWav } from "./wav";

/**
 * Phones only let a page play sound and read the microphone's level after
 * a tap. "Start samtalen" calls unlockAudio() inside that tap; the
 * conversation then uses the same audio element and audio context for
 * every turn. Browser only.
 */

let context: AudioContext | null = null;
let player: HTMLAudioElement | null = null;

/** Call synchronously inside a tap. */
export function unlockAudio(): void {
  context ??= new AudioContext();
  void context.resume().catch(() => undefined);
  if (!player) {
    player = new Audio(URL.createObjectURL(encodeWav(new Float32Array(160), 16_000)));
    void player.play().catch(() => undefined);
  }
}

export function sharedContext(): AudioContext {
  context ??= new AudioContext();
  return context;
}

export function sharedPlayer(): HTMLAudioElement {
  player ??= new Audio();
  return player;
}
