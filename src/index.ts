#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration
const API_BASE_URL = "https://api.instantly.ai/api/v2";
const API_KEY = process.env.INSTANTLY_API_KEY;

if (!API_KEY) {
  console.error("Error: INSTANTLY_API_KEY environment variable is required");
  process.exit(1);
}

// API Client
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

async function apiRequest<T>(
  endpoint: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Types
interface Lead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  campaign_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  custom_variables?: Record<string, string>;
}

interface Campaign {
  id: string;
  name: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface CampaignAnalytics {
  campaign_id: string;
  sent?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  bounced?: number;
  unsubscribed?: number;
  open_rate?: number;
  click_rate?: number;
  reply_rate?: number;
  bounce_rate?: number;
}

interface EmailAccount {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  provider?: string;
  warmup_status?: string;
  warmup_enabled?: boolean;
  daily_limit?: number;
  status?: string;
  created_at?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
}

// Lead Management Functions
async function listLeads(
  campaignId?: string,
  limit: number = 100,
  skip: number = 0
): Promise<PaginatedResponse<Lead>> {
  let endpoint = `/leads?limit=${limit}&skip=${skip}`;
  if (campaignId) {
    endpoint += `&campaign_id=${encodeURIComponent(campaignId)}`;
  }
  return apiRequest<PaginatedResponse<Lead>>(endpoint);
}

async function getLead(leadId: string): Promise<Lead> {
  return apiRequest<Lead>(`/leads/${encodeURIComponent(leadId)}`);
}

async function addLead(
  campaignId: string,
  email: string,
  firstName?: string,
  lastName?: string,
  companyName?: string,
  customVariables?: Record<string, string>
): Promise<Lead> {
  const body: Record<string, unknown> = {
    campaign_id: campaignId,
    email,
  };

  if (firstName) body.first_name = firstName;
  if (lastName) body.last_name = lastName;
  if (companyName) body.company_name = companyName;
  if (customVariables) body.custom_variables = customVariables;

  return apiRequest<Lead>("/leads", "POST", body);
}

async function updateLead(
  leadId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    customVariables?: Record<string, string>;
  }
): Promise<Lead> {
  const body: Record<string, unknown> = {};

  if (updates.firstName !== undefined) body.first_name = updates.firstName;
  if (updates.lastName !== undefined) body.last_name = updates.lastName;
  if (updates.companyName !== undefined) body.company_name = updates.companyName;
  if (updates.customVariables !== undefined) body.custom_variables = updates.customVariables;

  return apiRequest<Lead>(`/leads/${encodeURIComponent(leadId)}`, "PATCH", body);
}

async function deleteLead(leadId: string): Promise<{ success: boolean }> {
  await apiRequest(`/leads/${encodeURIComponent(leadId)}`, "DELETE");
  return { success: true };
}

// Campaign Management Functions
async function listCampaigns(
  limit: number = 100,
  skip: number = 0
): Promise<PaginatedResponse<Campaign>> {
  return apiRequest<PaginatedResponse<Campaign>>(`/campaigns?limit=${limit}&skip=${skip}`);
}

async function getCampaign(campaignId: string): Promise<Campaign> {
  return apiRequest<Campaign>(`/campaigns/${encodeURIComponent(campaignId)}`);
}

async function getCampaignStatus(campaignId: string): Promise<{ status: string; details?: Record<string, unknown> }> {
  return apiRequest(`/campaigns/${encodeURIComponent(campaignId)}/status`);
}

async function launchCampaign(campaignId: string): Promise<{ success: boolean; status: string }> {
  return apiRequest(`/campaigns/${encodeURIComponent(campaignId)}/launch`, "POST");
}

async function pauseCampaign(campaignId: string): Promise<{ success: boolean; status: string }> {
  return apiRequest(`/campaigns/${encodeURIComponent(campaignId)}/pause`, "POST");
}

// Analytics Functions
async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  return apiRequest<CampaignAnalytics>(`/campaigns/${encodeURIComponent(campaignId)}/analytics`);
}

async function getCampaignAnalyticsSummary(campaignId: string): Promise<CampaignAnalytics> {
  return apiRequest<CampaignAnalytics>(`/campaigns/${encodeURIComponent(campaignId)}/analytics/summary`);
}

// Email Account Functions
async function listAccounts(
  limit: number = 100,
  skip: number = 0
): Promise<PaginatedResponse<EmailAccount>> {
  return apiRequest<PaginatedResponse<EmailAccount>>(`/accounts?limit=${limit}&skip=${skip}`);
}

async function getAccount(accountId: string): Promise<EmailAccount> {
  return apiRequest<EmailAccount>(`/accounts/${encodeURIComponent(accountId)}`);
}

async function getAccountStatus(accountId: string): Promise<{ status: string; warmup?: Record<string, unknown> }> {
  return apiRequest(`/accounts/${encodeURIComponent(accountId)}/status`);
}

// MCP Server Setup
const server = new Server(
  {
    name: "instantly",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Lead Management Tools
    {
      name: "instantly_list_leads",
      description: "List leads from Instantly. Can filter by campaign ID.",
      inputSchema: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "Filter leads by campaign ID (optional)",
          },
          limit: {
            type: "number",
            description: "Maximum number of leads to return (default: 100)",
            default: 100,
          },
          skip: {
            type: "number",
            description: "Number of leads to skip for pagination (default: 0)",
            default: 0,
          },
        },
      },
    },
    {
      name: "instantly_get_lead",
      description: "Get details of a specific lead by ID",
      inputSchema: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "The ID of the lead to retrieve",
          },
        },
        required: ["leadId"],
      },
    },
    {
      name: "instantly_add_lead",
      description: "Add a new lead to a campaign",
      inputSchema: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "The campaign ID to add the lead to",
          },
          email: {
            type: "string",
            description: "Email address of the lead",
          },
          firstName: {
            type: "string",
            description: "First name of the lead",
          },
          lastName: {
            type: "string",
            description: "Last name of the lead",
          },
          companyName: {
            type: "string",
            description: "Company name of the lead",
          },
          customVariables: {
            type: "object",
            description: "Custom variables for personalization (key-value pairs)",
            additionalProperties: { type: "string" },
          },
        },
        required: ["campaignId", "email"],
      },
    },
    {
      name: "instantly_update_lead",
      description: "Update an existing lead's information",
      inputSchema: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "The ID of the lead to update",
          },
          firstName: {
            type: "string",
            description: "New first name",
          },
          lastName: {
            type: "string",
            description: "New last name",
          },
          companyName: {
            type: "string",
            description: "New company name",
          },
          customVariables: {
            type: "object",
            description: "Updated custom variables",
            additionalProperties: { type: "string" },
          },
        },
        required: ["leadId"],
      },
    },
    {
      name: "instantly_delete_lead",
      description: "Delete a lead from Instantly",
      inputSchema: {
        type: "object",
        properties: {
          leadId: {
            type: "string",
            description: "The ID of the lead to delete",
          },
        },
        required: ["leadId"],
      },
    },
    // Campaign Management Tools
    {
      name: "instantly_list_campaigns",
      description: "List all campaigns in Instantly",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of campaigns to return (default: 100)",
            default: 100,
          },
          skip: {
            type: "number",
            description: "Number of campaigns to skip for pagination (default: 0)",
            default: 0,
          },
        },
      },
    },
    {
      name: "instantly_get_campaign",
      description: "Get details of a specific campaign",
      inputSchema: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "The ID of the campaign to retrieve",
          },
        },
        required: ["campaignId"],
      },
    },
    {
      name: "instantly_get_campaign_status",
      description: "Get the current status of a campaign (active, paused, completed, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "The ID of the campaign",
          },
        },
        required: ["campaignId"],
      },
    },
    {
      name: "instantly_launch_campaign",
      description: "Launch a paused campaign to start sending emails",
      inputSchema: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "The ID of the campaign to launch",
          },
        },
        required: ["campaignId"],
      },
    },
    {
      name: "instantly_pause_campaign",
      description: "Pause an active campaign to stop sending emails",
      inputSchema: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "The ID of the campaign to pause",
          },
        },
        required: ["campaignId"],
      },
    },
    // Analytics Tools
    {
      name: "instantly_get_analytics",
      description: "Get detailed analytics for a campaign including opens, clicks, replies, and bounces",
      inputSchema: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "The ID of the campaign to get analytics for",
          },
        },
        required: ["campaignId"],
      },
    },
    {
      name: "instantly_get_analytics_summary",
      description: "Get a summary of analytics for a campaign with calculated rates",
      inputSchema: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "The ID of the campaign",
          },
        },
        required: ["campaignId"],
      },
    },
    // Email Account Tools
    {
      name: "instantly_list_accounts",
      description: "List all email sending accounts/profiles in Instantly. Shows all connected email addresses used for sending campaigns.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of accounts to return (default: 100)",
            default: 100,
          },
          skip: {
            type: "number",
            description: "Number of accounts to skip for pagination (default: 0)",
            default: 0,
          },
        },
      },
    },
    {
      name: "instantly_get_account",
      description: "Get details of a specific email sending account including warmup status",
      inputSchema: {
        type: "object",
        properties: {
          accountId: {
            type: "string",
            description: "The ID of the email account to retrieve",
          },
        },
        required: ["accountId"],
      },
    },
    {
      name: "instantly_get_account_status",
      description: "Get the current status and warmup details of an email account",
      inputSchema: {
        type: "object",
        properties: {
          accountId: {
            type: "string",
            description: "The ID of the email account",
          },
        },
        required: ["accountId"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Lead Management
      case "instantly_list_leads": {
        const result = await listLeads(
          args?.campaignId as string | undefined,
          (args?.limit as number) || 100,
          (args?.skip as number) || 0
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_get_lead": {
        const result = await getLead(args?.leadId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_add_lead": {
        const result = await addLead(
          args?.campaignId as string,
          args?.email as string,
          args?.firstName as string | undefined,
          args?.lastName as string | undefined,
          args?.companyName as string | undefined,
          args?.customVariables as Record<string, string> | undefined
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_update_lead": {
        const result = await updateLead(args?.leadId as string, {
          firstName: args?.firstName as string | undefined,
          lastName: args?.lastName as string | undefined,
          companyName: args?.companyName as string | undefined,
          customVariables: args?.customVariables as Record<string, string> | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_delete_lead": {
        const result = await deleteLead(args?.leadId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Campaign Management
      case "instantly_list_campaigns": {
        const result = await listCampaigns(
          (args?.limit as number) || 100,
          (args?.skip as number) || 0
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_get_campaign": {
        const result = await getCampaign(args?.campaignId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_get_campaign_status": {
        const result = await getCampaignStatus(args?.campaignId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_launch_campaign": {
        const result = await launchCampaign(args?.campaignId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_pause_campaign": {
        const result = await pauseCampaign(args?.campaignId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Analytics
      case "instantly_get_analytics": {
        const result = await getCampaignAnalytics(args?.campaignId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_get_analytics_summary": {
        const result = await getCampaignAnalyticsSummary(args?.campaignId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Email Accounts
      case "instantly_list_accounts": {
        const result = await listAccounts(
          (args?.limit as number) || 100,
          (args?.skip as number) || 0
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_get_account": {
        const result = await getAccount(args?.accountId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "instantly_get_account_status": {
        const result = await getAccountStatus(args?.accountId as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Instantly MCP server running");
}

main().catch(console.error);
