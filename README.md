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
- A character card cannot install this extension automatically. Install the extension from this repository first.
