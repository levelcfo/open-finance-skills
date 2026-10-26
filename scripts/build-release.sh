#!/bin/sh
set -eu

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
release_dir="$root_dir/dist"
stage_dir="$release_dir/level-open-finance-skills"
version=$(cd "$root_dir" && node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version')
archive="$release_dir/level-open-finance-skills-v$version.zip"

(cd "$root_dir" && npm test)

rm -rf "$stage_dir"
mkdir -p "$stage_dir" "$release_dir"
cp "$root_dir/SKILL.md" "$root_dir/catalog.json" "$root_dir/README.md" "$root_dir/INSTALL.md" "$root_dir/ATTRIBUTION.md" "$root_dir/CITATION.cff" "$root_dir/LICENSE" "$root_dir/package.json" "$stage_dir/"
cp -R "$root_dir/skills" "$root_dir/examples" "$root_dir/src" "$root_dir/test" "$root_dir/scripts" "$stage_dir/"
rm -f "$archive" "$archive.sha256"
(cd "$release_dir" && zip -qr "$(basename "$archive")" "$(basename "$stage_dir")")
(cd "$release_dir" && shasum -a 256 "$(basename "$archive")" > "$(basename "$archive").sha256")
(cd "$root_dir" && node scripts/verify-release.mjs "$archive")
rm -rf "$stage_dir"
printf '%s\n' "$archive"
