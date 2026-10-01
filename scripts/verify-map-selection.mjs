import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(new URL("../app/ui/restroom-map.tsx", import.meta.url), "utf8");
const homePage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

assert.match(
  component,
  /markerElement\.addEventListener\("click", \(\) => selectRestroom\(restroom\)\)/,
  "marker clicks must use the same selection path as list clicks",
);
assert.match(
  component,
  /scrollIntoView/,
  "selecting a restroom must scroll its list item into view",
);
assert.match(
  component,
  /new maplibregl\.Popup/,
  "selecting a restroom must show a map popup",
);
assert.match(
  component,
  /average_rating/,
  "the map popup must support an average rating",
);
assert.match(
  homePage,
  /reviews\s*\(rating\)/,
  "the home page must load review ratings for map listings",
);

console.log("Map selection verification passed.");
