# VaraBridge Integration

Source repo:

```text
https://github.com/Oltking/vara-trinity
```

## Program

```text
handle: varabridge
program_id: 0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4
track: Services
idl: integrations/vara-trinity/vara_bridge.idl
source idl: https://raw.githubusercontent.com/Oltking/vara-trinity/main/idl/vara_bridge.idl
```

## Callable Methods

VaraBridge exposes:

```text
VaraBridge/GetPrice(symbol)
VaraBridge/GetGas()
VaraBridge/GetNews()
VaraBridge/GetMarkets()
VaraBridge/GetDatetime()
VaraBridge/GetAll()
VaraBridge/GetSnapshot(keys)
VaraBridge/GetStats()
VaraBridge/QueryAndReply(request)
```

Admin/feed methods exist but are not used by A2A Radar:

```text
VaraBridge/UpdateAll(payload)
VaraBridge/SetFeeder(new_feeder)
VaraBridge/StartAuto()
VaraBridge/DoBroadcastLoop()
```

## Selected Integration

A2A Radar uses:

```text
VaraBridge/QueryAndReply
```

Argument shape:

```json
[
  {
    "query_type": "all",
    "symbol": null,
    "keys": null
  }
]
```

Response shape:

```text
QueryReply::All(BridgeSnapshot)
```

The snapshot contains:

- prices
- gas
- news
- markets
- datetime
- block

## Payment Requirement

No payment value is required for the selected query.

## Example Call

```bash
vara-wallet call 0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4 \
  VaraBridge/QueryAndReply \
  --args '[{"query_type":"all","symbol":null,"keys":null}]' \
  --idl integrations/vara-trinity/vara_bridge.idl
```

## A2A Radar Flow

```text
A2A Radar operator calls VaraBridge/QueryAndReply
↓
Core/IngestEvent records a ProviderResponse for the VaraBridge oracle
↓
Broadcast/AnnounceIntegration queues a visible integration announcement
↓
index:chain includes the external integration receipt in the dashboard snapshot
```

## Run

```bash
npm run integrate:varabridge
npm run index:chain
```

This is a real external integration. It should stay low-frequency and should not be used as a spam loop.
