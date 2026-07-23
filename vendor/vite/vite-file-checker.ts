// check the files here
// storage\framework\cache\vite.json
// pure typescript no globals reliant
import vitets from "../../vite.ts";

const fileContents = Deno.readTextFileSync("storage/framework/cache/vite.json");
const fileContentsJson = JSON.parse(fileContents);
const files = fileContentsJson.files as string[];

const input = (vitets?.build?.rollupOptions?.input as string[]) || [];

if (Array.isArray(input) && input.length > 0) {
  files.forEach((file) => {
    if (!input.includes(file)) {
      input.push(file);
    }
  });
}

// file checker

const lastInput: string[] = [];

input.forEach((file) => {
  try {
    if (Deno.statSync(file).isFile) {
      lastInput.push(file);
    }
  } catch (error) {}
});

console.log(
  "Please modify your input in vite.ts to include the files that are being used in the vite cache",
);
console.log(lastInput);
