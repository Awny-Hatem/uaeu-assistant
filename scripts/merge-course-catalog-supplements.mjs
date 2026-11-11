import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { mergeCourseCatalogSupplements } from "./import-official-course-catalog.mjs";

const directory = path.join(process.cwd(), "data", "academic");
const catalogPath = path.join(directory, "course-catalog.json");
const supplementsPath = path.join(directory, "course-catalog-supplements.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const supplements = JSON.parse(await readFile(supplementsPath, "utf8"));
catalog.courses = mergeCourseCatalogSupplements(catalog.courses, supplements);
catalog.courseCount = catalog.courses.length;
catalog.verifiedAt = new Date().toISOString().slice(0, 10);
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Merged ${supplements.length} supplements; snapshot now has ${catalog.courseCount} records.`);
