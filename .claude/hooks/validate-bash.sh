#!/usr/bin/env bash
# PreToolUse (Bash): block destructive / unsafe command patterns.
# Claude Code: exit 0 = allow, exit 2 = block (stderr fed back to the model).
# Input: JSON on stdin with tool_input.command

set -euo pipefail

INPUT="$(cat || true)"
CMD=""

if command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
else
  # fallback: crude extract
  CMD="$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
fi

# Also accept a bare command string as argv[1] for manual testing
if [[ -z "$CMD" && $# -ge 1 ]]; then
  CMD="$*"
fi

if echo "$CMD" | grep -Eiq 'git[[:space:]]+push[[:space:]]+.*--force|git[[:space:]]+reset[[:space:]]+--hard|rm[[:space:]]+-rf[[:space:]]+/|curl[[:space:]]+[^|]*\|[[:space:]]*(ba)?sh'; then
  echo "Blocked unsafe command pattern: $CMD" >&2
  exit 2
fi

exit 0
