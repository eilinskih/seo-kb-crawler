# SEO KB MCP Server Model

- Status: Initial runtime foundation in current PR.
- Owner: SEO Agent Gateway / Codex integration boundary.

## Purpose

The SEO KB MCP Server is the agent-facing entry point for Codex workspaces that
need to use this platform without being re-taught API URLs, endpoints or Topic
Engine payload shapes.

The expected user workflow is:

```txt
Codex workspace for a website
  -> SEO KB MCP tools
  -> SEO KB API
  -> Topic Work Run / Demand / SERP / Context / SEO Pack services
```

The MCP server is a thin integration layer. It does not own SEO logic,
provider logic, crawling, Demand discovery, ranking decisions or content
generation.

## Responsibilities

The MCP server owns:

- exposing stable MCP tool names for Codex and other agent clients;
- converting simple agent inputs into existing API requests;
- building a complete Topic Engine creation payload from one topic seed;
- returning structured JSON from the API as MCP text content;
- failing transparently when the API or a downstream service is unavailable.

The MCP server does not own:

- Topic Engine validation rules;
- Demand Engine keyword discovery or candidate-page logic;
- SERP provider selection;
- URL Frontier scheduling;
- Context Pack retrieval logic;
- SEO Pack generation semantics;
- persistence.

## Tools

Initial tools:

- `seo_kb_health`
- `seo_kb_list_topics`
- `seo_kb_get_topic`
- `seo_kb_create_topic`
- `seo_kb_start_topic_work_run`
- `seo_kb_get_topic_work_status`
- `seo_kb_get_demand_map`
- `seo_kb_get_page_candidates`
- `seo_kb_build_context_pack`
- `seo_kb_build_seo_pack`

The main product path from a website workspace is:

```txt
seo_kb_create_topic
  -> seo_kb_start_topic_work_run
  -> seo_kb_get_topic_work_status
  -> seo_kb_get_page_candidates
  -> seo_kb_build_context_pack / seo_kb_build_seo_pack
```

## Configuration

The server connects to the API through:

```txt
SEO_KB_API_BASE_URL=http://127.0.0.1:3000
SEO_KB_MCP_TIMEOUT_MS=30000
```

Local command:

```bash
npm run build:mcp-server
SEO_KB_API_BASE_URL=http://127.0.0.1:3000 npm run start:mcp-server
```

Docker command for MCP clients that support command-based stdio servers:

```bash
docker compose --profile mcp run --rm mcp-server
```

## Agent Usage

In a website workspace, Codex should treat SEO KB MCP output as structured
research context, not as permission to publish.

Example agent instruction:

```txt
Use the SEO KB MCP server.
Find or create a topic for "depilacja laserowa jasło" in Polish and Poland.
Start or continue the topic work run.
Fetch ready page candidates.
For each candidate, use SEO Pack and Context Pack evidence before proposing
website changes.
Do not invent search volume, keyword difficulty, SERP evidence or page
readiness when MCP data is missing.
```

## Current Limitations

- MCP server uses stdio transport only.
- Authentication is not implemented in the MCP boundary; secure deployment
  should be handled before exposing the API outside trusted local networks.
- Tool responses are JSON text content, not custom MCP resources.
- `seo_kb_build_context_pack` and `seo_kb_build_seo_pack` accept native API
  request objects; richer convenience wrappers can be added after real
  workspace usage shows the right shape.
