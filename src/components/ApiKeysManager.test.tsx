import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ApiKeysManager } from "./ApiKeysManager";

const PROJECT_ID = "27b2195a-d882-43bc-9e22-acda40d913d8";
const USER_ID = "user-123";

// Use vi.hoisted so spies exist before vi.mock factory runs
const { insertSpy, eqProjectSpy } = vi.hoisted(() => ({
  insertSpy: vi.fn(),
  eqProjectSpy: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const USER_ID_INNER = "user-123";
  const builder = (table: string) => {
    if (table === "project_api_keys") {
      return {
        select: () => ({
          eq: (col: string, val: string) => {
            eqProjectSpy(col, val);
            return {
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "existing-1",
                      key_prefix: "abcd1234",
                      name: "Existing Key",
                      is_active: true,
                      last_used_at: null,
                      created_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                }),
            };
          },
        }),
        insert: (payload: Record<string, unknown>) => {
          insertSpy(payload);
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "new-key-id",
                    key_prefix: payload.key_prefix,
                    name: payload.name,
                    is_active: true,
                    last_used_at: null,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
            }),
          };
        },
      };
    }
    return {
      select: () => ({
        eq: () => ({
          gte: () => ({
            not: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    };
  };
  return {
    supabase: {
      from: vi.fn((table: string) => builder(table)),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID_INNER } } }),
      },
    },
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  insertSpy.mockClear();
  eqProjectSpy.mockClear();
});

describe("ApiKeysManager - regression: key ↔ project binding", () => {
  it("filtra las keys existentes por el project_id recibido", async () => {
    render(<ApiKeysManager projectId={PROJECT_ID} />);
    await waitFor(() => expect(screen.getByText("Existing Key")).toBeInTheDocument());
    expect(eqProjectSpy).toHaveBeenCalledWith("project_id", PROJECT_ID);
  });

  it("crea la nueva key ligada al project_id y user_id, y muestra la key cruda una sola vez", async () => {
    render(<ApiKeysManager projectId={PROJECT_ID} />);
    await waitFor(() => expect(screen.getByText("Existing Key")).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/Nombre de la API key/i);
    fireEvent.change(input, { target: { value: "Prueba Test" } });
    fireEvent.click(screen.getByRole("button", { name: /Generar/i }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.project_id).toBe(PROJECT_ID);
    expect(payload.user_id).toBe(USER_ID);
    expect(payload.name).toBe("Prueba Test");
    expect(typeof payload.api_key_hash).toBe("string");
    expect(payload.api_key_hash.length).toBe(64); // sha256 hex
    expect(typeof payload.key_prefix).toBe("string");
    expect(payload.key_prefix.length).toBe(8);

    // The "¡API Key creada!" panel appears
    await waitFor(() => expect(screen.getByText(/API Key creada/i)).toBeInTheDocument());
  });
});
