// Chạy: node --test scripts/publish-template.test.mjs (cần tag kit-v1.4.0, kit-v1.4.1 trong repo kit)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { publishTemplate } from "./publish-template.mjs";

const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8" }).trim();

test("phát hành 2 bản nối tiếp vào repo template: app ở gốc, giữ bit +x, .kit.json đúng, không phát hành trùng", () => {
  const bare = mkdtempSync(join(tmpdir(), "tmpl-remote-"));
  git(bare, "init", "-q", "--bare", "-b", "main");

  const first = publishTemplate({ version: "1.4.0", remoteUrl: bare, push: true });
  assert.equal(first.parent, null);
  const second = publishTemplate({ version: "1.4.1", remoteUrl: bare, push: true });
  assert.equal(second.parent, first.commit);

  const top = git(bare, "ls-tree", "--name-only", "main");
  for (const f of ["package.json", ".github", "apps", "infra", ".kit.json", "CLAUDE.md"]) assert.match(top, new RegExp(`^${f.replace(".", "\\.")}$`, "m"));
  assert.doesNotMatch(top, /^template$/m);
  assert.match(git(bare, "ls-tree", "main", "infra/deploy.sh"), /^100755 /);
  assert.equal(JSON.parse(git(bare, "show", "main:.kit.json")).version, "1.4.1");
  assert.equal(git(bare, "rev-list", "-n", "1", "refs/tags/kit-v1.4.1"), second.commit);
  assert.equal(git(bare, "rev-list", "--count", "main"), "2");

  assert.throws(() => publishTemplate({ version: "1.4.1", remoteUrl: bare, push: true }), /đã có tag kit-v1\.4\.1/);
  assert.throws(() => publishTemplate({ version: "9.9.9", remoteUrl: bare }), /kit-v9\.9\.9/);
});
