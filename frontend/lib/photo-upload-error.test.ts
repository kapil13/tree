import { describe, expect, it } from "vitest";
import { errorMessage } from "./api";
import axios, { AxiosError } from "axios";

describe("photo upload errors", () => {
  it("does not blame the API when MinIO PUT fails", () => {
    const err = new AxiosError("Network Error", "ERR_NETWORK");
    err.config = { url: "http://minio:9000/byot-media/images/x.jpg", headers: {} } as AxiosError["config"];
    expect(errorMessage(err)).toMatch(/storage/i);
    expect(errorMessage(err)).not.toMatch(/Cannot reach the API/);
  });
});
