# Story Outline Studio

SillyTavern third-party extension for creating and managing interactive story outlines, user personas, NPC profiles, and outline-driven story progression.

## Install

1. Open SillyTavern.
2. Open **Extensions** and choose **Install Extension**.
3. Paste this repository's GitHub URL.
4. Restart or refresh SillyTavern after installation.

The companion character card and TavernHelper entry script can be imported separately after the extension is installed.

## Update

Use SillyTavern's extension update function, then refresh the page.

## Compatibility

- SillyTavern 1.17 or later is supported. SillyTavern 1.18 or later is recommended.
- Generation uses the ordinary text-generation path and parses the result locally, so it does not require `json_schema` support from the API gateway.
- Generation uses the API, model, preset, and World Info pipeline currently selected in SillyTavern.
- Short/medium/long are pacing and interaction-length modes, not hard outline character limits. The extension preserves all five outline sections and does not locally cut off an ending or an NSFW node.
- Network/TLS errors are reported as failures between the local SillyTavern runtime and the upstream API. The extension retries only an empty successful response once; it does not retry a network failure.
- NPC output that ends before the closing XML-style tag is preserved as an editable draft. In NP mode, a one-character response triggers one focused request for missing characters without rewriting the first result.
- A character card cannot install this extension automatically. Install the extension from this repository first.
- Version 0.3.3 fixes compact single-line NPC field responses where an `aliases: [...]` array could be mistaken for the whole NPC object. The full NPC field block is now used as a fallback, so the generated character remains available for review instead of triggering a misleading repair request.
- Version 0.3.2 improves nested gateway error reporting, stops retries for `Service Unavailable`, and collapses nameless partial NPC responses into one editable draft.
