# Source Repo Workflow

Handles all source-control operations for the Aivora project: branching, committing, pushing, and opening PRs.

## Hard rules — never violate these

1. **No commits to `main`.** Every change goes through a PR from a dedicated branch. `main` is read-only.
2. **Use Sapling (`sl`) for all SCM operations.** Never run raw `git` commands (no `git commit`, `git push`, `git add`, `git checkout`, etc.). The VCS is Sapling; its CLI is `sl`.
3. **All PRs are submitted as drafts.** Always pass `--draft` to `gh pr create`.
4. **Summarize before submitting.** Before running `gh pr create`, print a brief summary of what the PR contains and ask the user to confirm or adjust — then create it.

## Branch naming

Follow the project conventions:
- `feature/<short-description>` — new functionality
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — maintenance, deps, config

## Step-by-step workflow

### 1. Verify you are NOT on main
```
sl bookmark   # confirm current bookmark is not main / murali
```
If on `main` / `murali`, create a new bookmark first (step 2) before touching any files.

### 2. Create a bookmark for the work
```
sl bookmark feature/<description>
```
This sets the bookmark at the current commit — no need to "check it out" separately in Sapling.

### 3. Stage and commit
Sapling tracks files automatically; use `sl add` only for untracked new files:
```
sl add <new-file> [<new-file> ...]   # only needed for brand-new files
sl commit -m "<message>"
```

Commit message format (Conventional Commits):
```
<type>: <short imperative summary>

<optional body — what and why, not how>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 4. Push the bookmark
```
sl push --to <bookmark-name>
```

### 5. Summarize the PR (required before creating)
Print a plain-English summary covering:
- What changed and why
- Which files are affected
- Any migrations, config changes, or manual steps required

Ask the user: "Does this summary look right? Should I open the draft PR?"

### 6. Create the draft PR
Because there is no `.git` directory, always pass `--repo` and `--head` explicitly:
```
gh pr create \
  --draft \
  --repo mchepuri/aivora \
  --head <bookmark-name> \
  --base main \
  --title "<Conventional Commit title>" \
  --body "$(cat <<'EOF'
## Summary
<bullet points from step 5>

## Test plan
- [ ] <happy path>
- [ ] <error / edge case>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## What NOT to do

- `git init` — the repo already uses Sapling (`.sl`); never create a `.git` directory
- `git add / git commit / git push` — use `sl` equivalents
- `gh pr create` without `--draft` — all PRs start as drafts
- `gh pr create` without `--repo mchepuri/aivora --head <branch>` — gh cannot detect the repo without `.git`
- Commit directly to `main` or the `murali` bookmark — always branch first
