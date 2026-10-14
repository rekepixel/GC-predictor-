#!/usr/bin/env python3
"""Audit the existing classifications without regenerating historical evidence.

The previous script is retained as curate_concepts_legacy.py for reproducibility.
Its wording-based confidence is withdrawn. Original sealed artifacts are kept.
"""
from audit_concepts import run
if __name__ == "__main__":
    run()
