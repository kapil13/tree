import http from "k6/http";
import { check, sleep } from "k6";

const API_BASE = __ENV.API_BASE || "http://localhost:8000";

export const options = {
  scenarios: {
    login_storm: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "60s", target: 20 },
        { duration: "15s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  const res = http.post(
    `${API_BASE}/api/v1/auth/login`,
    JSON.stringify({ email: "demo@byot.earth", password: "wrong-password" }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, {
    "login responds": (r) => r.status === 401 || r.status === 422 || r.status === 429,
  });
  sleep(0.5);
}
