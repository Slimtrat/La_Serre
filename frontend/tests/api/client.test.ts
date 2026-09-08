import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, healthHealthGet, orvalFetch } from "../../src/shared/api";

function response(body: BodyInit | null, status = 200, contentType = "application/json") {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("transport Orval partagé", () => {
  it("alimente une fonction générée avec une réponse JSON typée", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response('{"status":"ok"}'));
    vi.stubGlobal("fetch", fetchMock);

    const result = await healthHealthGet();

    expect(result.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith(
      "/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("retourne une réponse binaire", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        response(new Uint8Array([1, 2, 3]), 200, "application/octet-stream"),
      ),
    );

    const result = await orvalFetch<Blob>("/exports/one", { method: "GET" });

    expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it.each([
    [409, "CONFLICT", "Le document a changé"],
    [503, "UNAVAILABLE", "Service indisponible"],
  ])("normalise une erreur HTTP %i", async (status, code, detail) => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        response(JSON.stringify({ code, detail }), status),
      ),
    );

    const error = await healthHealthGet().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, code, detail, data: { code, detail } });
  });

  it("expose les données de validation d'une réponse 422 FastAPI", async () => {
    const validation = [{ loc: ["body", "name"], msg: "Field required", type: "missing" }];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        response(JSON.stringify({ detail: validation }), 422),
      ),
    );

    const error = await healthHealthGet().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, validation });
  });

  it("conserve un corps d'erreur non JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        response("Bad gateway from proxy", 503, "text/html"),
      ),
    );

    const error = await healthHealthGet().catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      status: 503,
      detail: "Bad gateway from proxy",
      data: "Bad gateway from proxy",
    });
  });

  it("propage l'annulation sans la convertir en ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation((_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted", "AbortError")),
          );
        }),
      ),
    );
    const controller = new AbortController();
    const pending = healthHealthGet({ signal: controller.signal });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});