#!/usr/bin/env bash
# Bash script to create or update labels using GitHub CLI (gh)
# Usage: run in repo root with GitHub CLI authenticated (gh auth login)

labels=(
  "feature:0e8a16:New feature or enhancement"
  "bugfix:d73a4a:Bug or defect"
  "chore:006b75:Maintenance tasks"
  "docs:0075ca:Documentation changes"
  "security:b60205:Security related"
)

for entry in "${labels[@]}"; do
  IFS=":" read -r name color desc <<< "$entry"
  if gh label view "$name" > /dev/null 2>&1; then
    gh label edit "$name" --color "$color" --description "$desc"
    echo "Updated label: $name"
  else
    gh label create "$name" --color "$color" --description "$desc"
    echo "Created label: $name"
  fi
done
