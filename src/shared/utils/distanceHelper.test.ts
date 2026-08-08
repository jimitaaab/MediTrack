import { haversineDistance } from "./distanceHelper";

describe("haversineDistance", () => {
  it("returns ~0 for identical coordinates", () => {
    const d = haversineDistance(23.8103, 90.4125, 23.8103, 90.4125);
    expect(d).toBeCloseTo(0, 5);
  });

  it("computes the Dhaka-Chittagong great-circle distance (~214km)", () => {
    const d = haversineDistance(23.8103, 90.4125, 22.3569, 91.7832);
    expect(d).toBeGreaterThan(205);
    expect(d).toBeLessThan(230);
  });

  it("handles negative (south/west) coordinates", () => {
    const d = haversineDistance(-33.8688, -70.6693, 12.9667, 77.5667);
    expect(d).toBeGreaterThan(15500);
    expect(d).toBeLessThan(16500);
  });

  it("is symmetric", () => {
    const a = haversineDistance(1, 2, 3, 4);
    const b = haversineDistance(3, 4, 1, 2);
    expect(a).toBeCloseTo(b, 10);
  });
});