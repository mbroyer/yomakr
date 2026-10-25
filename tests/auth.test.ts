import { beforeAll, describe, expect, it } from "vitest";
import { checkCredentials, createSessionToken, verifySessionToken } from "@/lib/auth";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-1234567890";
  process.env.KID_PIN = "4711";
  process.env.PARENT_PASSWORD = "geheimes-eltern-passwort";
});

describe("Sitzungen", () => {
  it("akzeptiert ein gültiges Token mit der richtigen Rolle", () => {
    expect(verifySessionToken(createSessionToken("kid"))).toBe("kid");
    expect(verifySessionToken(createSessionToken("parent"))).toBe("parent");
  });

  it("lehnt ein manipuliertes Token ab (Kind macht sich zum Elternteil)", () => {
    const [, expires, signature] = createSessionToken("kid").split(".");
    expect(verifySessionToken(`parent.${expires}.${signature}`)).toBeNull();
  });

  it("lehnt abgelaufene Tokens ab", () => {
    const token = createSessionToken("kid", Date.now() - 1000 * 60 * 60 * 24 * 31);
    expect(verifySessionToken(token)).toBeNull();
  });

  it("prüft PIN und Passwort getrennt", () => {
    expect(checkCredentials("kid", "4711")).toBe(true);
    expect(checkCredentials("parent", "4711")).toBe(false);
    expect(checkCredentials("parent", "geheimes-eltern-passwort")).toBe(true);
  });
});
