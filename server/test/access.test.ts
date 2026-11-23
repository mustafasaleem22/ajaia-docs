import test from "node:test";
import assert from "node:assert/strict";
import { canEdit, canManageSharing, resolveRole } from "../access";

test("owner has full control", () => {
  const role = resolveRole(1, 1, null);
  assert.equal(role, "owner");
  assert.equal(canEdit(role), true);
  assert.equal(canManageSharing(role), true);
});

test("editor can edit but not manage sharing", () => {
  const role = resolveRole(1, 2, "editor");
  assert.equal(role, "editor");
  assert.equal(canEdit(role), true);
  assert.equal(canManageSharing(role), false);
});

test("viewer is read-only", () => {
  const role = resolveRole(1, 3, "viewer");
  assert.equal(role, "viewer");
  assert.equal(canEdit(role), false);
  assert.equal(canManageSharing(role), false);
});

test("users with no share have no access, and bad roles are ignored", () => {
  assert.equal(resolveRole(1, 4, null), null);
  assert.equal(resolveRole(1, 4, "admin"), null);
  assert.equal(canEdit(null), false);
});
