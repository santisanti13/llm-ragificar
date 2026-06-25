# RAGify — Tu API inteligente de documentos

> RAG-as-a-Service para todos. Sube tus documentos, obtén una API privada y segura que puedes conectar a cualquier herramienta.

**Live:** [llm-ragificar.lovable.app](https://llm-ragificar.lovable.app)

---

## Context

RAGify was built before "RAG" became a standard term in product conversations.

The idea was simple: most organizations sit on enormous amounts of knowledge locked inside PDFs, docs, wikis, and emails — and have no way to make that knowledge accessible to an AI. Fine-tuning is expensive and requires ML expertise. RAGify was an attempt to democratize that: upload your documents, get an API back, connect it to whatever you're building.

Today, companies like Cohere, Pinecone, and LlamaIndex sell this at enterprise scale. At the time RAGify was built, doing it from scratch as a solo builder — with a working product, a brand, and a live URL — was the point.

---

## What it does

RAGify turns your documents into a private, queryable API:

1. **Upload documents** — PDFs, text files, web content
2. **RAGify indexes them** — recursive sentence-aware chunking, embeds, stores in pgvector
3. **Query in natural language** — hybrid retrieval (full-text + semantic) surfaces the most relevant context
4. **Expose as API** — connect the knowledge base to any tool, chatbot, or workflow

```
Documents → Chunking → Embedding → Vector DB (pgvector + HNSW)
                                        │
User query → Embedding → Hybrid search → Context retrieval
              + Full-text (ES/EN)              │
                                       LLM + Context → Answer
```

---

## Architecture

```
User uploads document
        │
        ▼
   RAGify ingestion pipeline (Supabase Edge Function)
   ├── Text extraction
   ├── Recursive chunking (paragraph → sentence → word)
   │   word-boundary overlap, no mid-word cuts
   ├── Embedding (Gemini, 768-dim, via AI Gateway)
   │   graceful fallback to full-text if gateway is down
   └── Storage (pgvector, HNSW index, cosine similarity)
        │
        ▼
   Query interface
   ├── Query embedding
   ├── Hybrid search: semantic (HNSW) + full-text (ES/EN)
   ├── Result fusion
   └── LLM generation (grounded answer)
        │
        ▼
   API response → your app / chatbot / tool
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Lovable |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Vector store | pgvector with HNSW index (cosine) |
| Embeddings | Gemini `gemini-embedding-001` (768-dim) via AI Gateway |
| Search | Hybrid — semantic + full-text (Spanish & English) |
| Deployment | Lovable |

---

## Technical highlights

What's actually under the hood — verified, not aspirational:

### Recursive sentence-aware chunking
Documents are split hierarchically: paragraph → sentence → word, with overlap snapped to word boundaries so chunks never break mid-word. The sentence regex handles Spanish punctuation (`¡¿`) and accented capitals. Chunk size and overlap are configurable per project.

### Hybrid retrieval
Every query runs **two** searches in parallel and fuses the results:
- **Semantic search** over pgvector using an HNSW index (`m=16, ef_construction=64`) with cosine similarity
- **Full-text search** with separate Spanish and English configurations (GIN indexes)

This means queries match both on meaning (semantic) and on exact terms (full-text) — more robust than either alone.

### Resilient embeddings
The embedding model is called through the Lovable AI Gateway with explicit error handling:
- **429 (rate limit)** → backoff and retry
- **402 (out of credits)** → continues with `embedding=null`, degrading gracefully
- **5xx (gateway error)** → falls back to full-text search

If the embedding service goes down, RAGify keeps answering with full-text instead of failing.

### Row-level multi-tenancy
Data isolation is enforced at the database level, not just in application code:
- Every chunk carries a `user_id` (NOT NULL, FK to auth users, cascade delete)
- A **BEFORE INSERT/UPDATE trigger** forces `user_id` to match the parent document's owner — a client cannot forge ownership even if it tries to inject a fake `user_id`
- RLS policies enforce `user_id = auth.uid()` on every operation (select/insert/update/delete)

A query from user A can only ever return user A's chunks.

---

## Why it matters (then and now)

When RAGify was built, the dominant approach to "make an AI know your stuff" was fine-tuning — expensive, slow, and requiring ML expertise most teams don't have. RAG offered a better tradeoff: no training, no GPU, just retrieval + generation.

The insight was product, not research: **most people don't need a smarter model, they need their model to know their data.** RAGify was a product bet on that insight.

The market validated it. Every major AI platform now offers some form of RAG or "knowledge base" feature. RAGify was an early, solo implementation of the same pattern — and one that holds up technically: hybrid search, HNSW indexing, and row-level tenant isolation are the same primitives the mature tools use.

---

## Known tradeoffs

Honest engineering notes:

- **No re-ranking layer yet.** After hybrid fusion, results aren't re-ranked by a cross-encoder (Cohere/Voyage). For the current data scale this isn't necessary, but it's the next quality lever.
- **Embedding dimension override.** The 768-dim Matryoshka truncation relies on gateway behavior; pinned and documented in code as a known dependency.
- **pgvector lives in the `public` schema.** Moving it would break existing vector types and indexes — documented as an accepted tradeoff.

---

## What's next (if continued)

- [ ] Add a re-ranking layer (cross-encoder) after hybrid fusion
- [ ] Token-based chunking (currently character-based with sentence awareness)
- [ ] Query embedding cache to avoid re-embedding repeated queries
- [ ] **MCP server wrapper — expose any RAGify knowledge base as an MCP tool for Claude**

---

## Author

Built by **Santi** — SaaS builder, EdTech & GovTech.
[santiagojimenezvalero.com](https://www.santiagojimenezvalero.com) · [LinkedIn](https://www.linkedin.com/in/santijiménezvalero)
---

## Author

Built by **Santi** — SaaS builder, EdTech & GovTech.
[santiagojimenezvalero.com](https://www.santiagojimenezvalero.com) · [LinkedIn](https://www.linkedin.com/in/santijiménezvalero)
