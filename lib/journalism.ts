export type SampleArticle = {
  slug: string;
  section: string;
  title: string;
  dek: string;
  byline: string;
  date: string;
  displayDate: string;
  readingTime: string;
  paragraphs: readonly string[];
  pullQuote?: string;
};

export const sampleArticles = [
  {
    slug: "the-fifteen-minute-search",
    section: "Street level",
    title: "The fifteen-minute search for a basic city service",
    dek: "A fictional walk through Midtown shows how incomplete details can turn a nearby restroom into a distant promise.",
    byline: "The Loo York Times demonstration desk",
    date: "2026-09-30",
    displayDate: "September 30, 2026",
    readingTime: "3 min. read",
    paragraphs: [
      "This sample story follows Maya, a fictional New Yorker assembled from common public-restroom access scenarios. At 10:14 on a rainy Tuesday morning, the nearest pin on her phone appears to be only three blocks away. The map says where the restroom is, but not which entrance is open.",
      "She reaches the building and finds two doors, one locked and one marked for staff. A sign in the window points visitors around the corner. By the time she finds the public entrance, her short walk has become a loop around an avenue block.",
      "A useful directory has to answer more than where. It should say when a restroom is available, how to enter, and whether a visitor should expect stairs, a security desk, or a closure that changes the route entirely.",
      "In this demonstration, those practical details sit beside every listing when they are known. When they are not known, the page says so. An honest blank is more useful than a confident guess.",
      "The fictional trip ends at 10:29. The restroom was close on a map, but the information needed to reach it was scattered across the block. The difference between a pin and a dependable public service was fifteen minutes of uncertainty.",
    ],
    pullQuote: "An honest blank is more useful than a confident guess.",
  },
  {
    slug: "when-the-door-is-locked",
    section: "Accountability",
    title: "When the pin is right but the door is locked",
    dek: "This demonstration analysis considers what a restroom map can reveal - and what it cannot prove on its own.",
    byline: "The Loo York Times demonstration desk",
    date: "2026-09-29",
    displayDate: "September 29, 2026",
    readingTime: "4 min. read",
    paragraphs: [
      "A dot on a map records a location. It does not guarantee that a door is unlocked, a fixture works, or posted hours match the hours people can actually enter. This sample analysis uses no verified city statistics; it demonstrates the questions future reporting could ask.",
      "The first question is availability. A city may count a facility as part of its inventory even when access depends on a building schedule, seasonal operation, or a temporary closure. A directory designed for a person standing on the sidewalk needs to make that distinction visible.",
      "The second question is maintenance. A listing can remain technically correct while becoming practically unreliable. Reader ratings and comments can add timely context, but they are not a substitute for inspection records or an official operating status.",
      "The third question is accountability. Inventory totals, reader experiences, and the city's long-term target are separate datasets. A new listing should not automatically be presented as progress toward a policy goal, and a low rating should not be treated as proof of an official violation.",
      "A trustworthy public-service page shows the limits of its evidence. Future reported work could compare official records, site visits, and public experiences. This demonstration stops before making those findings.",
    ],
    pullQuote: "A dot on a map records a location. It does not guarantee access.",
  },
  {
    slug: "anatomy-of-a-useful-listing",
    section: "Service guide",
    title: "The anatomy of a useful restroom listing",
    dek: "Five small pieces of information can make the difference between finding a facility and merely knowing one exists.",
    byline: "The Loo York Times demonstration desk",
    date: "2026-09-28",
    displayDate: "September 28, 2026",
    readingTime: "3 min. read",
    paragraphs: [
      "This sample service guide illustrates the editorial approach behind the directory. It is demonstration material, not advice based on a completed survey of city facilities.",
      "Start with the entrance. A street address can lead to the wrong side of a large building, so a useful note names the door, floor, or nearby landmark when that information is available.",
      "Next come hours. Building hours and restroom hours may differ. When a schedule has not been confirmed, the listing should say that hours are unknown instead of filling the gap with an assumption.",
      "Facilities matter too. A changing table or an all-gender room can determine whether a location works for a particular visit. The directory presents only details that were provided or verified; it does not infer accessibility from a location name.",
      "Finally, freshness matters. A last-updated date helps readers judge what they see, while ratings offer a narrow view of recent experience. Together, these details turn a location record into a practical starting point - without pretending it can answer every question.",
    ],
    pullQuote: "The most useful listing is specific about what is known and candid about what is not.",
  },
] as const satisfies readonly SampleArticle[];

export function getSampleArticle(slug: string) {
  return sampleArticles.find((article) => article.slug === slug);
}
