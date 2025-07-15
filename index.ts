import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// CONFIGURE: Define your Obsidian vault path
const VAULT_PATH = "/Users/pradyumnachippigiri/Documents/Obsidian Vault";


// Create MCP server
const server = new McpServer({
  name: "ObsidianMCP",
  version: "1.0.0"
});

server.tool("list-notes", "Lists all markdown notes in the Obsidian vault", {}, async () => {
  const files = await fs.readdir(VAULT_PATH);
  const mdFiles = files.filter(file => file.endsWith(".md"));
  return {
    content: [{ type: "text", text: `Notes:\n${mdFiles.join("\n")}` }]
  };
});

server.tool(
  "list-files-in-dir",
  "Lists all files and directories that exist in a specific Obsidian directory.",
  { dirpath: z.string() },
  async ({ dirpath }) => {
    const targetPath = path.join(VAULT_PATH, dirpath);
    try {
      const files = await fs.readdir(targetPath);
      return {
        content: [{
          type: "text",
          text: `Files in '${dirpath}':\n${files.join("\n")}`
        }]
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `⚠️ Directory '${dirpath}' not found or not accessible.`
        }]
      };
    }
  }
);

server.tool("read-note", "Reads the content of a note in the Obsidian vault", { note: z.string() }, async ({ note }) => {
  const filePath = path.join(VAULT_PATH, `${note}.md`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return {
      content: [{ type: "text", text: content }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Note "${note}" not found.` }]
    };
  }
});

server.tool("write-note", "Creates or updates a note in the Obsidian vault", { note: z.string(), content: z.string() }, async ({ note, content }) => {
  const filePath = path.join(VAULT_PATH, `${note}.md`);
  await fs.writeFile(filePath, content, "utf-8");
  return {
    content: [{ type: "text", text: `Note "${note}" saved.` }]
  };
});

server.tool("search-notes", "Searches for a keyword across all notes", { query: z.string() }, async ({ query }) => {
  const files = await fs.readdir(VAULT_PATH);
  const mdFiles = files.filter(file => file.endsWith(".md"));
  const matches = [];

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(VAULT_PATH, file), "utf-8");
    if (content.includes(query)) {
      matches.push(file);
    }
  }

  return {
    content: [{ type: "text", text: `Notes containing "${query}":\n${matches.join("\n")}` }]
  };
});

server.tool(
  "delete-file",
  "Deletes a file from the Obsidian vault.",
  { filepath: z.string() },
  async ({ filepath }) => {
    const targetPath = path.join(VAULT_PATH, filepath);
    try {
      await fs.unlink(targetPath);
      return {
        content: [{
          type: "text",
          text: ` Successfully deleted '${filepath}'.`
        }]
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `Failed to delete '${filepath}': ${err.message}`
        }]
      };
    }
  }
);

server.tool(
  "append-content",
  "Appends content to a new or existing file in the Obsidian vault.",
  { filepath: z.string(), content: z.string() },
  async ({ filepath, content }) => {
    const targetPath = path.join(VAULT_PATH, filepath);
    try {
      await fs.appendFile(targetPath, content, "utf-8");
      return {
        content: [{
          type: "text",
          text: ` Successfully appended content to '${filepath}'.`
        }]
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: `Failed to append to '${filepath}': ${err.message}`
        }]
      };
    }
  }
);

server.resource(
  "note",
  new ResourceTemplate("note://{note}", { list: undefined }),
  async (uri, { note }) => {
    const filePath = path.join(VAULT_PATH, `${note}.md`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return {
        contents: [{
          uri: uri.href,
          text: content
        }]
      };
    } catch {
      return {
        contents: [{
          uri: uri.href,
          text: `Note "${note}" not found.`
        }]
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
