import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { deriveConnectEntryToken } from "../src/lib/connect-gate";

test("el comando QR habilita TypeScript para el mínimo Node 22.12 declarado", async () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  const [executable, ...args] = scripts["connect:url"].split(" ");
  expect(executable).toBe("node");
  expect(args).toContain("--experimental-strip-types");
  const secret = "qr-generator-regression-secret";
  const output = execFileSync(process.execPath, args, {
    encoding: "utf8",
    env: { ...process.env, QR_CONNECT_SECRET: secret },
  });
  expect(output.trim()).toBe(
    `https://iglesiafresno.com/qr/${await deriveConnectEntryToken(secret)}`,
  );
});
