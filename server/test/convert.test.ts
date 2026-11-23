import test from "node:test";
import assert from "node:assert/strict";
import { fileToDocument, markdownToHtml, textToHtml, UnsupportedFileError } from "../convert";

test("plain text is escaped and split into paragraphs", () => {
  const html = textToHtml("Hello <b>world</b>\nsecond line\n\nNew paragraph");
  assert.ok(html.includes("&lt;b&gt;world&lt;/b&gt;"));
  assert.ok(html.includes("<br>"));
  assert.equal(html.match(/<p>/g)?.length, 2);
});

test("markdown keeps structure but scripts are stripped", () => {
  const html = markdownToHtml("# Title\n\n- one\n- two\n\n<script>alert(1)</script>");
  assert.ok(html.includes("<h1>"));
  assert.ok(html.includes("<li>"));
  assert.ok(!html.includes("<script"));
});

test("a .txt upload becomes a titled document", async () => {
  const doc = await fileToDocument("meeting notes.txt", Buffer.from("Agenda\n\nItem one"));
  assert.equal(doc.title, "meeting notes");
  assert.ok(doc.html.includes("<p>Agenda</p>"));
});

test("unsupported file types are rejected with a clear error", async () => {
  await assert.rejects(
    () => fileToDocument("photo.png", Buffer.from("x")),
    (err: unknown) => err instanceof UnsupportedFileError && /Unsupported file type/.test(err.message),
  );
});
