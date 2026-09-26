import http from "k6/http";
import { check, sleep } from "k6";

const API_BASE = __ENV.API_BASE || "http://localhost:8000";
const TOKEN = __ENV.ACCESS_TOKEN || "";
const WEBHOOK_ID = __ENV.WEBHOOK_ID || "";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<5000"],
  },
};

export default function () {
  if (!TOKEN || !WEBHOOK_ID) return;
  const res = http.post(
    `${API_BASE}/api/v1/webhooks/${WEBHOOK_ID}/test`,
    null,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  check(res, {
    "webhook test responds": (r) => [200, 403, 404, 429].includes(r.status),
  });
  sleep(1);
}
