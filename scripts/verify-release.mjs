import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const archive = resolve(process.argv[2]);
const version = JSON.parse(readFileSync(join(root, "package.json"))).version;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const digest = sha256(readFileSync(archive));
if (readFileSync(`${archive}.sha256`, "utf8").split(/\s/)[0] !== digest) throw new Error("ZIP checksum mismatch");
const scratch = mkdtempSync(join(tmpdir(), "level-open-finance-install-"));
try {
  const entries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).trim().split("\n");
  if (entries.some((entry) => !entry.startsWith("level-open-finance-skills/") || entry.split("/").includes(".."))) throw new Error("unexpected ZIP entry outside bundle");
  execFileSync("unzip", ["-q", archive, "-d", scratch]);
  const installed = join(scratch, "level-open-finance-skills");
  const manifest = JSON.parse(readFileSync(join(installed, "catalog.json")));
  if (manifest.version !== version || manifest.skills.length !== 20) throw new Error("installed catalog mismatch");
  const paths = [];
  function walk(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) walk(path); else paths.push(relative(installed, path));
    }
  }
  walk(installed);
  const expected = [];
  function required(path) {
    if (statSync(path).isDirectory()) {
      for (const item of readdirSync(path)) required(join(path, item));
    } else expected.push(relative(root, path));
  }
  for (const path of [...JSON.parse(readFileSync(join(root, "package.json"))).files, "package.json"]) required(join(root, path));
  if (paths.some((path) => path.split(/[\\/]/).some((part) => part.startsWith(".")))) throw new Error("hidden file in installation");
  if (JSON.stringify(paths.sort()) !== JSON.stringify(expected.sort())) throw new Error("installed file inventory mismatch");
  for (const path of paths) {
    if (!readFileSync(join(root, path)).equals(readFileSync(join(installed, path)))) throw new Error(`installed bytes differ: ${path}`);
  }
  const log = execFileSync("npm", ["test"], { cwd: installed, encoding: "utf8" });
  if (!log.includes("# fail 0")) throw new Error("installed outcome tests did not finish");
  console.log(JSON.stringify({ version, archive, sha256: digest, installedSkills: manifest.skills.length, installedFiles: paths.length, installedOutcomeTests: "pass" }));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
