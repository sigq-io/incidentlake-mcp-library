# SIGQ Incident Lake MCP

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects Claude Desktop, Cursor, and other MCP clients to your SIGQ Incident Lake. Ask questions about your incidents in natural language — it queries the SIGQ API directly.

**Package:** `@sigq-io/incidentlake-mcp-library` on [GitHub Packages](https://github.com/sigq-io/incidentlake-mcp-library/pkgs/npm/incidentlake-mcp-library)

---

## How It Works

The server runs as a local process on your machine and communicates with the SIGQ backend over HTTP using your API token. MCP clients connect to it via stdio transport.

```
Claude Desktop  ──stdio──►  incidentlake-mcp  ──HTTPS──►  SIGQ API
```

---

## Prerequisites

- Node.js 20+
- A SIGQ API token (starts with `sigq_`) — generate one from SIGQ tenant settings

---

## Step 1 — Run the setup wizard

```bash
npx @sigq-io/incidentlake-mcp-library configure
```

This will:

- Ask for your SIGQ API URL and token
- Test the connection to make sure it works
- Save credentials to `~/.sigq/config.json`
- Print the exact config block to paste into your MCP client

```
Welcome to Incident Lake MCP setup!

? Enter your SIGQ API URL (press Enter for default):
  [https://api.prod.incidentlake.sigq.io/incidentlake/public-api]:
? Enter your API token (starts with sigq_): sigq_xxxx

? Testing connection... ✓ Connected successfully!
✓ Config saved to ~/.sigq/config.json
```

**Default API URL:** `https://api.prod.incidentlake.sigq.io/incidentlake/public-api`

---

## Step 2 — Configure your MCP client

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "incidentlake-mcp": {
      "command": "npx",
      "args": ["@sigq-io/incidentlake-mcp-library"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` or your workspace `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "incidentlake-mcp": {
      "command": "npx",
      "args": ["@sigq-io/incidentlake-mcp-library"]
    }
  }
}
```

> No `env` block needed — credentials are read from `~/.sigq/config.json` set up in Step 1.

---

## Step 3 — Restart your MCP client

Restart Claude Desktop or Cursor. You should see `incidentlake-mcp` listed with 6 tools available.

---

## Available Tools

| Tool                     | Description                                      | Key Inputs                                                       |
| ------------------------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| `list_incidents`         | List incidents with filter, sort, and pagination | `status`, `severity`, `sortBy`, `sortDir`, `limit`, `cursor`     |
| `get_incident`           | Fetch full details for a single incident         | `incidentId` (UUID)                                              |
| `search_incidents`       | Full-text search across incidents                | `query`, `limit`                                                 |
| `get_incident_analytics` | Incident stats for a date range                  | `startDate`, `endDate` (YYYY-MM-DD)                              |
| `create_incident`        | Create a new incident                            | `name` (required), `summary`, `status`, `severity`, `occurredAt` |
| `get_sop_completions`    | SOP checklist progress for an incident           | `incidentId` (UUID)                                              |

## Available Resources

| URI                        | Description                          |
| -------------------------- | ------------------------------------ |
| `sigq://incidents/recent`  | 20 most recently created incidents   |
| `sigq://incidents/ongoing` | All active/ongoing incidents         |
| `sigq://incidents/{id}`    | Full details for a specific incident |

---

## Example Prompts

- "List the 5 most recent ongoing incidents"
- "Search for incidents related to database timeout"
- "Show me incident analytics for January 2025"
- "Get the full details of incident `<uuid>`"
- "Create an incident called 'Auth service degraded'"
- "What SOP steps are completed for incident `<uuid>`?"

---

## Setup for Local Development

### 1. Clone and install

```bash
git clone https://github.com/sigq-io/incidentlake-mcp-library.git
cd incidentlake-mcp-library
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set SIGQ_API_URL and SIGQ_API_TOKEN
```

### 3. Run

```bash
npm run dev      # run directly with tsx (no build needed)
npm run build    # compile TypeScript → dist/
npm run start    # run compiled output
```

### 4. Configure Claude Desktop (local build)

```json
{
  "mcpServers": {
    "sigq-local": {
      "command": "node",
      "args": ["/path/to/incidentlake-mcp-library/dist/index.js"]
    }
  }
}
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - see [LICENSE](LICENSE) for details.
