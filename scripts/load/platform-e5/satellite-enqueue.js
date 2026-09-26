import http from "k6/http";
import { check, sleep } from "k6";

const API_BASE = __ENV.API_BASE || "http://localhost:8000";
const TOKEN = __ENV.ACCESS_TOKEN || "";
const PROJECT_ID = __ENV.PROJECT_ID || "";

export const options = {
  vus: 2,
  iterations: 10,
  thresholds: {
    http_req_duration: ["p(95)<8000"],
  },
};

export default function () {
  if (!TOKEN || !PROJECT_ID) return;
  const res = http.post(
    `${API_BASE}/api/v1/planting-projects/${PROJECT_ID}/satellite-scan`,
    null,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  check(res, {
    "satellite scan responds": (r) => [200, 202, 403, 404, 429].includes(r.status),
  });
  sleep(2);
}
