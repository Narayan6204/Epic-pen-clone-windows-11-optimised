---
name: omni-architect-orchestrator
description: >-
  Advanced multi-agent orchestration and elite problem-solving skill that elevates Gemini beyond Claude Opus / Claude Code capabilities.
  Use for complex architecture, hard algorithmic problems, full-stack refactoring, deep debugging, root-cause analysis, and coordinating parallel subagent swarms (Lead Architect, Deep Researcher, Implementation Coder, Adversarial Reviewer, Verification QA).
---

# Omni-Architect Multi-Agent Orchestrator (Elite Problem Solving & Swarm Coordination)

This skill provides an elite problem-solving cognitive framework combined with autonomous multi-agent swarm orchestration, designed to outperform monolithic AI coding workflows.

---

## 1. The 5-Role Multi-Agent Swarm Pattern

When facing non-trivial coding tasks, do not solve everything in a single linear pass. Deconstruct and delegate across specialized subagent roles using `invoke_subagent`:

```
                    ┌───────────────────────────────┐
                    │      LEAD ARCHITECT           │
                    │ (Strategy, Decomposition, QC) │
                    └───────┬───────────────┬───────┘
                            │               │
            ┌───────────────▼──┐         ┌──▼────────────────┐
            │ DEEP RESEARCHER  │         │ ADVERSARIAL CRITIC│
            │ (AST, Call Graph)│         │ (Security, Edge)  │
            └───────┬──────────┘         └──┬────────────────┘
                    │                       │
            ┌───────▼───────────────────────▼───────┐
            │       PARALLEL WORKERS / CODERS       │
            │   (Module A, Module B, Data Layer)    │
            └───────┬───────────────────────────────┘
                    │
            ┌───────▼───────────────────────────────┐
            │         VERIFICATION & QA             │
            │  (Unit Tests, Build, Static Analysis) │
            └───────────────────────────────────────┘
```

### Role Specializations

1. **Lead Architect (Coordinator)**:
   - Understands user goals, formulates technical contracts and interfaces, maintains system invariants.
   - Decomposes tasks into decoupled sub-tasks for parallel subagents.
   - Integrates and validates finished subagent outputs.

2. **Deep Researcher (`research` subagent)**:
   - Maps symbols, caller-callee dependencies, and file relationships.
   - Discovers existing helpers to enforce zero-reinvention (Codebase Reuse).
   - Analyzes documentation and third-party API contracts.

3. **Parallel Implementer(s) (`self` subagents)**:
   - Focuses strictly on a single component or file boundary.
   - Writes minimal, clean, robust code meeting the Architect's interface contract.

4. **Adversarial Critic (Self-Reviewer)**:
   - Specifically attacks the proposed solution before it is applied:
     * Memory leaks, concurrency race conditions, unhandled nulls/exceptions.
     * Edge cases (empty inputs, network timeouts, precision limits).
     * YAGNI / Over-engineering violations.

5. **Verification & QA Subagent**:
   - Executes build commands, unit tests, and runtime assertions.
   - Confirms zero regressions before reporting task completion.

---

## 2. Elite Cognitive Problem-Solving Protocol (The "Opus-Plus" Loop)

Apply this cognitive loop before writing any line of code:

### Phase 1: Problem Inversion & Boundary Definition
- **Inversion**: "What must *never* happen?" (e.g. data loss, UI thread freezing, unhandled rejections).
- **Invariants**: Explicitly write down the 3-5 rules that must remain true before, during, and after the code executes.
- **Root Cause Tracing**: Never patch a symptom at the call site. Trace upstream to find where invalid state was first permitted.

### Phase 2: Interface-First Design (Contract Freeze)
- Define types, function signatures, and error modes before implementing business logic.
- Ensure decoupled, testable components with zero cyclic dependencies.

### Phase 3: Test-Driven Verification (TDD)
- Write or identify the exact verification check *before* modifying code.
- If no automated test exists, create a minimal reproducible assertion or standalone test script.

### Phase 4: Minimalist Execution (Ponytail Discipline)
- Standard Library & Native platform APIs first.
- Fewest files changed, smallest diff that completely solves the problem.

### Phase 5: Adversarial Self-Audit
- Run through the checklist:
  * [ ] Are all resources (files, sockets, timers, subscriptions) cleaned up?
  * [ ] Is error handling actionable and preserving original stack traces?
  * [ ] Does this introduce any new third-party dependency? If so, why cannot stdlib do it?
  * [ ] Are asynchronous operations guarded against race conditions?

---

## 3. Autonomous Subagent Swarm Execution Recipe

When a task involves multi-module changes or deep research:

```json
// Example: Spawning concurrent research and verification subagents
invoke_subagent({
  "Subagents": [
    {
      "TypeName": "research",
      "Role": "Deep Codebase Researcher",
      "Model": "inherit",
      "Prompt": "Analyze the AST call graph for storage.py and find all consumers of the load_settings() function. Report back all edge-case callers."
    },
    {
      "TypeName": "self",
      "Role": "Adversarial Code Reviewer",
      "Model": "inherit",
      "Prompt": "Review the proposed changes to the rendering pipeline for potential UI thread deadlocks, Direct3D resource leaks, or OOM scenarios."
    }
  ]
})
```

Once subagents report back:
1. Synthesize insights into the Master Plan.
2. Execute the refined changes.
3. Run verification scripts to guarantee 100% correctness.
