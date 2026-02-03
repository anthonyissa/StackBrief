/**
 * Paid advertisement tagging utilities.
 *
 * Goal: when text contains sentences that look like paid promos, prefix those
 * sentences with a tag like "[PUB] ".
 */

export function tagPaidAdvertisementSentences(
  text: string,
  tag: string = "[PUB]"
): string {
  if (!text || text.trim().length === 0) return text;

  const segments = splitIntoSentenceSegments(text);
  return segments
    .map((segment) => tagSentenceSegmentIfNeeded(segment, tag))
    .join("");
}

function tagSentenceSegmentIfNeeded(segment: string, tag: string): string {
  const match = segment.match(/^(\s*)([\s\S]*)$/);
  const leading = match?.[1] ?? "";
  const body = match?.[2] ?? segment;
  const trimmed = body.trimStart();

  // Avoid double tagging.
  if (trimmed.startsWith(tag)) return segment;

  // If the sentence looks like an ad, insert tag after leading whitespace.
  if (isLikelyPaidAdvertisementSentence(trimmed)) {
    return `${leading}${tag} ${body.slice(body.length - trimmed.length)}`;
  }

  return segment;
}

function isLikelyPaidAdvertisementSentence(sentence: string): boolean {
  const s = normalizeForMatch(sentence);
  if (s.length < 18) return false;

  // Fast exclusions: common non-ad boilerplate.
  if (/\b(not\s+sponsored|non[-\s]?sponsored|no\s+sponsor)\b/.test(s)) return false;

  const hasUrl = /(https?:\/\/\S+|www\.\S+)/.test(s);
  const hasAdHashtag = /(^|[\s(])#(ad|pub|sponsored|partenariat|publicite)(\b|[)\s.,!?:;])/.test(
    s
  );

  let score = 0;

  // Strong explicit signals.
  if (/\b(sponsored|sponsorise|advertisement|publicite|paid\s+partnership|partenariat\s+remunere)\b/.test(s)) {
    score += 4;
  }
  if (hasAdHashtag) score += 4;

  // Affiliate / referral / promo-code signals.
  if (/\b(affiliate|affiliation|referral|parrainage)\b/.test(s)) score += 2;
  if (
    /\b(promo\s*code|code\s+promo|coupon\s*code|discount\s*code|use\s+(?:my\s+)?code|utilise(?:z)?\s+(?:mon\s+)?code)\b/.test(
      s
    )
  ) {
    score += 3;
  }

  // Discount / price signals.
  if (/\b(\d{1,2}%\s*off|-\s*\d{1,2}%|save\s+\d{1,2}%|economise(?:z)?\s+\d{1,2}%|reduction)\b/.test(s)) {
    score += 2;
  }
  if (/\b(save\s+\$?\d+|economise(?:z)?\s+\$?\d+)\b/.test(s)) score += 1;

  // Call-to-action signals.
  if (
    /\b(buy\s+now|shop\s+now|order\s+now|get\s+started|sign\s+up|subscribe|download|start\s+free\s+trial|free\s+trial|inscris[-\s]?toi|inscrivez[-\s]?vous|abonne[-\s]?toi|abonnez[-\s]?vous|telecharge(?:z)?)\b/.test(
      s
    )
  ) {
    score += 1;
  }

  // If there's a URL plus any other signal, bump score.
  if (hasUrl) score += 1;

  // Typical promo urgency.
  if (/\b(limited\s+time|offer\s+ends|only\s+today|while\s+supplies\s+last|offre\s+limitee|valable\s+jusqu)\b/.test(s)) {
    score += 1;
  }

  // Decision threshold:
  // - 4+: explicit sponsorship/hashtag/promocode
  // - 3+: likely promo (e.g., URL + discount)
  // - 2+: only if URL present (avoid tagging normal content with a single weak keyword)
  if (score >= 4) return true;
  if (score >= 3) return true;
  if (score >= 2 && hasUrl) return true;
  return false;
}

function normalizeForMatch(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function splitIntoSentenceSegments(text: string): string[] {
  // Use Intl.Segmenter when available (Bun/Node support it).
  // It keeps punctuation + whitespace attached to each segment, which helps
  // preserve the original formatting when joining.
  const Segmenter = (Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity: "sentence" }
    ) => { segment: (input: string) => Iterable<{ segment: string }> };
  }).Segmenter;

  if (typeof Segmenter === "function") {
    const segmenter = new Segmenter(undefined, { granularity: "sentence" });
    return Array.from(segmenter.segment(text), (x) => x.segment);
  }

  // Fallback: split on sentence terminators but keep them.
  const parts: string[] = [];
  const re = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+(?:$)/g;
  for (const match of text.matchAll(re)) {
    parts.push(match[0]);
  }
  return parts.length > 0 ? parts : [text];
}

