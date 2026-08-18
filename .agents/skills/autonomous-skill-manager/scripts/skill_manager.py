"""
Autonomous Skill Manager Helper Script
Provides CLI and programmatic utilities to discover, scaffold, and validate Antigravity skills.
"""

import os
import sys
import argparse
import re

SKILLS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def list_skills():
    """List all workspace skills in .agents/skills."""
    if not os.path.exists(SKILLS_DIR):
        print(f"Skills directory not found: {SKILLS_DIR}")
        return
    
    print(f"\n[Autonomous Skill Manager] Workspace Skills at: {SKILLS_DIR}\n")
    skills = [d for d in os.listdir(SKILLS_DIR) if os.path.isdir(os.path.join(SKILLS_DIR, d))]
    for s in sorted(skills):
        skill_file = os.path.join(SKILLS_DIR, s, "SKILL.md")
        desc = "No description found"
        if os.path.exists(skill_file):
            try:
                with open(skill_file, "r", encoding="utf-8") as f:
                    content = f.read()
                    match = re.search(r"description:\s*>?-?\s*(.*?)(?=\n---|\n#|\Z)", content, re.DOTALL)
                    if match:
                        desc = match.group(1).strip().replace("\n", " ")
            except Exception:
                pass
        print(f"  * {s:<30} - {desc[:90]}...")
    print(f"\nTotal Workspace Skills: {len(skills)}\n")

def scaffold_skill(name, description, title=None):
    """Scaffold a new skill directory and template SKILL.md."""
    clean_name = re.sub(r"[^a-z0-9\-]", "", name.lower().replace(" ", "-").replace("_", "-"))
    skill_path = os.path.join(SKILLS_DIR, clean_name)
    
    if os.path.exists(skill_path):
        print(f"[!] Skill already exists at: {skill_path}")
        return skill_path
    
    os.makedirs(os.path.join(skill_path, "scripts"), exist_ok=True)
    os.makedirs(os.path.join(skill_path, "references"), exist_ok=True)
    
    title_str = title or clean_name.replace("-", " ").title()
    
    template = f"""---
name: {clean_name}
description: >-
  {description}
---

# {title_str}

## Overview
Briefly explain the core purpose of this skill and what workflows it accelerates.

## Step-by-Step Workflow
1. Step 1: Preparation & analysis.
2. Step 2: Implementation & configuration.
3. Step 3: Automated verification & testing.

## Code Patterns & Best Practices
```python
# Standard code patterns and conventions here
```

## Verification & QA Checklist
- [ ] Requirements verified.
- [ ] No regression or focus errors.
- [ ] Clean lifecycle management.
"""

    skill_file = os.path.join(skill_path, "SKILL.md")
    with open(skill_file, "w", encoding="utf-8") as f:
        f.write(template)
    
    print(f"[+] Successfully scaffolded new skill: {clean_name}")
    print(f"    Path: {skill_file}")
    return skill_path

def validate_skill(name):
    """Validate a skill's structure and frontmatter."""
    clean_name = name.lower()
    skill_path = os.path.join(SKILLS_DIR, clean_name)
    skill_file = os.path.join(skill_path, "SKILL.md")
    
    if not os.path.exists(skill_file):
        print(f"[x] SKILL.md missing for: {name}")
        return False
    
    with open(skill_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    has_frontmatter = content.startswith("---") and "\n---" in content[3:]
    has_name = "name:" in content
    has_desc = "description:" in content
    
    if has_frontmatter and has_name and has_desc:
        print(f"[✓] Skill '{clean_name}' is valid and ready for auto-activation.")
        return True
    else:
        print(f"[x] Skill '{clean_name}' has invalid or incomplete YAML frontmatter.")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Autonomous Skill Manager")
    parser.add_argument("--list", action="store_true", help="List all workspace skills")
    parser.add_argument("--create", type=str, help="Name of the skill to scaffold")
    parser.add_argument("--desc", type=str, default="Specialized instructions for this domain.", help="Skill description")
    parser.add_argument("--validate", type=str, help="Validate a skill")
    
    args = parser.parse_args()
    if args.list:
        list_skills()
    elif args.create:
        scaffold_skill(args.create, args.desc)
    elif args.validate:
        validate_skill(args.validate)
    else:
        list_skills()
