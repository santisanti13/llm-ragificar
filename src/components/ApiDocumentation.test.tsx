import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiDocumentation } from "./ApiDocumentation";

// Mock the Vite env so baseUrl is deterministic
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

const PROJECT_ID = "27b2195a-d882-43bc-9e22-acda40d913d8";

describe("ApiDocumentation - regression: project_id wiring", () => {
  it("inyecta el project_id en todos los snippets (cURL, JS, Python) y construye la URL del endpoint", () => {
    const { container } = render(<ApiDocumentation projectId={PROJECT_ID} />);

    // The full source of all <pre> code blocks
    const allCode = Array.from(container.querySelectorAll("pre, code"))
      .map((n) => n.textContent || "")
      .join("\n");

    // Endpoint URL must reference VITE_SUPABASE_URL + /functions/v1/api-query
    expect(allCode).toContain("https://test.supabase.co/functions/v1/api-query");

    // The project_id must be present at least 3 times (cURL + JS + Python)
    const occurrences = (allCode.match(new RegExp(PROJECT_ID, "g")) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(3);

    // x-api-key header documented
    expect(allCode.toLowerCase()).toContain("x-api-key");

    // No literal placeholder leaked
    expect(allCode).not.toContain("${projectId}");
  });

  it("actualiza la documentación cuando cambia projectId (re-render)", () => {
    const { rerender, container } = render(<ApiDocumentation projectId="proj-a" />);
    expect(container.textContent).toContain("proj-a");

    rerender(<ApiDocumentation projectId="proj-b" />);
    expect(container.textContent).toContain("proj-b");
    expect(container.textContent).not.toContain('"project_id": "proj-a"');
  });
});
