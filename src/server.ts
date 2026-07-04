import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createTools, SERVER_INSTRUCTIONS, toCallToolResult } from "./mcpAdapter.js";
import { DEFAULT_DATA_ROOT } from "./storage/index.js";

/**
 * MCP server — registers EXACTLY the 18 contract operations
 * (ARCHITECTURE.md Section 8) over stdio.
 *
 * project.delete is NOT an MCP tool and must never be registered
 * here (Section 9) — storage's deleteProject() exists solely for the
 * future user-side CLI/UI. The startup guard below turns any
 * accidental violation into a refusal to boot.
 */

/** --data-root <path> beats AI_WORKSPACE_DATA_ROOT beats "data". */
function resolveDataRoot(): string {
  const flagIndex = process.argv.indexOf("--data-root");
  if (flagIndex !== -1) {
    const value = process.argv[flagIndex + 1];
    if (value === undefined || value === "" || value.startsWith("--")) {
      throw new Error("--data-root requires a path argument");
    }
    return value;
  }
  const env = process.env["AI_WORKSPACE_DATA_ROOT"];
  if (env !== undefined && env !== "") return env;
  return DEFAULT_DATA_ROOT;
}

async function main(): Promise<void> {
  const root = resolveDataRoot();
  const tools = createTools(root);

  // Contract guards (Sections 8, 9 & 12).
  if (tools.length !== 18) {
    throw new Error(`Expected exactly 18 MCP tools, got ${tools.length}`);
  }
  if (new Set(tools.map((t) => t.name)).size !== tools.length) {
    throw new Error("Duplicate MCP tool names");
  }
  if (tools.some((t) => t.name === "project_delete")) {
    throw new Error(
      "project.delete must never be an MCP tool (ARCHITECTURE.md Section 9)",
    );
  }

  const server = new Server(
    { name: "ai-workspace", version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (tool === undefined) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`,
      );
    }
    try {
      const response = await tool.invoke(request.params.arguments ?? {});
      return toCallToolResult(response);
    } catch (err) {
      // Only invariant violations (corrupted storage) end up here —
      // domain errors and conflicts are legal OperationResponse
      // branches serialized by toCallToolResult, never isError.
      return {
        content: [
          {
            type: "text",
            text: `Internal error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  });

  await server.connect(new StdioServerTransport());
  // stdout carries the MCP transport — log to stderr only.
  console.error(`AI Workspace MCP server running (data root: ${root})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
