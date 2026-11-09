import { render } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { vi } from "vitest";

import { App } from "@/App";
import { routes } from "@/app/router";

export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App router={router} />);

  return { router };
}

type Handler = (body: unknown) => unknown;

export function mockApi(handlers: Record<string, Handler | unknown>) {
  const calls: { key: string; body: unknown }[] = [];

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    calls.push({ key, body });

    if (!(key in handlers)) {
      return Response.json({ message: `unmocked ${key}` }, { status: 404 });
    }

    const handler = handlers[key];
    const result = typeof handler === "function" ? (handler as Handler)(body) : handler;

    return result instanceof Response ? result : Response.json(result);
  });

  return calls;
}
