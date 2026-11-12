import { readVoices } from "@/domain/voices";
import { apiUser, failure } from "@/lib/conversation-api";
import { getAi } from "@/services/mistral";

/**
 * A short sample of a voice for the set-up. The sentence is fixed, so the
 * sample holds nothing personal and is made once per voice and kept in
 * memory: previews cost almost nothing, however often they are played.
 */

export const dynamic = "force-dynamic";

const SAMPLE = "Hej. Godt, at vi fik sat tid af til at tale sammen.";
const cache = new Map<string, Uint8Array>();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiUser())) return new Response(null, { status: 401 });
  const { id } = await params;
  const voice = readVoices().find((v) => v.id === id);
  if (!voice) return new Response(null, { status: 404 });
  try {
    let bytes = cache.get(voice.id);
    if (!bytes) {
      bytes = await getAi().speak(SAMPLE, voice.voiceId);
      cache.set(voice.id, bytes);
    }
    return new Response(bytes as BodyInit, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
    });
  } catch (error) {
    return failure("voice preview", error);
  }
}
