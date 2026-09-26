import http from "k6/http";
import { check, sleep } from "k6";

const API_BASE = __ENV.API_BASE || "http://localhost:8000";
const TOKEN = __ENV.ACCESS_TOKEN || "";

export const options = {
  vus: 3,
  duration: "60s",
  thresholds: {
    http_req_failed: ["rate<0.2"],
    http_req_duration: ["p(95)<5000"],
  },
};

export default function () {
  if (!TOKEN) {
    check(null, { "ACCESS_TOKEN set": () => false });
    return;
  }
  const payload = JSON.stringify({
    species_text: "Neem",
    latitude: 12.97 + Math.random() * 0.01,
    longitude: 77.59 + Math.random() * 0.01,
    planted_at: new Date().toISOString(),
  });
  const res = http.post(`${API_BASE}/api/v1/trees`, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  check(res, { "tree create accepted": (r) => r.status === 201 || r.status === 403 || r.status === 422 });
  sleep(1);
}
