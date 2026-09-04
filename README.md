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
- Version 0.3.5 adapts the workbench to mobile and cloud-SillyTavern screens: it uses a full-height mobile panel, safe-area padding, touch-sized controls, and contained scrolling. Background, relationship, and trope chips are sorted with Chinese pinyin collation.
- Generation uses the ordinary text-generation path and parses the result locally, so it does not require `json_schema` support from the API gateway.
- Generation uses the API, model, preset, and World Info pipeline currently selected in SillyTavern.
- On the configuration page, **Use foreground streaming generation** controls the Outline and NPC stages. When it is off, those drafts use quiet structured requests and do not add messages to the chat. When it is on, the extension uses SillyTavern's normal foreground generation pipeline, so it follows the current API's native streaming setting. The resulting structured outline/NPC draft deliberately remains in the chat and is marked as a Story Outline Studio draft.
- Story continuation always uses SillyTavern's foreground generation pipeline and therefore follows the normal streaming setting when the selected API supports it.
- Import a reference character card or a World Info JSON, then choose **Create and attach parallel IF World Info**. The extension creates a dedicated composite World Info book, clones the currently attached chat book into it, adds the imported references, and binds that composite to the current chat. It does not modify or erase the source World Info book. This lets SillyTavern's normal World Info pipeline see the imported character/world setting during an IF story.
- Short/medium/long are pacing and interaction-length modes, not hard outline character limits. The extension preserves all five outline sections and does not locally cut off an ending or an NSFW node.
- Network/TLS errors are reported as failures between the local SillyTavern runtime and the upstream API. The extension retries only an empty successful response once; it does not retry a network failure.
- NPC output that ends before the closing XML-style tag is preserved as an editable draft. In NP mode, a one-character response triggers one focused request for missing characters without rewriting the first result.
- A character card cannot install this extension automatically. Install the extension from this repository first.
- Version 0.3.3 fixes compact single-line NPC field responses where an `aliases: [...]` array could be mistaken for the whole NPC object. The full NPC field block is now used as a fallback, so the generated character remains available for review instead of triggering a misleading repair request.
- Version 0.3.2 improves nested gateway error reporting, stops retries for `Service Unavailable`, and collapses nameless partial NPC responses into one editable draft.
- Version 0.3.4 moved Story-stage continuation to SillyTavern's normal foreground generation path. The generated story message is rendered and saved by SillyTavern, and follows normal streaming when the selected API supports it.
- In SillyTavern 1.17, quiet generation is explicitly excluded from the core streaming processor. Version 0.3.5 therefore provides a real tradeoff rather than a fake token stream: quiet structured output without chat messages, or foreground native streaming with a retained structured draft message.
