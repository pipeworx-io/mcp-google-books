# @pipeworx/google-books

Google Books MCP — Books search + volume metadata (~40M+ books). Public reads keyless (1k/day per IP); higher limits with optional key.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `search(query, search_field?, filter?, language?, print_type?, order_by?, limit?, offset?)`
- `get_volume(id)` — single volume by Google Books id
- `get_by_isbn(isbn)` — convenience: lookup by ISBN-10 or ISBN-13
- `list_bookshelf(user_id, shelf?)` — public bookshelf by user id

## Auth

Optional. Pass `?_apiKey=<key>` for higher rate limits — register at https://console.cloud.google.com/apis/credentials and enable the Books API.

## Data source

`https://www.googleapis.com/books/v1/` — REST + JSON.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "google-books": {
      "url": "https://gateway.pipeworx.io/google-books/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Google Books data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
