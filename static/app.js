const $ = (id) => document.getElementById(id);
const sample = `09:00 Maya: Community lunch this Saturday. Shall we book the rooftop for 12 people?
09:02 Leo: Sounds good. I can bring lemonade.
09:03 Nia: The forecast looks uncertain. Is there an indoor option?
09:06 Maya: The library room is available at 1 PM. We can use that instead.
09:08 Leo: Yes, let's use the library. I'll still bring the lemonade.
09:10 Nia: Agreed. I'll bring bread and hummus for everyone.
09:11 Ravi: I might bring a board game if anyone wants to play.
09:13 Maya: Library room confirmed for Saturday at 1 PM. The rooftop is canceled.
09:14 Leo: Do we need to bring cups?
09:16 Nia: I have reusable cups. I'll bring them.
09:18 Maya: Please tell me about food allergies by Friday evening.
09:19 Ravi: Has anyone checked whether the library entrance has a ramp?
09:22 Leo: Not yet. Who can check that?
09:24 Maya: Small update: we're 10 people now, not 12.
09:25 Nia: Great. I'll adjust the food quantities for 10.
09:27 Leo: Lemonade and cups are covered. See you Saturday.`;
let current = null;
let busy = false;
function invalidateReview() {
  $("reviewed").checked = false;
  $("download").disabled = true;
  $("export-status").textContent = "Review the draft to enable download.";
}
function reset() {
  current = null;
  $("result").hidden = true;
  $("sources").hidden = true;
  $("empty").hidden = false;
  $("error").hidden = true;
  invalidateReview();
  $("count").textContent = `${$("thread").value.length.toLocaleString()} / 12,000 characters`;
}
$("thread").addEventListener("input", reset);
$("sample").addEventListener("click", () => { $("thread").value = sample; reset(); $("thread").focus(); });
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function render() {
  const root = $("digest-content");
  root.replaceChildren();
  for (const [key, title] of [["summary", "In two lines"], ["decisions", "Decided"], ["followups", "Still open"]]) {
    const group = element("section", undefined, "digest-group");
    group.append(element("h3", title));
    if (!current.digest[key].length) group.append(element("p", key === "decisions" ? "No confirmed decisions found." : "No open requests found. Check the original messages for omissions.", "no-items"));
    current.digest[key].forEach((item, index) => {
      const card = element("div", undefined, "digest-item");
      const field = element("textarea");
      field.value = item.text;
      field.maxLength = key === "summary" ? 280 : 220;
      field.rows = 2;
      field.setAttribute("aria-label", `${title} ${index + 1}`);
      field.addEventListener("input", () => { item.text = field.value; invalidateReview(); updateMetrics(); });
      const tools = element("div", undefined, "item-tools");
      const refs = element("div", undefined, "refs");
      item.lines.forEach((line) => {
        const ref = element("button", `Message ${line}`, "ref");
        ref.type = "button";
        ref.title = current.sources[line - 1];
        ref.addEventListener("click", () => {
          $("sources").open = true;
          document.querySelectorAll(".highlight").forEach((node) => node.classList.remove("highlight"));
          const source = $(`source-${line}`);
          source.classList.add("highlight");
          source.scrollIntoView({block: "center", behavior: "instant"});
          source.focus({preventScroll: true});
        });
        refs.append(ref);
      });
      tools.append(refs);
      if (key !== "summary") {
        const remove = element("button", "Remove", "remove");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${title.toLowerCase()} item ${index + 1}`);
        remove.addEventListener("click", () => { current.digest[key].splice(index, 1); invalidateReview(); render(); });
        tools.append(remove);
      }
      card.append(field, tools);
      group.append(card);
    });
    root.append(group);
  }
  updateMetrics();
}
function updateMetrics() {
  const digestWords = Object.values(current.digest).flat().map((item) => item.text).join(" ").trim().split(/\s+/).filter(Boolean).length;
  $("metrics").textContent = `${current.sources.length} messages · ${current.source_words} → ${digestWords} words · ${current.seconds}s generation`;
}
$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  reset();
  busy = true;
  $("generate").disabled = true;
  $("sample").disabled = true;
  $("thread").disabled = true;
  $("empty").hidden = true;
  $("loading").hidden = false;
  try {
    const response = await fetch("/api/digest", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({text: $("thread").value})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    current = data;
    $("source-list").replaceChildren();
    data.sources.forEach((text, index) => {
      const li = element("li", text);
      li.id = `source-${index + 1}`;
      li.tabIndex = -1;
      $("source-list").append(li);
    });
    $("source-count").textContent = `(${data.sources.length})`;
    $("sources").hidden = false;
    $("sources").open = false;
    render();
    $("result").hidden = false;
    $("digest-heading").tabIndex = -1;
    $("digest-heading").focus({preventScroll: true});
  } catch (error) {
    $("error").textContent = error.message === "Failed to fetch" ? "Cannot reach Quiet Catchup. Restart the app and retry." : error.message;
    $("error").hidden = false;
    $("empty").hidden = false;
  } finally {
    busy = false;
    $("generate").disabled = false;
    $("sample").disabled = false;
    $("thread").disabled = false;
    $("loading").hidden = true;
  }
});
$("reviewed").addEventListener("change", () => {
  $("download").disabled = !$("reviewed").checked;
  $("export-status").textContent = $("reviewed").checked ? "Ready to save. Your edits will be included." : "Review the draft to enable download.";
});
$("download").addEventListener("click", () => {
  if (!current || !$("reviewed").checked) return;
  const sections = ["Quiet Catchup — reviewed AI draft", "Checked by the person exporting. References identify messages, not a guarantee of accuracy."];
  for (const [key, title] of [["summary", "In two lines"], ["decisions", "Decided"], ["followups", "Still open"]]) {
    sections.push(`\n${title}\n${current.digest[key].map((item) => `- ${item.text} [messages ${item.lines.join(", ")}]`).join("\n") || "None found; check the original thread."}`);
  }
  sections.push("\nOriginal messages\n" + current.sources.map((line, index) => `${index + 1}. ${line}`).join("\n"));
  const url = URL.createObjectURL(new Blob([sections.join("\n\n")], {type: "text/plain;charset=utf-8"}));
  const link = element("a");
  link.href = url;
  link.download = "quiet-catchup.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("export-status").textContent = "Catchup downloaded, including the original messages.";
});
fetch("/api/health").then((response) => response.json()).then((data) => {
  $("health").textContent = data.ready ? "● Local model ready" : data.message;
}).catch(() => { $("health").textContent = "Local server unavailable. Reload to retry."; });
