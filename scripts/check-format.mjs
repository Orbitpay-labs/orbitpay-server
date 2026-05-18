import { readFile } from "node:fs/promises";

const files = [
  "README.md",
  "src/server.mts",
  "package.json",
  "tsconfig.json"
];

const problems = [];

for (const file of files) {
  const content = await readFile(file, "utf8");

  if (!content.endsWith("\n")) {
    problems.push(`${file}: missing final newline`);
  }

  content.split("\n").forEach((line, index) => {
    if (/[ \t]$/.test(line)) {
      problems.push(`${file}:${index + 1}: trailing whitespace`);
    }
  });
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`Format check passed for ${files.length} files.`);
