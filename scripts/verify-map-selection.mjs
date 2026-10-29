import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(new URL("../app/ui/restroom-map.tsx", import.meta.url), "utf8");
const homePage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

assert.match(
  component,
  /markerElement\.addEventListener\("click", \(\) => selectRestroom\(restroom, true\)\)/,
  "marker clicks must select the restroom",
);
assert.match(
  component,
  /if \(scrollListItem && window\.matchMedia\("\(min-width: 1000px\)"\)\.matches\)/,
  "marker selection must only scroll the list in the side-by-side desktop layout",
);
assert.match(
  component,
  /list\.scrollTo\(/,
  "desktop marker selection must scroll the list panel",
);
assert.doesNotMatch(
  component,
  /scrollIntoView\(/,
  "marker selection must not scroll the page",
);
assert.match(
  component,
  /new maplibregl\.Popup/,
  "selecting a restroom must show a map popup",
);
assert.match(
  component,
  /detailsLink\.href = `\/restrooms\/\$\{restroom\.id\}`/,
  "the map popup must link to the selected restroom's detail page",
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
