// web-search.ts — Minimal Pi extension that adds web search via DuckDuckGo Lite.
// No API key required. Built on-the-fly per Pi's extensibility philosophy.
//
// Usage: /web-search <query>   or   the LLM can call the tool directly.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execSync } from "node:child_process";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description:
      "Search the web using DuckDuckGo Lite. Returns up to 20 results with titles, URLs, and snippets. Use this to find current information, documentation, or anything not in the local codebase.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      maxResults: Type.Optional(
        Type.Number({
          description: "Maximum number of results to return (default: 10, max: 20)",
        }),
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const query = encodeURIComponent(params.query);
      const max = Math.min(params.maxResults ?? 10, 20);

      const html = execSync(
        `curl -s -L -A "Mozilla/5.0 (compatible; PiAgent/1.0)" -d "q=${query}" "https://lite.duckduckgo.com/lite/"`,
        { encoding: "utf-8", timeout: 10000, signal },
      );

      const results = parseDuckDuckGoLite(html, max);

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "No results found." }],
          details: { query: params.query, results: [] },
        };
      }

      const text = results
        .map(
          (r, i) =>
            `${i + 1}. **${r.title}**\n   ${r.snippet}\n   ${r.url}`,
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Web search results for "${params.query}":\n\n${text}`,
          },
        ],
        details: { query: params.query, results },
      };
    },
  });

  pi.registerCommand("web-search", {
    description: "Search the web via DuckDuckGo",
    handler: async (args, ctx) => {
      if (!args?.trim()) {
        ctx.ui.notify("Usage: /web-search <query>", "error");
        return;
      }
      const query = encodeURIComponent(args.trim());
      const html = execSync(
        `curl -s -L -A "Mozilla/5.0 (compatible; PiAgent/1.0)" -d "q=${query}" "https://lite.duckduckgo.com/lite/"`,
        { encoding: "utf-8", timeout: 10000 },
      );
      const results = parseDuckDuckGoLite(html, 10);
      if (results.length === 0) {
        ctx.ui.notify("No results found.", "info");
        return;
      }
      const text = results
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`)
        .join("\n");
      ctx.ui.notify(text, "info");
    },
  });
}

// Parse DuckDuckGo Lite HTML into structured results.
// DDG Lite has a simple structure: <a> with class "result-link" for titles,
// <span> with class "result-snippet" for snippets, <a> with class "result-url"
function parseDuckDuckGoLite(
  html: string,
  max: number,
): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // Match result blocks: link followed by snippet
  // DDG Lite format: <a rel="nofollow" href="URL" class='result-link'>Title</a>
  const linkRegex =
    /<a[^>]*href="([^"]*)"[^>]*class=['"]result-link['"][^>]*>([^<]*)<\/a>/gi;
  const snippetRegex =
    /<span[^>]*class="result-snippet"[^>]*>([^<]*)<\/span>/gi;

  const links: Array<{ url: string; title: string }> = [];
  const snippets: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    // DDG Lite wraps URLs in a redirect; extract the real URL
    const url = extractRealUrl(rawUrl);
    links.push({
      url: url || rawUrl,
      title: decodeHtmlEntities(match[2].trim()),
    });
  }

  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(decodeHtmlEntities(match[1].trim()));
  }

  for (let i = 0; i < Math.min(links.length, snippets.length, max); i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i],
    });
  }

  return results;
}

// DDG Lite redirect URLs: //duckduckgo.com/l/?uddg=REAL_URL&rut=...
function extractRealUrl(rawUrl: string): string {
  const uddgMatch = rawUrl.match(/uddg=([^&]*)/);
  if (uddgMatch) {
    try {
      return decodeURIComponent(uddgMatch[1]);
    } catch {
      return rawUrl;
    }
  }
  return rawUrl;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}
