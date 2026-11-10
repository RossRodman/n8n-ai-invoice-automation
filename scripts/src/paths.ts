import { fileURLToPath } from "node:url";

export const SAMPLES_DIR = fileURLToPath(new URL("../../samples/invoices/", import.meta.url));
export const EXPECTED_FILE = `${SAMPLES_DIR}expected.json`;
