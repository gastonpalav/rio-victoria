import { readFileSync } from "node:fs";
import { parseCurrentTable } from "../../src/parse-current";

export const mainHtml = readFileSync(new URL("../fixtures/main.html", import.meta.url), "utf8");
export const histHtml = readFileSync(new URL("../fixtures/hist-260.html", import.meta.url), "utf8");
export const currentRows = parseCurrentTable(mainHtml).rows;
