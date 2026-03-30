# System Prompt Structure

The system prompt is assembled at runtime by [`assemble-system-prompt.ts`](../../server/utils/assemble-system-prompt.ts). It stitches together markdown files from this directory plus dynamic blocks injected per request.

## Assembled Structure

```
┌─────────────────────────────────────────────────┐
│  system-prompt-core.md                          │
│  - Role, greeting, response rules              │
│  - Tool instructions (getDesignSnapshot,        │
│    proposeDesignUpdate)                         │
├─────────────────────────────────────────────────┤
│  <knowledge domain="cluster-design">            │  ← always included
│    cluster-design.md                            │
│  </knowledge>                                   │
├─────────────────────────────────────────────────┤
│  <knowledge domain="networking">                │  ← included only if question
│    networking.md                                │    matches domain keywords
│  </knowledge>                                   │
├─────────────────────────────────────────────────┤
│  <knowledge domain="security">                  │  ← likewise, keyword-matched
│    security.md                                  │
│  </knowledge>                                   │
├─────────────────────────────────────────────────┤
│  ... (operations, resilience, observability,    │
│       scalability-and-storage)                  │
╞═════════════════════════════════════════════════╡
│  <context>                                      │  ← RAG chunks from retrieval API
│    [1] Title - URL                              │
│    chunk text...                                │
│    [2] Title - URL                              │
│    chunk text...                                │
│  </context>                                     │
╞═════════════════════════════════════════════════╡
│  <design>                                       │  ← only when design is linked
│    The user's architecture choices...           │
│  </design>                                      │
├─────────────────────────────────────────────────┤
│  <design-change>                                │  ← only when design updated
│    Design was updated since last message.       │    since last chat message
│    ACTION REQUIRED: call getDesignSnapshot      │
│  </design-change>                               │
├─────────────────────────────────────────────────┤
│  <framework>                                    │  ← only when design is linked
│    Valid design questions + answer keys          │
│    for proposeDesignUpdate tool                 │
│  </framework>                                   │
└─────────────────────────────────────────────────┘
```

## Domain Filtering

Not all knowledge domains are included on every request. [`select-domains.ts`](../../server/utils/select-domains.ts) matches the user's question against keyword heuristics and only includes relevant sections. `cluster-design` is always included as the baseline.

This reduced the system prompt from ~12K tokens to ~6K, which was necessary to stay within Anthropic's 30K input tokens/min rate limit as conversation history grows.
