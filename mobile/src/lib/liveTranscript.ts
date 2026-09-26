import type { ConvLine } from '../components/Conversation';
import { COMPANION_REPLY, SMILE_REPLY } from '../data/journal';
import type { AppStateSnapshot } from '../store/app';

export type LiveSection = { kind: 'talk' | 'journal'; time: string; lines: ConvLine[]; calmDivider?: string };

/**
 * What the parent reads as "Today" (transcript ?id=live): this session's Talk conversation — cut at the moment
 * calm mode started (nothing from the AI after it) — and any journal entries, each as prompt → answer → reply.
 */
export function liveSections(s: Pick<AppStateSnapshot, 'messages' | 'journal' | 'calmMode' | 'calmAt'>): LiveSection[] {
  const out: LiveSection[] = [];
  if (s.messages.length) {
    out.push({
      kind: 'talk',
      time: s.calmAt ?? 'Today',
      lines: s.messages.map((m) => ({ id: m.id, from: m.from, text: m.text, card: m.card })),
      calmDivider: s.calmMode !== 'off' ? s.calmAt ?? '' : undefined,
    });
  }
  s.journal.forEach((j, i) => {
    out.push({
      kind: 'journal',
      time: j.at,
      lines: [
        { id: `jp${i}`, from: 'companion', text: j.prompt },
        { id: `jt${i}`, from: 'me', text: j.text },
        { id: `jr${i}`, from: 'companion', card: true, text: /smile/i.test(j.prompt) ? SMILE_REPLY : COMPANION_REPLY },
      ],
    });
  });
  return out;
}
