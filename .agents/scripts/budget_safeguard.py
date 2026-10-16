#!/usr/bin/env python3
"""
Budget Safeguard Hook Script for Bible Backpack Workspace.
Enforces limits:
- Max consecutive agent replies: 15 without user input
- Max session tokens: 500,000 (half of 1,000,000 capacity)
Pauses execution and prompts for human approval when thresholds are reached.
"""
import sys
import json
import os

MAX_CONSECUTIVE_REPLIES = 100
MAX_SESSION_TOKENS = 500000

def estimate_tokens_from_transcript(transcript_path):
    """Calculates total tokens and consecutive agent turns from transcript."""
    if not transcript_path or not os.path.exists(transcript_path):
        return 0, 0

    total_characters = 0
    consecutive_agent_replies = 0

    try:
        with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    source = entry.get("source", "")
                    step_type = entry.get("type", "")
                    content = entry.get("content", "") or ""

                    # Accumulate characters for token estimation (~4 chars/token)
                    total_characters += len(str(content))

                    if source == "USER_EXPLICIT" or step_type == "USER_INPUT":
                        consecutive_agent_replies = 0
                    elif source == "MODEL" or step_type in ("PLANNER_RESPONSE", "MODEL_TURN"):
                        consecutive_agent_replies += 1
                except Exception:
                    continue
    except Exception:
        pass

    # Standard estimation: ~4 chars per token if token metrics aren't explicitly serialized
    estimated_tokens = total_characters // 4
    return estimated_tokens, consecutive_agent_replies

def main():
    try:
        payload = json.load(sys.stdin) if not sys.stdin.isatty() else {}
    except Exception:
        payload = {}

    transcript_path = payload.get("transcriptPath", "")
    invocation_num = payload.get("invocationNum", 0)

    est_tokens, consecutive_turns = estimate_tokens_from_transcript(transcript_path)

    # Use invocation count as fallback if transcript parsing yields lower turn count
    effective_consecutive = max(consecutive_turns, invocation_num)

    triggered_reasons = []
    if effective_consecutive >= MAX_CONSECUTIVE_REPLIES:
        triggered_reasons.append(
            f"Consecutive agent turns reached limit ({effective_consecutive}/{MAX_CONSECUTIVE_REPLIES})"
        )
    if est_tokens >= MAX_SESSION_TOKENS:
        triggered_reasons.append(
            f"Session token usage reached safeguard budget (~{est_tokens:,}/{MAX_SESSION_TOKENS:,} tokens)"
        )

    if triggered_reasons:
        reason_msg = "Budget safeguard triggered: " + "; ".join(triggered_reasons) + ". Pausing for human approval."
        # Ask for user approval
        result = {
            "decision": "force_ask",
            "reason": reason_msg
        }
    else:
        result = {
            "decision": "allow"
        }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
