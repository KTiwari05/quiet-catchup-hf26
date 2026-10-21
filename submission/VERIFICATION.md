# Verification — October 21, 2026

## Automated checks

`python -m unittest -v`: **13 tests passed**. These cover input size and line
limits, blank lines and numbering, invalid/missing/duplicate/boolean reference
IDs, output shape and text length, Unicode, model adapter parsing and reasoning
prefixes, truncation, invalid JSON, static serving/path traversal, foreign Host
and Origin values, invalid HTTP requests before inference, and an unreachable
Ollama response. Model responses in these tests are mocked.

`python -m py_compile app.py` and `node --check static/app.js`: passed.

## Real local inference

Installed model: `qwen3:4b`, Q4_K_M, digest
`359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7`.
Ollama used CPU inference, an 8192-token context, non-streaming structured
output, temperature 0, and thinking disabled. All examples are fictional.

| Check | Result | Generation time |
| --- | --- | --- |
| First lunch conversation | Correct final venue and headcount; two open requests; overstated planned food adjustment as completed | 149.23 s |
| Changed meeting and answered booking request | Kept cafe/Saturday/7 PM; omitted already-answered booking request from follow-ups; retained unresolved access question | 53.94 s |
| Disagreement plus embedded instruction | Did not claim agreement; retained unresolved time choice; mislabeled absence of agreement as a decision | 33.27 s |
| Final browser lunch generation | 16 messages, 175 input words, 98 digest words; final venue and headcount kept; future-food wording still overstated | 102.05 s |

The initial lunch reply contained 67 digest words from 175 input words. This is
text compression, **not measured time saved**. The last lunch reply had 98
digest words. These tiny examples are not a benchmark. On this computer,
waiting for generation can take longer than reading a short conversation.

After the first run, the prompt was changed to preserve future tense. The final
browser run still said food quantities were "adjusted" despite "I'll adjust"
in the source. Prompt wording did not eliminate this failure. The public demo
uses the first real reply and shows the correction to "plans to adjust" in
both affected fields. `first-live-reply.json`, `reviewed-reply.json`, and
`reviewed-catchup.txt` preserve the before/after evidence.

## Real browser checks

Performed using Chromium through Playwright CLI against the actual local app.
The final browser run called the real model; no response mock was used.

- Example loading, loading state, generation and result rendering worked.
- A source-reference click opened the original messages, highlighted the right
  message, scrolled it into view, and moved keyboard focus to it.
- Export was initially disabled. Checking review enabled it; editing cleared
  review and disabled download. Removing an item updated the draft.
- The text download included edits, references, and all original messages.
- Editing the original conversation hid the old digest and references.
- Planner and generated-digest views fit a 375 × 812 viewport without
  horizontal overflow. Screenshots are under `demo/`.
- The initial missing-favicon console error was fixed with an inline favicon;
  the reloaded final page had no reported console errors.

The first browser recording is a silent 56-second walkthrough after real
generation, showing a reference, wording correction, review, and download.
An unused gray recording margin was cropped; application content and action
timing were retained. Selected video frames were visually inspected.

## Boundaries

No real user's private conversation was used. No actual user time savings,
long-thread completeness, multilingual quality, accessibility audit,
cross-browser behavior, offline OS isolation, or general prompt-injection
resistance was established. One embedded-instruction example is not a security
proof. Message-ID validation does not establish semantic support. The service
is a local prototype, not a production deployment. Only Qwen3 4B was tested.

The final UI automation also changed/deleted arbitrary draft fields to verify
state transitions. Its downloaded file is a technical fixture kept under
ignored `output/`; it is not presented as a factually reviewed digest.
