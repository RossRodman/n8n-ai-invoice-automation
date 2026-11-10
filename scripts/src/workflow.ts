/**
 * Load an exported n8n workflow and run its Code nodes outside n8n, with the
 * same globals n8n gives them ($input, $json, $(), $env). The tests run the
 * exact code that ships in the workflow JSON.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface Workflow {
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, { main: { node: string; type: string; index: number }[][] }>;
  settings: Record<string, unknown>;
}

export interface Item {
  json: Record<string, unknown>;
  binary?: Record<string, { fileName?: string; mimeType?: string; [key: string]: unknown }>;
  pairedItem?: unknown;
}

export const WORKFLOWS_DIR = fileURLToPath(new URL("../../workflows/", import.meta.url));

export function loadWorkflow(file: string): Workflow {
  return JSON.parse(readFileSync(`${WORKFLOWS_DIR}${file}`, "utf8")) as Workflow;
}

export function getNode(workflow: Workflow, name: string): WorkflowNode {
  const node = workflow.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`no node named "${name}"`);
  return node;
}

interface CodeContext {
  /** Items coming into the node. */
  input?: Item[];
  /** The current item's json, for nodes that run once per item. */
  json?: Record<string, unknown>;
  /** What $('Other node').item.json returns, by node name. */
  nodes?: Record<string, Record<string, unknown>>;
  /** What $('Other node').all() returns, by node name. */
  nodeItems?: Record<string, Item[]>;
  env?: Record<string, string>;
}

/** Run a Code node's JavaScript and return what it returns. */
export function runCode(workflow: Workflow, name: string, context: CodeContext = {}): unknown {
  const node = getNode(workflow, name);
  if (node.type !== "n8n-nodes-base.code") throw new Error(`"${name}" is not a Code node`);

  const input = context.input ?? [];
  const $input = { all: () => input, first: () => input[0], item: input[0] };
  const $ = (other: string) => ({
    get item() {
      const json = context.nodes?.[other];
      if (!json) throw new Error(`test gave no data for $('${other}').item`);
      return { json };
    },
    all() {
      const items = context.nodeItems?.[other];
      if (!items) throw new Error(`test gave no data for $('${other}').all()`);
      return items;
    },
  });

  // oxlint-disable-next-line typescript/no-implied-eval -- runs the workflow's own code
  const body = new Function("$input", "$json", "$", "$env", String(node.parameters.jsCode));
  return body($input, context.json ?? {}, $, context.env ?? {});
}
