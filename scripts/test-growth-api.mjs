const url = process.env.GROWTH_API_URL ?? "http://127.0.0.1:8787/api/run-growth-cycle";
const secret = process.env.GROWTH_API_SECRET;

if (!secret) {
  throw new Error("Set GROWTH_API_SECRET before running growth:api:test.");
}

const response = await fetch(url, {
  method: "POST",
  headers: {
    authorization: `Bearer ${secret}`,
    "content-type": "application/json"
  }
});

const body = await response.text();
console.log(body);

if (!response.ok) {
  throw new Error(`Growth API test failed with HTTP ${response.status}`);
}
