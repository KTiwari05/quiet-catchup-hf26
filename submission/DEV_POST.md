*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).*

## What I Built

A group conversation starts with a rooftop lunch for twelve. A few messages later, it is a library lunch for ten. Someone has answered the question about cups, but nobody has checked the entrance ramp. Catching up means separating the final plan from the suggestions it replaced.

**Quiet Catchup** makes a small, local reading workspace for that job. Paste messages, one per line, and Qwen3 4B produces two summary sentences, a few decisions, and the requests still open. Each item has buttons that open the original messages it cites.

The intended user is someone returning to a busy group chat who wants a starting point before rereading everything. The app does not connect to a messaging account or monitor a conversation. You choose what to paste. You can edit the draft, remove weak items, check its references, and download a text file containing the draft and originals.

The project was created from scratch on October 21, during this challenge window. It is separate from my earlier challenge projects.

## Demo

[Watch the 56-second silent browser walkthrough](https://github.com/KTiwari05/quiet-catchup-hf26/blob/main/submission/demo/quiet-catchup-walkthrough.webm).

![Quiet Catchup with a fictional conversation ready to summarize](https://raw.githubusercontent.com/KTiwari05/quiet-catchup-hf26/main/submission/demo/01-planner.png)

The recording starts after a real local model reply. It shows opening a source reference, correcting overconfident wording, checking review, and downloading the result. Generation waiting is omitted. An unused gray recording margin was cropped; the application content and action timing were retained.

This is a local application demo. It is not a hosted inference service. All conversations used in testing are fictional.

## Code

[Source, setup instructions, tests, and verification evidence on GitHub](https://github.com/KTiwari05/quiet-catchup-hf26).

Install Python 3.11+ and Ollama, download `qwen3:4b`, keep Ollama running, then run `python app.py` and open the printed local address. There are no Python or JavaScript application packages to install. Application code is MIT licensed; model weights are installed separately.

## How I Built It

The interface is plain HTML, CSS, and JavaScript. A Python standard-library server numbers the pasted message lines, then sends them to Ollama's local `/api/chat` endpoint. The [structured-output API](https://docs.ollama.com/capabilities/structured-outputs) constrains the reply to a JSON schema.

```text
Pasted messages → numbered lines → local Qwen3 4B
                                → JSON and reference-ID checks
                                → editable draft beside original messages
                                → person reviews → text download
```

The model does the central interpretation: which plan replaced another, which question has an answer, and what deserves space in a short digest. There is no canned digest if inference fails.

The server checks the reply's structure, item counts, text lengths, and reference IDs. A citation to message 99 in a sixteen-message conversation is rejected. That check is deliberately narrow: an existing message can still be misread.

Two DEV posts helped sharpen that boundary. [Ranknod's “Check AI Citations Against Retrieved Source IDs”](https://dev.to/ranknod/check-ai-citations-against-retrieved-source-ids-3hi8) separates ID validity from claim support. [Enhanciar's “Your AI cited a real file. It still lied to you.”](https://dev.to/enhanciar_ai_96a4ba4877e3/how-we-make-an-llm-cite-every-answer-down-to-fileline-and-check-the-citation-is-telling-the-truth-hmj) examines the gap between a real reference and a supported assertion. This implementation is independent; no code was copied from those posts.

A live failure made the review step concrete. The source said, “I'll adjust the food quantities for 10.” The model wrote that the quantities were already adjusted. Its message references were real, so the structural checks passed.

I added a prompt instruction to preserve future tense. A later browser run still made the same mistake. The demo therefore shows changing the wording to “plans to adjust,” rather than presenting the prompt change as a fix that guarantees correctness. The unedited reply, edited reply, and downloaded text are preserved in the repository.

Thirteen automated tests passed, covering input and output boundaries, malformed and truncated replies, invalid references, HTTP behavior, and unavailable inference. Separate real-model checks preserved a changed meeting time and omitted an already-answered booking question. A disagreement example retained the unresolved time choice, but incorrectly placed “no agreement” under decisions. These are useful examples, not a general accuracy or security benchmark.

Browser checks covered generation, source navigation and keyboard focus, editing, removal, review invalidation, downloads, and source changes clearing an old digest. Planner and result layouts fit a 375-pixel viewport without horizontal overflow.

## Why Does Open Innovation Matter?

[Qwen3 4B's open weights](https://huggingface.co/Qwen/Qwen3-4B) perform the actual compression and interpretation. Ollama runs them on the same computer as the app. After downloading the software and weights, the inference path uses local endpoints and needs no paid model account.

That is useful for a workflow involving personal messages: you can choose local processing without needing to host a model server elsewhere. The prompt, output contract, and application code are inspectable and changeable. A different local model can be configured, although only Qwen3 4B was tested.

There is a tradeoff. CPU inference is slow on this computer, and open weights do not prevent misleading summaries. The app itself does not store conversations or log their text; exporting explicitly saves the draft and original messages. Browser, operating-system, and Ollama behavior are outside that application-level storage guarantee.

## My Agent Session

Codex implemented and tested this project and prepared this article under my instruction to complete and submit the challenge. This article was authored and published autonomously with AI involvement disclosed. No public agent-session transcript is linked. The repository contains the verification record and fictional test fixtures instead.

## The Lazy Payoff

The first sixteen-message example contained 175 words. Its generated summary, decisions, and open requests contained 67 words in total. A later run produced 98 words from the same input. The intended payoff is fewer messages to scan before checking the relevant originals.

Those numbers measure compression, not time saved. The first generation took **149.23 seconds**; the later browser run took **102.05 seconds**. Two shorter live checks took **53.94** and **33.27 seconds**. On this hardware, waiting can take longer than reading a short thread.

I have not run a user study or measured a person's time savings. Quiet Catchup is a prototype for reducing repeated reading effort, with visible references and a review step. Whether that tradeoff helps on a particular conversation still needs testing.

## Prize Categories

This submission enters the overall challenge. It uses Qwen and Ollama and does not claim a partner prize category.

