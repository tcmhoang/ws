import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const failureRate = new Rate("failed_requests");

export const options = {
  stages: [
    { duration: "10s", target: 100 },
    { duration: "30s", target: 500 },
    { duration: "10s", target: 0 },
  ],

  thresholds: {
    http_req_duration: ["p(95)<500"],
    failed_requests: ["rate<0.01"],
  },
};

export default function () {
  const url = "http://localhost:5000/api/scrape";

  const payload = JSON.stringify({
    urls: [
      "https://example.com",
      "https://google.com",
      "https://wikipedia.org",
      "https://github.com",
      "https://stackoverflow.com",
      "https://react.dev",
      "https://nodejs.org",
      "https://docker.com",
      "https://redis.io",
      "https://postgresql.org",
    ],
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(url, payload, params);

  const result = check(res, {
    "is status 202": (r) => r.status === 202,
    "response time < 200ms": (r) => r.timings.duration < 200,
  });

  failureRate.add(!result);

  sleep(1);
}
