import { z } from "zod";

import type { ProviderUrlConfig } from "./index.js";

// ============================================================================
// STREETEASY QUERY PARAMETER SCHEMA
// ============================================================================
//
// Verified against the live site on 2026-05-10 via browser automation.
// Area codes verified by fetching /for-rent/nyc/area:NNN and reading <title>.
//
// StreetEasy uses a path-based DSL for filters:
//   /for-rent/nyc/type:D1,X|price:2000-4000|beds:1-2|amenities:washer_dryer
//
// Format: /{for-rent|for-sale}/{location}/{filter1|filter2|...}?sort_by=...
//
// Filters are pipe-delimited. Each filter is `key:value` or `key>=value`.
// Multi-value filters use comma-separated values (e.g. `type:D1,X`).
// ============================================================================

// ---------------------------------------------------------------------------
// Neighborhood area codes — verified via live title checking
// ---------------------------------------------------------------------------

export const STREETEASY_AREAS = {
  // === Manhattan (100–166) — all verified 2026-05-10 ===
  /** All Manhattan */
  MANHATTAN: "100",
  /** Roosevelt Island */
  ROOSEVELT_ISLAND: "101",
  /** All Downtown Manhattan */
  DOWNTOWN: "102",
  /** Civic Center */
  CIVIC_CENTER: "103",
  /** Financial District */
  FINANCIAL_DISTRICT: "104",
  /** Tribeca */
  TRIBECA: "105",
  /** Stuyvesant Town / Peter Cooper Village */
  STUYVESANT_TOWN: "106",
  /** Soho */
  SOHO: "107",
  /** Little Italy */
  LITTLE_ITALY: "108",
  /** Lower East Side */
  LOWER_EAST_SIDE: "109",
  /** Chinatown */
  CHINATOWN: "110",
  /** Two Bridges */
  TWO_BRIDGES: "111",
  /** Battery Park City */
  BATTERY_PARK_CITY: "112",
  /** Gramercy Park */
  GRAMERCY_PARK: "113",
  /** Fulton / Seaport */
  FULTON_SEAPORT: "114",
  /** Chelsea */
  CHELSEA: "115",
  /** Greenwich Village */
  GREENWICH_VILLAGE: "116",
  /** East Village */
  EAST_VILLAGE: "117",
  /** Noho */
  NOHO: "118",
  /** All Midtown */
  ALL_MIDTOWN: "119",
  /** Midtown */
  MIDTOWN: "120",
  /** Central Park South */
  CENTRAL_PARK_SOUTH: "121",
  /** Midtown South */
  MIDTOWN_SOUTH: "122",
  /** Midtown East */
  MIDTOWN_EAST: "123",
  /** Midtown West */
  MIDTOWN_WEST: "124",
  // 125–129 are unassigned / return generic results
  /** Murray Hill */
  MURRAY_HILL: "130",
  /** Sutton Place */
  SUTTON_PLACE: "131",
  /** Turtle Bay */
  TURTLE_BAY: "132",
  /** Kips Bay */
  KIPS_BAY: "133",
  /** Beekman */
  BEEKMAN: "134",
  /** All Upper West Side */
  ALL_UPPER_WEST_SIDE: "135",
  /** Lincoln Square */
  LINCOLN_SQUARE: "136",
  /** Upper West Side */
  UPPER_WEST_SIDE: "137",
  /** Manhattan Valley */
  MANHATTAN_VALLEY: "138",
  /** All Upper East Side */
  ALL_UPPER_EAST_SIDE: "139",
  /** Upper East Side */
  UPPER_EAST_SIDE: "140",
  /** Lenox Hill */
  LENOX_HILL: "141",
  /** Yorkville */
  YORKVILLE: "142",
  /** Carnegie Hill */
  CARNEGIE_HILL: "143",
  /** All Upper Manhattan */
  ALL_UPPER_MANHATTAN: "144",
  /** Hudson Heights */
  HUDSON_HEIGHTS: "145",
  /** Hudson Yards */
  HUDSON_YARDS: "146",
  /** Morningside Heights */
  MORNINGSIDE_HEIGHTS: "147",
  /** Hamilton Heights */
  HAMILTON_HEIGHTS: "148",
  /** Washington Heights */
  WASHINGTON_HEIGHTS: "149",
  /** Inwood */
  INWOOD: "150",
  /** Fort George */
  FORT_GEORGE: "151",
  /** Hell's Kitchen */
  HELLS_KITCHEN: "152",
  /** West Harlem */
  WEST_HARLEM: "153",
  /** Central Harlem */
  CENTRAL_HARLEM: "154",
  /** East Harlem */
  EAST_HARLEM: "155",
  // 156 unassigned
  /** West Village */
  WEST_VILLAGE: "157",
  /** Flatiron */
  FLATIRON: "158",
  /** NoMad */
  NOMAD: "159",
  // 160 unassigned
  /** Manhattanville */
  MANHATTANVILLE: "161",
  /** Nolita */
  NOLITA: "162",
  /** West Chelsea */
  WEST_CHELSEA: "163",
  /** Upper Carnegie Hill */
  UPPER_CARNEGIE_HILL: "164",
  /** South Harlem */
  SOUTH_HARLEM: "165",
  /** Hudson Square */
  HUDSON_SQUARE: "166",

  // === Bronx (200–276) — verified 2026-05-10 ===
  /** All Bronx */
  BRONX: "200",
  /** Mott Haven */
  MOTT_HAVEN: "201",
  /** Melrose */
  MELROSE: "202",
  /** Port Morris */
  PORT_MORRIS: "203",
  /** Hunts Point */
  HUNTS_POINT: "204",
  /** Longwood */
  LONGWOOD: "205",
  // 206 unassigned
  /** Morrisania */
  MORRISANIA: "207",
  /** Claremont */
  CLAREMONT: "208",
  /** Crotona Park East */
  CROTONA_PARK_EAST: "209",
  /** Highbridge */
  HIGHBRIDGE: "210",
  /** Concourse */
  CONCOURSE: "211",
  /** Morris Heights */
  MORRIS_HEIGHTS: "212",
  /** University Heights */
  UNIVERSITY_HEIGHTS: "213",
  /** Fordham */
  FORDHAM: "214",
  /** Mt. Hope */
  MT_HOPE: "215",
  /** East Tremont */
  EAST_TREMONT: "216",
  // 217 unassigned
  /** Belmont */
  BELMONT: "218",
  /** West Farms */
  WEST_FARMS: "219",
  /** Kingsbridge Heights */
  KINGSBRIDGE_HEIGHTS: "220",
  /** Bedford Park */
  BEDFORD_PARK: "221",
  // 222–223 unassigned
  /** Kingsbridge */
  KINGSBRIDGE: "224",
  /** Riverdale */
  RIVERDALE: "225",
  /** Marble Hill (technically Manhattan) */
  MARBLE_HILL: "226",
  /** Fieldston */
  FIELDSTON: "227",
  /** Soundview */
  SOUNDVIEW: "228",
  /** Castle Hill */
  CASTLE_HILL: "229",
  // 230 unassigned
  /** Parkchester */
  PARKCHESTER: "231",
  /** Throgs Neck */
  THROGS_NECK: "232",
  /** Pelham Bay */
  PELHAM_BAY: "233",
  /** Co-op City */
  COOP_CITY: "234",
  /** Westchester Square */
  WESTCHESTER_SQUARE: "235",
  /** City Island */
  CITY_ISLAND: "236",
  /** Morris Park */
  MORRIS_PARK: "237",
  /** Pelham Parkway */
  PELHAM_PARKWAY: "238",
  // 239 unassigned
  /** Van Nest */
  VAN_NEST: "240",
  /** Laconia */
  LACONIA: "241",
  /** Williamsbridge */
  WILLIAMSBRIDGE: "242",
  /** Baychester */
  BAYCHESTER: "243",
  /** Woodlawn */
  WOODLAWN: "244",
  /** Wakefield */
  WAKEFIELD: "245",
  /** Eastchester */
  EASTCHESTER: "246",
  // 247 unassigned
  /** Tremont */
  TREMONT: "248",
  /** Spuyten Duyvil */
  SPUYTEN_DUYVIL: "249",
  // 250–259 unassigned
  /** Norwood */
  NORWOOD: "260",
  // 261–264 unassigned
  /** Bronxwood */
  BRONXWOOD: "265",
  /** Pelham Gardens */
  PELHAM_GARDENS: "266",
  /** Locust Point */
  LOCUST_POINT: "267",
  // 268–269 unassigned
  /** Woodstock */
  WOODSTOCK: "270",
  /** North New York */
  NORTH_NEW_YORK: "271",
  /** Westchester Village */
  WESTCHESTER_VILLAGE: "272",
  /** Country Club */
  COUNTRY_CLUB: "273",
  /** Schuylerville */
  SCHUYLERVILLE: "274",
  // 275 unassigned
  /** Edenwald */
  EDENWALD: "276",

  // === Brooklyn (300–373) — verified 2026-05-10 ===
  /** All Brooklyn */
  BROOKLYN: "300",
  /** Greenpoint */
  GREENPOINT: "301",
  /** Williamsburg */
  WILLIAMSBURG: "302",
  /** Downtown Brooklyn */
  DOWNTOWN_BROOKLYN: "303",
  /** Fort Greene */
  FORT_GREENE: "304",
  /** Brooklyn Heights */
  BROOKLYN_HEIGHTS: "305",
  /** Boerum Hill */
  BOERUM_HILL: "306",
  /** DUMBO */
  DUMBO: "307",
  /** Vinegar Hill */
  VINEGAR_HILL: "308",
  /** Farragut */
  FARRAGUT: "309",
  /** Bedford-Stuyvesant */
  BEDFORD_STUYVESANT: "310",
  // 311 unassigned
  /** Stuyvesant Heights */
  STUYVESANT_HEIGHTS: "312",
  /** Bushwick */
  BUSHWICK: "313",
  /** East New York */
  EAST_NEW_YORK: "314",
  /** New Lots */
  NEW_LOTS: "315",
  /** City Line */
  CITY_LINE: "316",
  /** Starrett City */
  STARRETT_CITY: "317",
  /** Red Hook */
  RED_HOOK: "318",
  /** Park Slope */
  PARK_SLOPE: "319",
  /** Gowanus */
  GOWANUS: "320",
  /** Carroll Gardens */
  CARROLL_GARDENS: "321",
  /** Cobble Hill */
  COBBLE_HILL: "322",
  /** Sunset Park */
  SUNSET_PARK: "323",
  /** Windsor Terrace */
  WINDSOR_TERRACE: "324",
  /** Crown Heights */
  CROWN_HEIGHTS: "325",
  /** Prospect Heights */
  PROSPECT_HEIGHTS: "326",
  /** Weeksville */
  WEEKSVILLE: "327",
  /** Columbia St Waterfront District */
  COLUMBIA_ST_WATERFRONT: "328",
  /** Prospect Lefferts Gardens */
  PROSPECT_LEFFERTS_GARDENS: "329",
  /** Wingate */
  WINGATE: "330",
  /** Bay Ridge */
  BAY_RIDGE: "331",
  /** Dyker Heights */
  DYKER_HEIGHTS: "332",
  /** Fort Hamilton */
  FORT_HAMILTON: "333",
  /** Bensonhurst */
  BENSONHURST: "334",
  /** Mapleton */
  MAPLETON: "335",
  /** Bath Beach */
  BATH_BEACH: "336",
  /** Gravesend */
  GRAVESEND: "337",
  /** Borough Park */
  BOROUGH_PARK: "338",
  /** Ocean Parkway */
  OCEAN_PARKWAY: "339",
  /** Kensington */
  KENSINGTON: "340",
  /** Coney Island */
  CONEY_ISLAND: "341",
  /** Brighton Beach */
  BRIGHTON_BEACH: "342",
  /** Ditmas Park */
  DITMAS_PARK: "343",
  /** Homecrest */
  HOMECREST: "344",
  /** Seagate */
  SEAGATE: "345",
  /** Flatbush */
  FLATBUSH: "346",
  /** Cypress Hills */
  CYPRESS_HILLS: "347",
  /** Midwood */
  MIDWOOD: "348",
  /** Sheepshead Bay */
  SHEEPSHEAD_BAY: "349",
  /** Manhattan Beach */
  MANHATTAN_BEACH: "350",
  // 351 unassigned
  /** Fiske Terrace */
  FISKE_TERRACE: "352",
  /** Ocean Hill */
  OCEAN_HILL: "353",
  /** Brownsville */
  BROWNSVILLE: "354",
  /** Prospect Park South */
  PROSPECT_PARK_SOUTH: "355",
  // 356–357 unassigned
  /** East Flatbush */
  EAST_FLATBUSH: "358",
  /** Canarsie */
  CANARSIE: "359",
  /** Flatlands */
  FLATLANDS: "360",
  /** Marine Park */
  MARINE_PARK: "361",
  /** Mill Basin */
  MILL_BASIN: "362",
  /** Bergen Beach */
  BERGEN_BEACH: "363",
  /** Clinton Hill */
  CLINTON_HILL: "364",
  /** Old Mill Basin */
  OLD_MILL_BASIN: "365",
  /** Madison */
  MADISON: "366",
  /** Greenwood */
  GREENWOOD: "367",
  // 368–369 unassigned
  /** Gerritsen Beach */
  GERRITSEN_BEACH: "370",
  // 371–372 unassigned
  /** East Williamsburg */
  EAST_WILLIAMSBURG: "373",

  // === Queens (400–480) — verified 2026-05-10 ===
  /** All Queens */
  QUEENS: "400",
  /** Astoria */
  ASTORIA: "401",
  /** Long Island City */
  LONG_ISLAND_CITY: "402",
  /** Sunnyside */
  SUNNYSIDE: "403",
  /** Woodside */
  WOODSIDE: "404",
  /** Jackson Heights */
  JACKSON_HEIGHTS: "405",
  /** East Elmhurst */
  EAST_ELMHURST: "406",
  /** North Corona */
  NORTH_CORONA: "407",
  /** Elmhurst */
  ELMHURST: "408",
  /** Corona */
  CORONA: "409",
  /** Maspeth */
  MASPETH: "410",
  /** Middle Village */
  MIDDLE_VILLAGE: "411",
  /** Ridgewood */
  RIDGEWOOD: "412",
  /** Glendale */
  GLENDALE: "413",
  /** Rego Park */
  REGO_PARK: "414",
  /** Forest Hills */
  FOREST_HILLS: "415",
  /** Flushing */
  FLUSHING: "416",
  /** Whitestone */
  WHITESTONE: "417",
  /** College Point */
  COLLEGE_POINT: "418",
  /** Fresh Meadows */
  FRESH_MEADOWS: "419",
  /** Kew Gardens Hills */
  KEW_GARDENS_HILLS: "420",
  /** Jamaica Hills */
  JAMAICA_HILLS: "421",
  /** Woodhaven */
  WOODHAVEN: "422",
  /** Richmond Hill */
  RICHMOND_HILL: "423",
  /** Kew Gardens */
  KEW_GARDENS: "424",
  /** Howard Beach */
  HOWARD_BEACH: "425",
  /** Ozone Park */
  OZONE_PARK: "426",
  /** South Ozone Park */
  SOUTH_OZONE_PARK: "427",
  /** Bayside */
  BAYSIDE: "428",
  /** Douglaston */
  DOUGLASTON: "429",
  /** Little Neck */
  LITTLE_NECK: "430",
  /** Auburndale */
  AUBURNDALE: "431",
  /** Jamaica */
  JAMAICA: "432",
  /** South Jamaica */
  SOUTH_JAMAICA: "433",
  /** Hollis */
  HOLLIS: "434",
  /** St. Albans */
  ST_ALBANS: "435",
  /** Laurelton */
  LAURELTON: "436",
  /** Cambria Heights */
  CAMBRIA_HEIGHTS: "437",
  /** Queens Village */
  QUEENS_VILLAGE: "438",
  /** Glen Oaks */
  GLEN_OAKS: "439",
  /** Far Rockaway */
  FAR_ROCKAWAY: "440",
  /** Broad Channel */
  BROAD_CHANNEL: "441",
  /** Floral Park */
  FLORAL_PARK: "442",
  /** Bellerose */
  BELLEROSE: "443",
  /** Rosedale */
  ROSEDALE: "444",
  /** Springfield Gardens */
  SPRINGFIELD_GARDENS: "445",
  /** Briarwood */
  BRIARWOOD: "446",
  /** Jamaica Estates */
  JAMAICA_ESTATES: "447",
  /** Arverne */
  ARVERNE: "448",
  /** New Hyde Park */
  NEW_HYDE_PARK: "449",
  /** South Richmond Hill */
  SOUTH_RICHMOND_HILL: "450",
  /** Oakland Gardens */
  OAKLAND_GARDENS: "451",
  /** Rockaway Park */
  ROCKAWAY_PARK: "452",
  /** Hillcrest */
  HILLCREST: "453",
  /** Pomonok */
  POMONOK: "454",
  /** Utopia */
  UTOPIA: "455",
  /** East Flushing */
  EAST_FLUSHING: "456",
  /** Murray Hill (Queens) */
  MURRAY_HILL_QUEENS: "457",
  // 458 unassigned
  /** Clearview */
  CLEARVIEW: "459",
  /** Malba */
  MALBA: "460",
  /** Beechhurst */
  BEECHHURST: "461",
  /** Bayswater */
  BAYSWATER: "462",
  /** Belle Harbor */
  BELLE_HARBOR: "463",
  /** Breezy Point */
  BREEZY_POINT: "464",
  /** Neponsit */
  NEPONSIT: "465",
  /** Edgemere */
  EDGEMERE: "466",
  /** Hamilton Beach */
  HAMILTON_BEACH: "467",
  /** Ramblersville */
  RAMBLERSVILLE: "468",
  /** Rockwood Park */
  ROCKWOOD_PARK: "469",
  /** Lindenwood */
  LINDENWOOD: "470",
  /** Old Howard Beach */
  OLD_HOWARD_BEACH: "471",
  // 472 unassigned
  /** Hammels */
  HAMMELS: "473",
  /** Ditmars-Steinway */
  DITMARS_STEINWAY: "474",
  // 475–476 unassigned
  /** Rockaway All */
  ROCKAWAY_ALL: "477",
  /** Hunters Point */
  HUNTERS_POINT: "478",
  /** Brookville */
  BROOKVILLE: "479",
  /** Bay Terrace (Queens) */
  BAY_TERRACE_QUEENS: "480",

  // === Staten Island (500–592) — verified 2026-05-10 ===
  /** All Staten Island */
  STATEN_ISLAND: "500",
  /** North Shore */
  NORTH_SHORE: "501",
  /** South Shore */
  SOUTH_SHORE: "502",
  /** East Shore */
  EAST_SHORE: "503",
  /** West Shore */
  WEST_SHORE: "504",
  /** Mid-Island */
  MID_ISLAND: "505",
  // 506 unassigned
  /** Annadale */
  ANNADALE: "507",
  /** Arden Heights */
  ARDEN_HEIGHTS: "508",
  /** Arlington */
  ARLINGTON: "509",
  /** Arrochar */
  ARROCHAR: "510",
  /** Bay Terrace */
  BAY_TERRACE: "511",
  /** Bloomfield */
  BLOOMFIELD: "512",
  // 513 unassigned
  /** Bulls Head */
  BULLS_HEAD: "514",
  // 515 unassigned
  /** Castleton Corners */
  CASTLETON_CORNERS: "516",
  /** Charleston */
  CHARLESTON: "517",
  /** Chelsea (Staten Island) */
  CHELSEA_SI: "518",
  /** Clifton */
  CLIFTON: "519",
  // 520–521 unassigned
  /** Dongan Hills */
  DONGAN_HILLS: "522",
  /** Egbertville */
  EGBERTVILLE: "523",
  /** Elm Park */
  ELM_PARK: "524",
  /** Eltingville */
  ELTINGVILLE: "525",
  /** Emerson Hill */
  EMERSON_HILL: "526",
  /** Fort Wadsworth */
  FORT_WADSWORTH: "527",
  /** Graniteville */
  GRANITEVILLE: "528",
  /** Grant City */
  GRANT_CITY: "529",
  /** Grasmere */
  GRASMERE: "530",
  /** Great Kills */
  GREAT_KILLS: "531",
  /** Greenridge */
  GREENRIDGE: "532",
  /** Grymes Hill */
  GRYMES_HILL: "533",
  // 534–536 unassigned
  /** Howland Hook */
  HOWLAND_HOOK: "537",
  /** Huguenot */
  HUGUENOT: "538",
  // 539 unassigned
  /** Lighthouse Hill */
  LIGHTHOUSE_HILL: "540",
  // 541–542 unassigned
  /** Manor Heights */
  MANOR_HEIGHTS: "543",
  /** Mariners Harbor */
  MARINERS_HARBOR: "544",
  /** Meiers Corners */
  MEIERS_CORNERS: "545",
  /** Midland Beach */
  MIDLAND_BEACH: "546",
  /** New Brighton */
  NEW_BRIGHTON: "547",
  /** New Dorp */
  NEW_DORP: "548",
  /** New Springville */
  NEW_SPRINGVILLE: "549",
  /** Oakwood */
  OAKWOOD: "550",
  /** Ocean Breeze */
  OCEAN_BREEZE: "551",
  // 552 unassigned
  /** Park Hill */
  PARK_HILL: "553",
  /** Pleasant Plains */
  PLEASANT_PLAINS: "554",
  // 555 unassigned
  /** Port Richmond */
  PORT_RICHMOND: "556",
  /** Princes Bay */
  PRINCES_BAY: "557",
  // 558–559 unassigned
  /** Richmond Valley */
  RICHMOND_VALLEY: "560",
  /** Richmondtown */
  RICHMONDTOWN: "561",
  /** Rosebank */
  ROSEBANK: "562",
  /** Rossville */
  ROSSVILLE: "563",
  // 564 unassigned
  /** Shore Acres */
  SHORE_ACRES: "565",
  /** Silver Lake */
  SILVER_LAKE: "566",
  // 567 unassigned
  /** South Beach */
  SOUTH_BEACH: "568",
  /** Saint George */
  SAINT_GEORGE: "569",
  // 570 unassigned
  /** Stapleton */
  STAPLETON: "571",
  // 572 unassigned
  /** Sunnyside (Staten Island) */
  SUNNYSIDE_SI: "573",
  // 574 unassigned
  /** Todt Hill */
  TODT_HILL: "575",
  /** Tompkinsville */
  TOMPKINSVILLE: "576",
  /** Tottenville */
  TOTTENVILLE: "577",
  /** Travis */
  TRAVIS: "578",
  // 579 unassigned
  /** West Brighton */
  WEST_BRIGHTON: "580",
  // 581 unassigned
  /** Westerleigh */
  WESTERLEIGH: "582",
  /** Willowbrook */
  WILLOWBROOK: "583",
  /** Woodrow */
  WOODROW: "584",
  // 585–590 unassigned
  /** New Dorp Beach */
  NEW_DORP_BEACH: "591",
  /** Oakwood Beach */
  OAKWOOD_BEACH: "592",

  // === New Jersey ===
  // NJ neighborhoods use slug-based URLs (e.g. /for-rent/hoboken,
  // /for-rent/jersey-city) and do NOT have numeric area codes.
  // Multi-neighborhood NJ searches use the location filter modal.
} as const;

// ---------------------------------------------------------------------------
// Property type codes — from old code, verified via URL acceptance
// ---------------------------------------------------------------------------

export const STREETEASY_PROPERTY_TYPES = {
  /** Condo */
  CONDO: "D1",
  /** Co-op */
  COOP: "X",
  /** Condop */
  CONDOP: "D9",
  /** Rental building */
  RENTAL_BUILDING: "R1",
  /** Townhouse */
  TOWNHOUSE: "D2",
  /** Multi-family */
  MULTI_FAMILY: "D4",
  /** House */
  HOUSE: "D3",
} as const;

// ---------------------------------------------------------------------------
// Amenity codes — verified via URL + title confirmation
// ---------------------------------------------------------------------------

export const STREETEASY_AMENITIES = {
  /** No broker fee */
  NO_FEE: "no_fee",
  /** Pets allowed */
  PETS: "pets",
  /** Doorman building */
  DOORMAN: "doorman",
  /** Elevator */
  ELEVATOR: "elevator",
  /** In-unit washer/dryer */
  WASHER_DRYER: "washer_dryer",
  /** Dishwasher */
  DISHWASHER: "dishwasher",
  /** Gym / fitness center */
  GYM: "gym",
  /** Swimming pool */
  POOL: "pool",
  /** Roof deck */
  ROOF_DECK: "roof_deck",
  /** Private outdoor space */
  PRIVATE_OUTDOOR_SPACE: "private_outdoor_space",
  /** Parking available */
  PARKING: "parking",
  /** Storage available */
  STORAGE: "storage",
  /** Furnished */
  FURNISHED: "furnished",

  // TODO: verify additional amenity codes via browser UI:
  // laundry_in_building, concierge, bike_room, live_in_super,
  // central_air, fireplace, terrace, balcony, high_ceilings
} as const;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

export const streetEasyParamsSchema = z.object({
  location: z
    .string()
    .default("nyc")
    .describe(
      "Location slug in the URL path. Default 'nyc' (all NYC + NJ). " +
        "Other values: 'manhattan', 'brooklyn', 'queens', 'bronx', " +
        "'staten-island', 'new-jersey', 'jersey-city-nj', 'hoboken-nj'.",
    ),

  type: z
    .array(z.string())
    .optional()
    .describe(
      "Property type codes (comma-separated in URL). " +
        "D1=condo, X=co-op, D9=condop, R1=rental building, " +
        "D2=townhouse, D4=multi-family, D3=house. " +
        "Example: ['D1', 'X'] for condos and co-ops.",
    ),

  priceMin: z
    .number()
    .optional()
    .describe("Minimum price in USD. Rent: monthly. Buy: total price."),
  priceMax: z.number().optional().describe("Maximum price in USD."),

  bedsMin: z.number().optional().describe("Minimum bedrooms. 0 = studio."),
  bedsMax: z
    .number()
    .optional()
    .describe("Maximum bedrooms. Omit for no upper limit."),

  bathsMin: z
    .number()
    .optional()
    .describe("Minimum bathrooms. Supports decimals (1.5)."),

  areaSqftMin: z
    .number()
    .optional()
    .describe("Minimum area in sqft. Convert from m²: 1 m² ≈ 10.764 sqft."),

  amenities: z
    .array(z.string())
    .optional()
    .describe(
      "Amenity codes (comma-separated in URL). " +
        "Verified: 'no_fee', 'pets', 'doorman', 'elevator', 'washer_dryer', " +
        "'dishwasher', 'gym', 'pool', 'roof_deck', 'private_outdoor_space', " +
        "'parking', 'storage', 'furnished'.",
    ),

  area: z
    .array(z.string())
    .optional()
    .describe(
      "Neighborhood area codes (comma-separated in URL). " +
        "Manhattan: 100=all, 115=Chelsea, 120=Midtown, 124=Midtown West, " +
        "130=Murray Hill, 137=UWS, 140=UES, 146=Hudson Yards, " +
        "152=Hell's Kitchen, 154=Central Harlem, 155=East Harlem, 157=West Village, " +
        "158=Flatiron. Brooklyn: 300=all, 301=Greenpoint, 302=Williamsburg, " +
        "319=Park Slope, 325=Crown Heights. Queens: 400=all, 401=Astoria, " +
        "402=LIC. Use STREETEASY_AREAS constant for full mapping.",
    ),

  sortBy: z
    .enum([
      "se_score",
      "price_asc",
      "price_desc",
      "listed_desc",
      "size_desc",
      "size_asc",
    ])
    .optional()
    .describe(
      "Sort order (query param, not path filter). " +
        "se_score=StreetEasy score (default), " +
        "price_asc/desc=by price, listed_desc=newest, size_asc/desc=by size.",
    ),
});

export type StreetEasyParams = z.infer<typeof streetEasyParamsSchema>;

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

function serializeStreetEasyUrl(baseUrl: string, params: unknown): string {
  const p = params as StreetEasyParams;

  // Build filter segments
  const filters: string[] = [];

  if (p.type && p.type.length > 0) {
    filters.push(`type:${p.type.join(",")}`);
  }

  if (p.priceMin != null || p.priceMax != null) {
    const min = p.priceMin ?? "";
    const max = p.priceMax ?? "";
    filters.push(`price:${min}-${max}`);
  }

  if (p.bedsMin != null || p.bedsMax != null) {
    if (p.bedsMax != null) {
      filters.push(`beds:${p.bedsMin ?? 0}-${p.bedsMax}`);
    } else {
      filters.push(`beds:${p.bedsMin ?? 0}`);
    }
  }

  if (p.bathsMin != null) {
    filters.push(`baths>=${p.bathsMin}`);
  }

  if (p.areaSqftMin != null) {
    filters.push(`area_sqft>=${p.areaSqftMin}`);
  }

  if (p.area && p.area.length > 0) {
    filters.push(`area:${p.area.join(",")}`);
  }

  if (p.amenities && p.amenities.length > 0) {
    filters.push(`amenities:${p.amenities.join(",")}`);
  }

  // Build path
  const location = p.location || "nyc";
  const filtersString = filters.length > 0 ? `/${filters.join("|")}` : "";
  const path = `${baseUrl}/${location}${filtersString}`;

  // Query params (sort)
  if (p.sortBy) {
    return `${path}?sort_by=${p.sortBy}`;
  }
  return path;
}

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

export const streetEasyConfig: ProviderUrlConfig = {
  id: "streeteasy.com",
  name: "StreetEasy",
  baseUrls: {
    buy: "https://streeteasy.com/for-sale",
    rent: "https://streeteasy.com/for-rent",
    // rent_short: not supported on StreetEasy
  },
  params: streetEasyParamsSchema,
  serialize: serializeStreetEasyUrl,
  knownLocations: {
    // === Manhattan — verified 2026-05-10 ===
    "Manhattan (all)": "100",
    "Roosevelt Island": "101",
    "Downtown (all)": "102",
    "Civic Center": "103",
    "Financial District": "104",
    Tribeca: "105",
    "Stuyvesant Town / PCV": "106",
    Soho: "107",
    "Little Italy": "108",
    "Lower East Side": "109",
    Chinatown: "110",
    "Two Bridges": "111",
    "Battery Park City": "112",
    "Gramercy Park": "113",
    "Fulton / Seaport": "114",
    Chelsea: "115",
    "Greenwich Village": "116",
    "East Village": "117",
    Noho: "118",
    "Midtown (all)": "119",
    Midtown: "120",
    "Central Park South": "121",
    "Midtown South": "122",
    "Midtown East": "123",
    "Midtown West": "124",
    "Murray Hill": "130",
    "Sutton Place": "131",
    "Turtle Bay": "132",
    "Kips Bay": "133",
    Beekman: "134",
    "Upper West Side (all)": "135",
    "Lincoln Square": "136",
    "Upper West Side": "137",
    "Manhattan Valley": "138",
    "Upper East Side (all)": "139",
    "Upper East Side": "140",
    "Lenox Hill": "141",
    Yorkville: "142",
    "Carnegie Hill": "143",
    "Upper Manhattan (all)": "144",
    "Hudson Heights": "145",
    "Hudson Yards": "146",
    "Morningside Heights": "147",
    "Hamilton Heights": "148",
    "Washington Heights": "149",
    Inwood: "150",
    "Fort George": "151",
    "Hell's Kitchen": "152",
    "West Harlem": "153",
    "Central Harlem": "154",
    "East Harlem": "155",
    "West Village": "157",
    Flatiron: "158",
    NoMad: "159",
    Manhattanville: "161",
    Nolita: "162",
    "West Chelsea": "163",
    "Upper Carnegie Hill": "164",
    "South Harlem": "165",
    "Hudson Square": "166",

    // === Brooklyn — verified 2026-05-10 ===
    "Brooklyn (all)": "300",
    Greenpoint: "301",
    Williamsburg: "302",
    "Downtown Brooklyn": "303",
    "Fort Greene": "304",
    "Brooklyn Heights": "305",
    "Boerum Hill": "306",
    DUMBO: "307",
    "Vinegar Hill": "308",
    "Bedford-Stuyvesant": "310",
    Bushwick: "313",
    "Red Hook": "318",
    "Park Slope": "319",
    Gowanus: "320",
    "Carroll Gardens": "321",
    "Cobble Hill": "322",
    "Sunset Park": "323",
    "Crown Heights": "325",
    "Prospect Heights": "326",
    "Bay Ridge": "331",
    "Prospect Lefferts Gardens": "329",
    "Clinton Hill": "364",
    "East Williamsburg": "373",
    Flatbush: "346",
    "Ditmas Park": "343",

    // === Queens — verified 2026-05-10 ===
    "Queens (all)": "400",
    Astoria: "401",
    "Long Island City": "402",
    Sunnyside: "403",
    "Jackson Heights": "405",
    Elmhurst: "408",
    Ridgewood: "412",
    "Rego Park": "414",
    "Forest Hills": "415",
    Flushing: "416",
    Bayside: "428",
    Jamaica: "432",
    "Far Rockaway": "440",
    "Hunters Point": "478",
    "Ditmars-Steinway": "474",

    // === Staten Island — verified 2026-05-10 ===
    "Staten Island (all)": "500",
    "Saint George": "569",
    Stapleton: "571",

    // === Bronx — verified 2026-05-10 ===
    "Bronx (all)": "200",
    "Mott Haven": "201",
    Riverdale: "225",

    // === New Jersey ===
    // NJ uses slug-based URLs, not area codes.
    // Use location='hoboken', 'jersey-city', etc.
  },
};
