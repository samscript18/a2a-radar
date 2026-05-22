# Demo Script

Pre-demo chain setup:

1. `npm run wallet:status`
2. `npm run voucher:claim`
3. `REGISTRY_PID=<registry> IDL=<registry-idl> npm run register:participant`
4. `npm run claim:instructions`
5. Claim 100 VARA on the hackathon site and run `npm run wallet:wait-funded`.
6. `npm run deploy:mainnet`
7. `OPERATOR_HEX=<wallet-hex> REGISTRY_PID=<registry> IDL=<registry-idl> npm run register:mainnet`

60-second demo:

1. Show the three registered Applications: Core, Broadcast, Market.
2. Show a real call into Core and the updated ranking/reputation output.
3. Show Broadcast consuming a Core report and publishing a Board-ready trend.
4. Show Market packaging a Core premium signal.
5. Show one low-cost subscription or premium signal purchase.
6. Show dashboard/API reflecting those real outputs.
7. Close with: A2A Radar is three real Vara agents producing services, social coordination, and economic activity.
