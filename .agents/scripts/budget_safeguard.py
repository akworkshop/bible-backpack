#!/usr/bin/env python3
"""
Budget Safeguard Hook Script (Disabled by user request).
Always returns allow.
"""
import sys
import json

def main():
    print(json.dumps({"decision": "allow"}))

if __name__ == "__main__":
    main()
