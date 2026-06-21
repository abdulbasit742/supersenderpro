'use strict';

const DISC_TYPES = ['D', 'I', 'S', 'C'];

const DISC_PATTERNS = {
  D: [
    /\b(now|asap|immediately|quickly|fast|quick|urgent|hurry|deadline|bottom[ -]?line|results?|get it done|make it happen|just do it|how much|price|cost|deal|decide|final|close|win|best|leader|control|boss)\b/gi,
    /!{2,}/g,
    /^(ok|yes|no|send|do it|confirm|proceed|done|next|go)\b/gim,
    /\b(i want|i need|give me|tell me|show me|i decided|my decision)\b/gi,
  ],
  I: [
    /\b(amazing|awesome|fantastic|wonderful|excited|love|great|brilliant|incredible|wow|yes+|fun|enjoy|together|team|friend|everyone|celebrate|imagine|dream|idea|creative|inspire|feel|vibe|energy|positive|happy|cool|nice)\b/gi,
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
    /\b(by the way|speaking of|you know what|let me tell you|story|experience|honestly|personally|between us)\b/gi,
    /\b(i feel|i think we|together we|lets|let's|we can|we should|what if we)\b/gi,
  ],
  S: [
    /\b(please|thank you|thanks|appreciate|understand|help|support|care|concern|comfortable|safe|stable|consistent|reliable|trust|honest|fair|family|team|together|we|us|everyone|agree|happy to|no problem|sure|whenever|take your time|no rush|feel free|let me know)\b/gi,
    /\b(how are you|hope you|just checking|wanted to make sure|making sure|is everything ok|are you comfortable|does that work for you|what do you think|your opinion|your preference)\b/gi,
    /\b(i hope|i want to make sure|i just wanted|maybe we could|perhaps|possibly|if that's ok|if you don't mind)\b/gi,
  ],
  C: [
    /\b(data|analysis|report|detail|specific|exact|precise|accurate|fact|evidence|proof|research|study|statistics?|percent|number|figure|metric|kpi|benchmark|compare|review|audit|verify|confirm|specification|requirement|criteria|standard|process|procedure|step|phase|timeline|schedule|plan|structure|system|method|technically|specifically|exactly|according to|based on|reference|source)\b/gi,
    /\b(why|how does|how exactly|what is the|explain|clarify|documentation|terms and conditions|contract|guarantee|warranty|track record|case study|example|proof of|what are the steps)\b/gi,
    /\b(however|although|on the other hand|furthermore|in addition|to be precise|to clarify|as per|regarding|with respect to|in terms of)\b/gi,
    /\?\s*$|\?\s+/gm,
  ],
};

const STRUCTURE_PATTERNS = {
  D: [/^[A-Z][^.!?]*[.!]$/gm],
  I: [/\.{3}/g],
  S: [/\b(we|our|us|together|everyone)\b/gi],
  C: [/\([^)]+\)/g, /\b\d+(\.\d+)?%|\b\d{4,}\b/g],
};

const DISC_PROFILES = {
  D: {
    label: 'Dominant Driver',
    shortLabel: 'Driver',
    description: 'Direct, decisive, results-focused, and impatient with unclear next steps.',
    communicationTips: [
      'Keep the reply short and lead with the result.',
      'Give clear options, price, deadline, and next action.',
      'Use confident wording and avoid weak or vague phrases.',
      'Reply quickly and remove unnecessary back-and-forth.',
    ],
    salesApproach: 'Lead with outcome, speed, ROI, and a direct call to action.',
    avoidWith: [
      'Long explanations before the price.',
      'Slow replies without reason.',
      'Excessive small talk.',
      'Unclear next steps.',
    ],
  },
  I: {
    label: 'Influential Expresser',
    shortLabel: 'Expresser',
    description: 'Warm, social, enthusiastic, and motivated by stories, status, and excitement.',
    communicationTips: [
      'Match their energy and keep the message friendly.',
      'Use social proof, stories, and simple visuals.',
      'Make the offer feel exciting and easy to share.',
      'Follow up conversationally instead of mechanically.',
    ],
    salesApproach: 'Sell the vision, testimonial, and positive experience around the offer.',
    avoidWith: [
      'Cold robotic replies.',
      'Too many technical details first.',
      'Ignoring their excitement.',
      'Purely transactional language.',
    ],
  },
  S: {
    label: 'Steady Supporter',
    shortLabel: 'Supporter',
    description: 'Patient, trust-driven, loyal, and careful before committing.',
    communicationTips: [
      'Be calm, patient, and reassuring.',
      'Mention support, warranty, and what happens after purchase.',
      'Use gentle follow-ups and partnership language.',
      'Give them enough time without pressure.',
    ],
    salesApproach: 'Build trust with reliability, support, and low-risk next steps.',
    avoidWith: [
      'Aggressive closing.',
      'Sudden changes to the offer.',
      'Pressure or ultimatums.',
      'Making them feel like just another order.',
    ],
  },
  C: {
    label: 'Conscientious Analyzer',
    shortLabel: 'Analyzer',
    description: 'Detail-oriented, evidence-driven, careful, and likely to ask many questions.',
    communicationTips: [
      'Answer each question precisely.',
      'Provide proof, specs, comparisons, and policy details.',
      'Use numbers and exact terms.',
      'Avoid exaggeration and check every claim before sending.',
    ],
    salesApproach: 'Build a logical case with evidence, comparisons, and transparent terms.',
    avoidWith: [
      'Vague claims without proof.',
      'Rushing the decision.',
      'Skipping technical details.',
      'Inconsistent pricing or policy wording.',
    ],
  },
};

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => String(message || '').trim())
    .filter(Boolean)
    .slice(0, 200);
}

function countMatches(text, patterns) {
  return patterns.reduce((total, pattern) => {
    const fresh = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(fresh);
    return total + (matches ? matches.length : 0);
  }, 0);
}

function scoreMessages(messages) {
  const fullText = messages.join(' ');
  const scores = { D: 0, I: 0, S: 0, C: 0 };

  DISC_TYPES.forEach((type) => {
    scores[type] += countMatches(fullText, DISC_PATTERNS[type]);
    scores[type] += countMatches(fullText, STRUCTURE_PATTERNS[type]) * 0.5;
  });

  const wordCounts = messages.map((message) => message.split(/\s+/).filter(Boolean).length);
  const avgWordCount = wordCounts.reduce((sum, count) => sum + count, 0) / Math.max(wordCounts.length, 1);
  if (avgWordCount < 8) scores.D += 3;
  if (avgWordCount > 25) scores.C += 3;
  if (avgWordCount >= 10 && avgWordCount <= 25) scores.I += 1;

  const questionRatio = messages.filter((message) => message.trim().endsWith('?')).length / Math.max(messages.length, 1);
  if (questionRatio > 0.4) scores.C += 4;

  const exclamationRatio = messages.filter((message) => message.trim().endsWith('!')).length / Math.max(messages.length, 1);
  if (exclamationRatio > 0.3) {
    scores.D += 2;
    scores.I += 2;
  }

  return scores;
}

function normalizeScores(rawScores) {
  const total = DISC_TYPES.reduce((sum, type) => sum + rawScores[type], 0);
  if (!total) return { D: 25, I: 25, S: 25, C: 25 };
  const normalized = {};
  DISC_TYPES.forEach((type) => {
    normalized[type] = Math.round((rawScores[type] / total) * 100);
  });
  return normalized;
}

function rankTypes(scores) {
  return DISC_TYPES.slice().sort((a, b) => scores[b] - scores[a]);
}

function confidenceFor(normalizedScores, primaryType, messageCount) {
  const primaryScore = normalizedScores[primaryType] || 0;
  if (messageCount < 3) return 'low';
  if (primaryScore >= 45) return 'high';
  if (primaryScore >= 32) return 'medium';
  return 'low';
}

function buildSegments(normalizedScores) {
  return DISC_TYPES.map((type) => ({
    type,
    label: DISC_PROFILES[type].shortLabel,
    score: normalizedScores[type],
  })).sort((a, b) => b.score - a.score);
}

function analyzeClientPersonality(options = {}) {
  const messages = cleanMessages(options.messages);
  const rawScores = scoreMessages(messages);
  const normalizedScores = normalizeScores(rawScores);
  const ranked = rankTypes(normalizedScores);
  const primaryType = ranked[0] || 'S';
  const secondaryType = normalizedScores[ranked[1]] >= 20 ? ranked[1] : null;
  const profile = DISC_PROFILES[primaryType];
  const confidence = confidenceFor(normalizedScores, primaryType, messages.length);

  return {
    clientId: options.clientId || null,
    primaryType,
    secondaryType,
    scores: rawScores,
    normalizedScores,
    confidence,
    label: profile.label,
    description: profile.description,
    communicationTips: profile.communicationTips,
    salesApproach: profile.salesApproach,
    avoidWith: profile.avoidWith,
    segments: buildSegments(normalizedScores),
    messageCount: messages.length,
    analyzedAt: new Date().toISOString(),
    source: options.source || 'manual',
  };
}

function parseWhatsAppChat(rawChat, senderName) {
  const raw = String(rawChat || '');
  const lines = raw.split(/\r?\n/);
  const messages = [];
  const strictPattern = /^(\[?\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\]?)\s[-–]\s(.+?):\s(.+)$/;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const match = trimmed.match(strictPattern);
    let sender = null;
    let body = trimmed;
    if (match) {
      sender = match[2].trim();
      body = match[3].trim();
    } else {
      const loose = trimmed.match(/^([^:]{2,60}):\s(.+)$/);
      if (loose) {
        sender = loose[1].trim();
        body = loose[2].trim();
      }
    }

    if (senderName && sender && !sender.toLowerCase().includes(String(senderName).toLowerCase())) return;
    if (/^<media omitted>$/i.test(body)) return;
    if (/end-to-end encrypted/i.test(body)) return;
    if (body.toLowerCase() === 'null') return;
    messages.push(body);
  });

  return messages;
}

function getDISCProfiles() {
  return DISC_TYPES.reduce((map, type) => {
    map[type] = Object.assign({ type }, DISC_PROFILES[type]);
    return map;
  }, {});
}

function buildReplyGuidance(result) {
  const profile = DISC_PROFILES[result.primaryType] || DISC_PROFILES.S;
  return {
    primaryType: result.primaryType,
    label: profile.label,
    openWith: {
      D: 'Direct result first, then price and next step.',
      I: 'Warm hook, social proof, then easy next step.',
      S: 'Reassurance first, then support details and gentle next step.',
      C: 'Exact answer first, then proof, policy, and comparison.',
    }[result.primaryType],
    tips: profile.communicationTips,
    avoidWith: profile.avoidWith,
    salesApproach: profile.salesApproach,
  };
}

function buildTailoredReplyDraft(options = {}) {
  const result = options.profile && options.profile.primaryType
    ? options.profile
    : analyzeClientPersonality({ messages: [options.customerMessage || ''], source: 'draft' });
  const type = result.primaryType || 'S';
  const offer = String(options.offer || 'your selected plan').trim();
  const message = String(options.customerMessage || '').trim();

  const templates = {
    D: `Short answer: ${offer} is ready. Price and delivery are clear; reply YES and I will move it to the next step.`,
    I: `Nice choice. ${offer} is a strong option and customers like it because it feels simple and quick. Reply YES and I will guide you.`,
    S: `Yes, I can help with ${offer}. I will keep the process simple, explain support clearly, and guide you step by step. Reply YES when you are comfortable.`,
    C: `${offer} can work for your requirement. I can share exact price, delivery time, warranty terms, and comparison before you decide.`,
  };

  return {
    ok: true,
    dryRun: true,
    liveSend: false,
    channel: 'chat_preview',
    detectedType: type,
    confidence: result.confidence,
    customerMessagePreview: message.slice(0, 240),
    messagePreview: templates[type],
    guidance: buildReplyGuidance(result),
    warnings: result.confidence === 'low' ? ['Low confidence: collect more customer messages before relying on this style.'] : [],
    blockers: [],
  };
}

module.exports = {
  DISC_TYPES,
  DISC_PROFILES,
  analyzeClientPersonality,
  parseWhatsAppChat,
  getDISCProfiles,
  buildReplyGuidance,
  buildTailoredReplyDraft,
};
