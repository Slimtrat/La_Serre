import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { checkBoundaries } from "../../scripts/check-boundaries.mjs";

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const checker = path.resolve(fixtureRoot, "../../../scripts/check-boundaries.mjs");

test("accepte les dépendances via les API publiques", async () => {
  assert.deepEqual(await checkBoundaries(path.join(fixtureRoot, "allowed")), []);
});

test("refuse les imports interdits, les dépendances inversées et les fetch directs", async () => {
  const violations = await checkBoundaries(path.join(fixtureRoot, "forbidden"));
  assert.equal(violations.length, 4);
  assert.deepEqual(violations.map(({ sourceFile, specifier }) => [sourceFile.replaceAll("\\", "/"), specifier]), [
    ["app/shell.ts", "@features/catalog/components/private-card"],
    ["features/editor/model.ts", "@app/runtime"],
    ["features/editor/model.ts", "fetch"],
    ["shared/http.ts", "@features/catalog"],
  ]);
});
test("le CLI fait échouer npm check lorsqu'une frontière est violée", () => {
  const allowed = spawnSync(process.execPath, [checker, path.join(fixtureRoot, "allowed")], {
    encoding: "utf8",
  });
  const forbidden = spawnSync(process.execPath, [checker, path.join(fixtureRoot, "forbidden")], {
    encoding: "utf8",
  });

  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(forbidden.status, 1);
  assert.match(forbidden.stderr, /4 violation\(s\) de frontière/);
});
