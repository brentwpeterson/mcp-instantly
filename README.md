# Instantly MCP Server

MCP (Model Context Protocol) server for Instantly.ai, enabling Claude to manage email outreach campaigns, leads, and analytics.

**15 tools available** for complete Instantly management from Claude.

## Features

- **Lead Management**: List, add, update, and delete leads
- **Campaign Management**: List campaigns, get status, launch, and pause
- **Email Accounts**: List sending profiles, check warmup status
- **Analytics**: Get campaign performance metrics (opens, clicks, replies, bounces)

## Prerequisites

- Node.js 20+
- Instantly.ai account with Growth plan or higher (API access required)
- Instantly API V2 key

## Getting Your API Key

1. Log in to [Instantly Dashboard](https://app.instantly.ai)
2. Go to **Settings > Integrations > API**
3. Generate a new API V2 key
4. Copy the key for configuration

## Installation

```bash
cd /Users/brent/scripts/CB-Workspace/mcp-servers/instantly
npm install
npm run build
```

## Configuration

Add to your Claude Code MCP configuration (`~/.claude.json` or project settings):

```json
{
  "mcpServers": {
    "instantly": {
      "command": "node",
      "args": ["/Users/brent/scripts/CB-Workspace/mcp-servers/instantly/dist/index.js"],
      "env": {
        "INSTANTLY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### Lead Management

| Tool | Description |
|------|-------------|
| `instantly_list_leads` | List leads, optionally filtered by campaign |
| `instantly_get_lead` | Get details of a specific lead |
| `instantly_add_lead` | Add a new lead to a campaign |
| `instantly_update_lead` | Update lead information |
| `instantly_delete_lead` | Delete a lead |

### Campaign Management

| Tool | Description |
|------|-------------|
| `instantly_list_campaigns` | List all campaigns |
| `instantly_get_campaign` | Get campaign details |
| `instantly_get_campaign_status` | Get campaign status (active, paused, etc.) |
| `instantly_launch_campaign` | Start a paused campaign |
| `instantly_pause_campaign` | Pause an active campaign |

### Analytics

| Tool | Description |
|------|-------------|
| `instantly_get_analytics` | Get detailed campaign analytics |
| `instantly_get_analytics_summary` | Get summary with calculated rates |

### Email Accounts

| Tool | Description |
|------|-------------|
| `instantly_list_accounts` | List all connected email sending accounts/profiles |
| `instantly_get_account` | Get details of a specific email account |
| `instantly_get_account_status` | Get warmup status and health of an account |

## Usage Examples

Once configured, you can use natural language in Claude:

**Campaigns:**
- "List my Instantly campaigns"
- "Show me the analytics for campaign X"
- "Pause the outreach campaign"
- "Launch the Flywheel campaign"

**Leads:**
- "Add john@example.com to campaign Y with first name John"
- "List all leads in the Flywheel campaign"
- "Update the lead with company name Acme Corp"

**Email Accounts:**
- "List my Instantly email accounts"
- "Show me the warmup status for my sending profiles"
- "What email addresses do I have connected?"

## Development

```bash
# Watch mode for development
npm run dev

# Build
npm run build

# Run directly
INSTANTLY_API_KEY=your-key npm start
```

## API Reference

This server uses Instantly API V2. For full API documentation, see:
- [Developer Portal](https://developer.instantly.ai/)
- [API V2 Help](https://help.instantly.ai/en/articles/10432807-api-v2)

## Troubleshooting

**"INSTANTLY_API_KEY environment variable is required"**
- Ensure the API key is set in your MCP configuration's `env` section

**API errors (401 Unauthorized)**
- Verify your API key is valid and has the correct scopes
- Ensure you're using an API V2 key (V1 keys won't work)

**API errors (403 Forbidden)**
- Your Instantly plan may not include API access (requires Growth plan or higher)
