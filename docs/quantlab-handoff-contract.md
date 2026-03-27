# QuantLab Handoff Contract

Status: draft
Version: 1.0

## Purpose

This document defines the bounded handoff surface between
`calculadora_riesgo_trading` and QuantLab.

The calculator may help an operator plan a trade.

QuantLab may later consume that plan.

The calculator does **not** own:

- execution policy
- draft `ExecutionIntent`
- broker submit authority
- paper or live session lifecycle

## Boundary rule

The calculator proposes.

QuantLab validates.

QuantLab decides.

QuantLab executes.

## Output artifacts

The calculator may emit:

- canonical trade plan JSON
- canonical trade plan CSV
- bounded QuantLab handoff JSON

The preferred QuantLab ingestion surface is the handoff JSON because it carries:

- trade-plan source metadata
- pre-trade context metadata
- the full deterministic trade plan
- hints about whether the plan has enough context for later draft execution bridging

## Handoff contract

Contract marker:

```text
machineContract.contractType = "calculadora_riesgo.quantlab_handoff"
machineContract.contractVersion = "1.0"
```

Top-level fields:

- `machineContract`
- `generatedAt`
- `handoffId`
- `source`
- `pretradeContext`
- `quantlabHints`
- `tradePlan`

## Field intent

### `source`

Identifies the upstream artifact lineage.

Fields:

- `planner`
- `tradePlanContractType`
- `tradePlanContractVersion`
- `tradePlanId`

### `pretradeContext`

Carries the minimum contextual fields that QuantLab is likely to need later for
conversion into a draft execution model.

Fields:

- `symbol`
- `venue`
- `side`
- `accountId`
- `strategyId`

Only `symbol`, `venue`, and `side` are considered the minimum readiness set for
later draft execution bridging.

### `quantlabHints`

This block is informative only. It does not grant authority.

Fields:

- `readyForDraftExecutionIntent`
- `missingFields`
- `boundaryNote`

`readyForDraftExecutionIntent` means only:

- the handoff includes `symbol`
- the handoff includes `venue`
- the handoff includes `side`

It does **not** mean:

- the plan passed QuantLab policy
- the plan is approved
- the plan may be submitted

## Example CLI usage

Input file:

```bash
node cli/trade-plan.js \
  --input-file examples/quantlab_handoff_request.json \
  --stdout-format quantlab-handoff \
  --quantlab-handoff-out outputs/quantlab_handoff.json
```

Flags:

```bash
node cli/trade-plan.js \
  --capital 1000 \
  --risk-percent 1 \
  --entry-price 2000 \
  --stop-loss 1950 \
  --exit-price 2100 \
  --symbol ETH-USD \
  --venue hyperliquid \
  --side buy \
  --strategy-id breakout_v1 \
  --account-id acct_demo_001 \
  --stdout-format quantlab-handoff
```

## What QuantLab should do with this

QuantLab should:

- treat this artifact as external input
- revalidate all relevant fields
- decide whether to build a draft execution payload
- apply its own `ExecutionPolicy`

QuantLab should not:

- trust this artifact as execution authority
- bypass its broker safety boundary
- let this artifact decide approval or submit behavior
