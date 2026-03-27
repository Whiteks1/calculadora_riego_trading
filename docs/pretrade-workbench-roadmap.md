# Pre-Trade Workbench Roadmap

Status: active
Version: 1.0

## Purpose

This repository should be read as a bounded upstream pre-trade workbench.

Its job is to help an operator:

- size a trade
- compare scenarios
- generate deterministic artifacts
- export a bounded handoff for later QuantLab intake

It is not the owner of execution, approval, or policy.

## Repository Role

`calculadora_riego_trading` is the upstream planning surface.

`QuantLab` is the downstream consumer that may later:

- validate the input again
- decide whether the plan is acceptable
- translate it into its own runtime models
- execute through its own safety boundary

Boundary rule:

- the calculator plans
- QuantLab validates
- QuantLab decides
- QuantLab executes

## Critical Path

The critical path for this repository is:

- reusable risk core
- deterministic JSON and CSV exports
- headless CLI path
- bounded QuantLab handoff contract
- CI for contract and parity confidence

Everything above is now the primary baseline that should stay stable.

## What Belongs Here

- operator-facing pre-trade workflows
- reusable risk and trade-plan logic
- deterministic serialization
- fixtures and parity checks across runtimes
- bounded integration docs for downstream consumers

## What Does Not Belong Here

- execution policy ownership
- draft `ExecutionIntent` ownership
- broker submission logic
- paper or live execution lifecycle
- broad product expansion unrelated to handoff reliability

## Decision Rule For New Work

Before accepting a new feature, ask:

- does it improve the QuantLab handoff contract?
- does it improve artifact reliability?
- does it improve operator workflow without touching policy or execution?

If the answer is no, it should not go ahead of downstream integration work.

## Current Maturity

This repository is now considered ready for bounded upstream use because it has:

- deterministic trade-plan generation
- a browser-independent CLI
- a documented handoff contract
- shared JS/C++ parity checks
- CI that enforces contract and parity confidence

## Next Logical Steps

After the critical path, the next class of work should be narrow and reversible:

- small documentation cleanups
- downstream intake work in QuantLab
- selective operator-surface improvements that do not alter the boundary

## Strategic Constraint

Do not let this repository drift into becoming:

- a backtest engine
- an execution system
- a policy engine
- a replacement for QuantLab runtime ownership
