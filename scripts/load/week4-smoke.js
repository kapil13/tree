"""Week 4 smoke load tests (k6).

Usage:
  k6 run scripts/load/week4-smoke.js
  API_BASE=https://api.aranyix.tech k6 run scripts/load/week4-smoke.js
"""

import http from "k6/http";
import { check, sleep } from "k6";

const API_BASE = __ENV.API_BASE || "http://localhost:8000";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const live = http.get(`${API_BASE}/health/live`);
  check(live, { "health live 200": (r) => r.status === 200 });

  const bbox = "77.5,12.9,77.7,13.1";
  const trees = http.get(`${API_BASE}/api/v1/trees?bbox=${bbox}&page_size=50`, {
    headers: { Authorization: `Bearer ${__ENV.ACCESS_TOKEN || ""}` },
  });
  check(trees, {
    "trees list auth or 401": (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}
