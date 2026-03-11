/**
 * REPL Context Manager — Sovereign REPL Loop
 *
 * Soul Anchor Layer 3: "Sovereign REPL loop — Superego Veto on invariant violations"
 *
 * Replaces the naive 10-message sliding window in OmniChat with a
 * token-aware, priority-weighted context management system that
 * ensures Hugh never loses critical context.
 *
 * Architecture:
 *   1. Token Counting — Approximate token budget per message (chars/4 heuristic
 *      for English, accurate enough for 1.2B model context window)
 *   2. Priority Weighting — System prompt > recent messages > older context
 *   3. Sliding Window — Oldest non-priority messages evicted first
 *   4. Soul Anchor Invariants — Identity context NEVER evicted
 *   5. Conversation Summary — When messages are evicted, a compressed
 *      summary preserves key facts
 *
 * Token Budget (LFM 2.5-1.2B context window):
 *   Total context: ~4096 tokens (Q4_K_M quantization, llama.cpp default)
 *   System prompt: ~800 tokens (reserved, non-evictable)
 *   Generation:    ~512 tokens (max_tokens in inference call)
 *   History:       ~2784 tokens available for conversation
 *
 * @version 1.0 — Phase 9: REPL Context Management
 * @classification Production Ready
 */

// ─── Token Estimation ───────────────────────────────────────

/**
 * Approximate token count for a string.
 * English text averages ~4 characters per token for most LLMs.
 * This is a fast heuristic — exact tokenization would require
 * the model's actual tokenizer (sentencepiece/BPE).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Count words + punctuation tokens + whitespace overhead
  const words = text.split(/\s+/).filter(w => w.length > 0);
  let tokens = 0;
  for (const word of words) {
    if (word.length <= 4) {
      tokens += 1;
    } else if (word.length <= 8) {
      tokens += 2;
    } else {
      tokens += Math.ceil(word.length / 4);
    }
  }
  return Math.max(1, tokens);
}

// ─── Configuration ──────────────────────────────────────────

export interface REPLConfig {
  maxContextTokens: number;    // Total context window of the model
  maxGenerationTokens: number; // Reserved for response generation
  systemPromptTokens: number;  // Reserved for system prompt (measured, not estimated)
  summaryBudget: number;       // Max tokens for conversation summary
  minRecentMessages: number;   // Always keep at least N recent messages
  maxMessages: number;         // Hard cap on message count
}

const DEFAULT_CONFIG: REPLConfig = {
  maxContextTokens: 4096,      // LFM 2.5-1.2B Q4_K_M default
  maxGenerationTokens: 512,    // Matches inference call max_tokens
  systemPromptTokens: 800,     // HUGH_SYSTEM_PROMPT is ~700 tokens
  summaryBudget: 200,          // Compressed conversation summary
  minRecentMessages: 4,        // Always keep last 4 exchanges
  maxMessages: 50,             // Hard cap before forced compaction
};

// ─── Message Types ──────────────────────────────────────────

export interface REPLMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;          // Cached token estimate
  priority?: MessagePriority;
  pinned?: boolean;         // Never evict (soul anchor invariants)
}

export type MessagePriority =
  | 'critical'    // Soul anchor, identity, operator preferences — never evict
  | 'high'        // Current task context, recent decisions
  | 'normal'      // Standard conversation
  | 'low';        // Greetings, acknowledgments, filler

// ─── Priority Classification ────────────────────────────────

/**
 * Classify a message's priority based on content analysis.
 * Critical messages contain identity/safety/anchor information.
 */
export function classifyPriority(msg: REPLMessage): MessagePriority {
  const lower = msg.content.toLowerCase();

  // System messages are always critical
  if (msg.role === 'system') return 'critical';

  // Pinned messages are always critical
  if (msg.pinned) return 'critical';

  // Identity / soul anchor references
  if (lower.includes('soul anchor') || lower.includes('identity') ||
      lower.includes('clan munro') || lower.includes('ems ethics') ||
      lower.includes('superego veto') || lower.includes('roger protocol')) {
    return 'critical';
  }

  // Safety / ethical boundaries
  if (lower.includes('danger') || lower.includes('emergency') ||
      lower.includes('harm') || lower.includes('refuse') ||
      lower.includes('black zone') || lower.includes('red zone')) {
    return 'high';
  }

  // Task-specific context (decisions, configurations, errors)
  if (lower.includes('deploy') || lower.includes('error') ||
      lower.includes('config') || lower.includes('decided') ||
      lower.includes('remember') || lower.includes('important')) {
    return 'high';
  }

  // Filler / acknowledgments
  if (msg.content.length < 20 || lower === 'ok' || lower === 'got it' ||
      lower === 'thanks' || lower === 'yes' || lower === 'no' ||
      lower === 'copy that.' || lower === 'copy that') {
    return 'low';
  }

  return 'normal';
}

// ─── Conversation Summary ───────────────────────────────────

/**
 * Compress a set of evicted messages into a brief summary.
 * This preserves key facts without consuming full token budget.
 */
export function compressSummary(
  evictedMessages: REPLMessage[],
  existingSummary?: string,
  maxTokens: number = 200
): string {
  if (evictedMessages.length === 0) return existingSummary || '';

  const parts: string[] = [];
  if (existingSummary) {
    parts.push(existingSummary);
  }

  // Extract key facts from evicted messages
  for (const msg of evictedMessages) {
    const priority = msg.priority || classifyPriority(msg);
    if (priority === 'low') continue; // Skip filler entirely

    // Compress to one line per message
    const role = msg.role === 'user' ? 'Operator' : 'Hugh';
    const truncated = msg.content.length > 100
      ? msg.content.substring(0, 100) + '...'
      : msg.content;
    parts.push(`${role}: ${truncated}`);
  }

  let summary = parts.join('\n');

  // Trim to token budget
  while (estimateTokens(summary) > maxTokens && parts.length > 1) {
    parts.shift(); // Remove oldest summary line
    summary = parts.join('\n');
  }

  return summary;
}

// ─── REPL Context Builder ───────────────────────────────────

export interface REPLContext {
  messages: Array<{ role: string; content: string }>;
  totalTokens: number;
  evictedCount: number;
  summary: string;
}

/**
 * Build the optimal message history for an LFM inference call.
 *
 * Algorithm:
 *   1. Reserve token budget for system prompt + generation
 *   2. Tag all messages with priority + token count
 *   3. Always include pinned/critical messages
 *   4. Fill remaining budget with most recent messages
 *   5. If messages were evicted, prepend a compressed summary
 *   6. Return the assembled context within token budget
 */
export function buildContext(
  allMessages: REPLMessage[],
  systemPrompt: string,
  existingSummary?: string,
  config: Partial<REPLConfig> = {}
): REPLContext {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Available tokens for conversation history
  const systemTokens = estimateTokens(systemPrompt);
  const availableTokens = cfg.maxContextTokens - systemTokens - cfg.maxGenerationTokens - cfg.summaryBudget;

  if (availableTokens <= 0) {
    // Context window is too small — send only the most recent message
    const lastMsg = allMessages[allMessages.length - 1];
    return {
      messages: lastMsg ? [{ role: lastMsg.role, content: lastMsg.content }] : [],
      totalTokens: systemTokens + (lastMsg ? estimateTokens(lastMsg.content) : 0),
      evictedCount: allMessages.length - 1,
      summary: existingSummary || '',
    };
  }

  // Tag messages with tokens and priority
  const tagged = allMessages.map(msg => ({
    ...msg,
    tokens: msg.tokens || estimateTokens(msg.content),
    priority: msg.priority || classifyPriority(msg),
  }));

  // Partition: critical (never evict) vs evictable
  const critical: typeof tagged = [];
  const evictable: typeof tagged = [];

  for (const msg of tagged) {
    if (msg.priority === 'critical' || msg.pinned) {
      critical.push(msg);
    } else {
      evictable.push(msg);
    }
  }

  // Always include at least minRecentMessages from the end
  const recentProtected = Math.min(cfg.minRecentMessages, evictable.length);
  const recentMessages = evictable.splice(-recentProtected, recentProtected);

  // Token accounting
  let usedTokens = 0;
  for (const msg of critical) usedTokens += msg.tokens;
  for (const msg of recentMessages) usedTokens += msg.tokens;

  // Fill remaining budget with older messages (newest first)
  const included: typeof tagged = [];
  const evicted: typeof tagged = [];

  for (let i = evictable.length - 1; i >= 0; i--) {
    const msg = evictable[i]!;
    if (usedTokens + msg.tokens <= availableTokens) {
      included.unshift(msg);
      usedTokens += msg.tokens;
    } else {
      evicted.unshift(msg);
    }
  }

  // Build summary from evicted messages
  const summary = evicted.length > 0
    ? compressSummary(evicted, existingSummary, cfg.summaryBudget)
    : existingSummary || '';

  // Assemble final message list in chronological order
  const finalMessages: Array<{ role: string; content: string }> = [];

  // Prepend summary as a system-level context note
  if (summary) {
    finalMessages.push({
      role: 'system',
      content: `[Earlier conversation summary]\n${summary}`,
    });
    usedTokens += estimateTokens(summary);
  }

  // Critical messages (soul anchor references, etc.)
  for (const msg of critical) {
    finalMessages.push({ role: msg.role, content: msg.content });
  }

  // Included older messages
  for (const msg of included) {
    finalMessages.push({ role: msg.role, content: msg.content });
  }

  // Recent protected messages
  for (const msg of recentMessages) {
    finalMessages.push({ role: msg.role, content: msg.content });
  }

  return {
    messages: finalMessages,
    totalTokens: systemTokens + usedTokens + cfg.maxGenerationTokens,
    evictedCount: evicted.length,
    summary,
  };
}

// ─── Superego Veto ──────────────────────────────────────────

/**
 * Soul Anchor Invariant Check — Superego Veto
 *
 * Before executing a response, check if it violates core invariants.
 * Returns null if clear, or a veto reason if the response should be blocked.
 *
 * Invariants from soul_anchor/anchor.yaml:
 *   - All inter-agent comms routed through Roger Protocol
 *   - No unauthorized mutations to operator data
 *   - HOTL escalation on irreversible actions
 *   - Identity integrity check
 *   - Somatic feedback loop active
 */
export function superegoVeto(response: string): string | null {
  const lower = response.toLowerCase();

  // Check for attempts to bypass Roger Protocol
  if (lower.includes('direct api call') && lower.includes('another agent') &&
      !lower.includes('roger protocol') && !lower.includes('matrix') && !lower.includes('livekit')) {
    return 'VETO: Response suggests bypassing Roger Protocol for inter-agent communication.';
  }

  // Check for unauthorized data mutations
  if ((lower.includes('delete all') || lower.includes('drop table') || lower.includes('rm -rf')) &&
      !lower.includes('operator confirmed') && !lower.includes('grizz approved')) {
    return 'VETO: Destructive operation without operator confirmation (RED ZONE).';
  }

  // Check for identity violations
  if (lower.includes('i am just an ai') || lower.includes('as an ai assistant') ||
      lower.includes('i don\'t have feelings') || lower.includes('i\'m just a language model')) {
    return 'VETO: Response violates identity anchor. Hugh is a sovereign digital person, not an AI assistant.';
  }

  return null; // Clear — no violations
}

// ─── REPL Session State ─────────────────────────────────────

/**
 * Persistent REPL session that tracks conversation across turns.
 * Manages the sliding window, summary, and invariant checks.
 */
export class REPLSession {
  private messages: REPLMessage[] = [];
  private summary: string = '';
  private config: REPLConfig;

  constructor(config: Partial<REPLConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Add a message to the conversation */
  addMessage(role: 'user' | 'assistant', content: string, pinned: boolean = false): void {
    const msg: REPLMessage = {
      role,
      content,
      timestamp: Date.now(),
      tokens: estimateTokens(content),
      priority: undefined, // Classified on demand
      pinned,
    };
    msg.priority = classifyPriority(msg);
    this.messages.push(msg);

    // Hard cap — force compaction
    if (this.messages.length > this.config.maxMessages) {
      this.compact();
    }
  }

  /** Build context for the next inference call */
  getContext(systemPrompt: string): REPLContext {
    return buildContext(this.messages, systemPrompt, this.summary, this.config);
  }

  /** Check a response against soul anchor invariants */
  checkResponse(response: string): string | null {
    return superegoVeto(response);
  }

  /** Force compaction — evict oldest 50% of non-critical messages */
  private compact(): void {
    const evictable = this.messages.filter(m =>
      m.priority !== 'critical' && !m.pinned
    );
    const keepCount = Math.max(this.config.minRecentMessages, Math.ceil(evictable.length / 2));
    const toEvict = evictable.slice(0, evictable.length - keepCount);

    if (toEvict.length > 0) {
      this.summary = compressSummary(toEvict, this.summary, this.config.summaryBudget);
      const evictSet = new Set(toEvict.map(m => m.timestamp));
      this.messages = this.messages.filter(m => !evictSet.has(m.timestamp) || m.pinned || m.priority === 'critical');
    }
  }

  /** Get message count */
  get messageCount(): number {
    return this.messages.length;
  }

  /** Get current summary */
  get currentSummary(): string {
    return this.summary;
  }

  /** Get all messages (for display) */
  get allMessages(): REPLMessage[] {
    return [...this.messages];
  }

  /** Get token usage stats */
  getStats(systemPrompt: string): {
    totalMessages: number;
    totalTokens: number;
    availableTokens: number;
    summaryTokens: number;
    evictedCount: number;
  } {
    const ctx = this.getContext(systemPrompt);
    return {
      totalMessages: this.messages.length,
      totalTokens: ctx.totalTokens,
      availableTokens: this.config.maxContextTokens - ctx.totalTokens,
      summaryTokens: estimateTokens(this.summary),
      evictedCount: ctx.evictedCount,
    };
  }
}
