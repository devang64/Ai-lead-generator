#!/usr/bin/env python3
"""
Lead Generator V2 - Quality-First Sales Intelligence System
Main entrypoint script.
"""

import os
import sys

# Ensure current directory is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lead_generator.cli import main

if __name__ == "__main__":
    main()
