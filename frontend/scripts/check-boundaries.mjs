import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const IMPORT_PATTERN = /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s*)?["']([^"']+)["']|\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;

function withoutExtension(value) {
  const extension = path.posix.extname(value);
  return SOURCE_EXTENSIONS.has(extension) ? value.slice(0, -extension.length) : value;
}

function sourcePathForSpecifier(sourceFile, specifier) {
  const normalizedSource = sourceFile.split(path.sep).join("/");
  const sourceDirectory = path.posix.dirname(normalizedSource);
  if (specifier.startsWith(".")) return withoutExtension(path.posix.normalize(path.posix.join(sourceDirectory, specifier)));
  const aliases = [["@/", ""], ["@app/", "app/"], ["@shared/", "shared/"], ["@features/", "features/"]];
  for (const [prefix, replacement] of aliases) {
    if (specifier.startsWith(prefix)) return withoutExtension(replacement + specifier.slice(prefix.length));
  }
  if (["@app", "@shared", "@features"].includes(specifier)) return specifier.slice(1);
  return null;
}

function layerOf(sourcePath) {
  const parts = sourcePath.split("/");
  if (parts[0] === "features" && parts[1]) return { layer: "feature", feature: parts[1] };
  if (parts[0] === "shared") return { layer: "shared" };
  if (parts[0] === "app") return { layer: "app" };
  return { layer: "other" };
}

function isPublicFeaturePath(targetPath) {
  const parts = targetPath.split("/");
  return parts.length === 2 || (parts.length === 3 && parts[2] === "index");
}

export function findBoundaryViolations(sourceFile, sourceText) {
  const source = layerOf(sourceFile.split(path.sep).join("/"));
  const violations = [];
  for (const match of sourceText.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2];
    const targetPath = sourcePathForSpecifier(sourceFile, specifier);
    if (!targetPath) continue;
    const target = layerOf(targetPath);
    let reason = null;
    if (source.layer === "shared" && (target.layer === "feature" || target.layer === "app")) reason = `shared ne peut pas dépendre de ${target.layer}`;
    else if (source.layer === "feature" && target.layer === "app") reason = "une feature ne peut pas dépendre de app";
    else if (target.layer === "feature") {
      const crossesFeature = source.layer !== "feature" || source.feature !== target.feature;
      if (crossesFeature && !isPublicFeaturePath(targetPath)) reason = `les internals de la feature ${target.feature} ne sont pas publics`;
    }
    if (reason) {
      const line = sourceText.slice(0, match.index).split("\n").length;
      violations.push({ sourceFile, line, specifier, reason });
    }
  }
  if (source.layer === "feature") {
    for (const match of sourceText.matchAll(/(?<![\w.])fetch\s*\(/g)) {
      const line = sourceText.slice(0, match.index).split("\n").length;
      violations.push({
        sourceFile,
        line,
        specifier: "fetch",
        reason: "une feature doit passer par le client partagé @shared/api",
      });
    }
  }
  if (!(source.layer === "shared" && sourceFile.replaceAll("\\", "/").startsWith("shared/legacy/"))) {
    for (const match of sourceText.matchAll(/\bwindow\.Serre[A-Za-z0-9_]*/g)) {
      const line = sourceText.slice(0, match.index).split("\n").length;
      violations.push({
        sourceFile,
        line,
        specifier: match[0],
        reason: "les globals historiques sont réservés à shared/legacy",
      });
    }
  }
  return violations;
}

async function sourceFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path.join(directory, entry.name), relative));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(relative);
  }
  return files;
}

export async function checkBoundaries(sourceRoot) {
  const violations = [];
  for (const relativeFile of await sourceFiles(sourceRoot)) {
    const contents = await readFile(path.join(sourceRoot, relativeFile), "utf8");
    violations.push(...findBoundaryViolations(relativeFile, contents));
  }
  return violations;
}

async function main() {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const sourceRoot = path.resolve(process.argv[2] ?? path.join(scriptDirectory, "..", "src"));
  const violations = await checkBoundaries(sourceRoot);
  if (violations.length === 0) {
    console.log(`Frontières d'architecture respectées (${sourceRoot}).`);
    return;
  }
  console.error(`${violations.length} violation(s) de frontière :`);
  for (const violation of violations) console.error(`- ${violation.sourceFile}:${violation.line} importe "${violation.specifier}" : ${violation.reason}`);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
