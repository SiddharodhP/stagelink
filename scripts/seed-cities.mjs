/**
 * One-time (re-runnable) city import.
 *
 *   node scripts/seed-cities.mjs
 *
 * Loads GeoNames cities15000 — every settlement over 15,000 people, about
 * 34,000 cities across 244 countries — into public.cities.
 *
 * Why a script rather than SQL: 34k rows is roughly 3MB of INSERT
 * statements. That is miserable to paste into a SQL editor, times out, and
 * cannot be re-run cleanly. This upserts in batches instead.
 *
 * Idempotent. Re-running updates population and coordinates rather than
 * duplicating rows, and it leaves the 53 hand-seeded cities from migration
 * 011 alone by matching them on name + state.
 *
 * Data: GeoNames, CC-BY 4.0 — https://download.geonames.org/export/dump/
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY: the table is world-readable but
 * writable only by the platform, which is the correct arrangement.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CACHE = join(ROOT, ".cache");

const GEONAMES = "https://download.geonames.org/export/dump";
// Every city over 15k people. cities5000 exists if you want ~50k instead,
// but below 15k the long tail is better served by get_or_create_city().
const CITIES_FILE = "cities15000";

/* ---------------------------------------------------------------- env */

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "").trim();
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

/* -------------------------------------------------------------- fetch */

async function download(name, binary = false) {
  if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });
  const cached = join(CACHE, name);
  if (existsSync(cached)) {
    console.log(`  cached  ${name}`);
    return binary ? readFileSync(cached) : readFileSync(cached, "utf8");
  }
  process.stdout.write(`  fetch   ${name} ... `);
  const res = await fetch(`${GEONAMES}/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(cached, buf);
  console.log(`${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  return binary ? buf : buf.toString("utf8");
}

/** Unzips the single .txt member of a GeoNames zip without a zip library. */
async function unzipSingle(buf, memberName) {
  // Central-directory parsing is overkill here: GeoNames zips hold one
  // deflate-compressed member, so locate its local header and inflate.
  const sig = buf.indexOf(Buffer.from("PK\x03\x04"));
  if (sig !== 0) throw new Error("Unexpected zip layout");
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const start = 30 + nameLen + extraLen;
  const name = buf.slice(30, 30 + nameLen).toString();
  if (!name.startsWith(memberName)) {
    throw new Error(`Expected ${memberName} in zip, found ${name}`);
  }
  const { inflateRawSync } = await import("node:zlib");
  return inflateRawSync(buf.slice(start)).toString("utf8");
}

/* --------------------------------------------------------------- main */

function slugify(...parts) {
  return parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Loading GeoNames reference data");
  const admin1Raw = await download("admin1CodesASCII.txt");
  const countryRaw = await download("countryInfo.txt");
  const zipBuf = await download(`${CITIES_FILE}.zip`, true);
  const citiesRaw = await unzipSingle(zipBuf, `${CITIES_FILE}.txt`);

  // "IN.19" -> "Karnataka"
  const admin1 = new Map();
  for (const line of admin1Raw.split("\n")) {
    const f = line.split("\t");
    if (f.length >= 2) admin1.set(f[0], f[1]);
  }

  // "IN" -> "India"
  const countries = new Map();
  for (const line of countryRaw.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const f = line.split("\t");
    if (f.length >= 5) countries.set(f[0], f[4]);
  }

  const seen = new Set();
  const rows = [];
  for (const line of citiesRaw.split("\n")) {
    if (!line.trim()) continue;
    const f = line.split("\t");
    // GeoNames columns: 0 id, 1 name, 4 lat, 5 lon, 8 country, 10 admin1, 14 pop
    const [id, name] = [Number(f[0]), f[1]];
    const cc = f[8];
    if (!id || !name || !cc) continue;

    // cities.state is NOT NULL, and city-states (Singapore, Monaco) plus a
    // few territories have no admin1 region at all. Empty string rather
    // than null: every display path filters falsy values out anyway, and
    // cities_natural_uniq already coalesces state to '' for its key.
    const state = admin1.get(`${cc}.${f[10]}`) || "";
    const country = countries.get(cc) || cc;
    const population = Number(f[14] || 0);

    // Slugs live in URLs, so they must be unique. Try the short form first
    // and fall back to the fully qualified one.
    let slug = slugify(name, state, cc);
    if (seen.has(slug)) slug = slugify(name, state, cc, String(id));
    seen.add(slug);

    rows.push({
      geoname_id: id,
      name,
      state,
      country,
      country_code: cc,
      slug,
      population,
      latitude: Number(f[4]) || null,
      longitude: Number(f[5]) || null,
      // Anything over a million reads as a major market.
      is_metro: population >= 1_000_000,
    });
  }

  console.log(
    `\nParsed ${rows.length.toLocaleString()} cities across ` +
      `${new Set(rows.map((r) => r.country_code)).size} countries`
  );

  const supabase = createClient(URL_, KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Reconcile with the 53 rows migration 011 inserted by hand: give them
  // their GeoNames id so the upsert below updates rather than duplicates.
  const { data: manual } = await supabase
    .from("cities")
    .select("id, name, state")
    .is("geoname_id", null);

  if (manual?.length) {
    console.log(`\nAdopting ${manual.length} hand-seeded cities`);
    const byKey = new Map(
      rows.map((r) => [`${r.name.toLowerCase()}|${(r.state || "").toLowerCase()}`, r])
    );
    let adopted = 0;
    for (const m of manual) {
      const match = byKey.get(
        `${m.name.toLowerCase()}|${(m.state || "").toLowerCase()}`
      );
      if (!match) continue;
      const { error } = await supabase
        .from("cities")
        .update({
          geoname_id: match.geoname_id,
          population: match.population,
          latitude: match.latitude,
          longitude: match.longitude,
          country_code: match.country_code,
          is_metro: match.is_metro,
        })
        .eq("id", m.id);
      if (!error) {
        adopted++;
        // Keep the original short slug — it may already be in the sitemap.
        match.__skip = true;
      }
    }
    console.log(`  matched ${adopted}`);
  }

  // Two things the raw dataset can't be written straight from:
  //
  // 1. cities_natural_uniq is (lower(name), lower(state), country_code), and
  //    GeoNames genuinely holds several same-named towns in one region.
  //    Keep the largest; a typeahead showing "Springfield, Illinois" three
  //    times helps nobody.
  // 2. cities_geoname_uniq is a PARTIAL index (where geoname_id is not
  //    null), and Postgres won't use a partial index for ON CONFLICT. So
  //    inserts and updates are split by hand instead of upserted.
  const byNatural = new Map();
  for (const r of rows) {
    if (r.__skip) continue;
    const key = `${r.name.toLowerCase()}|${(r.state || "").toLowerCase()}|${r.country_code}`;
    const existing = byNatural.get(key);
    if (!existing || (r.population || 0) > (existing.population || 0)) {
      byNatural.set(key, r);
    }
  }
  const deduped = [...byNatural.values()].map(({ __skip, ...r }) => r);
  const dropped = rows.filter((r) => !r.__skip).length - deduped.length;
  if (dropped > 0) {
    console.log(`\nCollapsed ${dropped.toLocaleString()} same-name duplicates`);
  }

  // Which GeoNames ids are already stored, so a re-run updates instead of
  // colliding. Paged, because the table outgrows one response.
  console.log("\nChecking what is already loaded");
  const existingIds = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("cities")
      .select("geoname_id")
      .not("geoname_id", "is", null)
      .range(from, from + 999);
    if (error || !data?.length) break;
    for (const r of data) existingIds.add(r.geoname_id);
    if (data.length < 1000) break;
  }
  console.log(`  ${existingIds.size.toLocaleString()} already present`);

  const toInsert = deduped.filter((r) => !existingIds.has(r.geoname_id));
  const toUpdate = deduped.filter((r) => existingIds.has(r.geoname_id));

  const BATCH = 500;
  let done = 0;
  let failed = 0;

  if (toInsert.length) {
    console.log(`\nInserting ${toInsert.length.toLocaleString()} new cities`);
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const chunk = toInsert.slice(i, i + BATCH);
      const { error } = await supabase.from("cities").insert(chunk);
      if (error) {
        if (i === 0) {
          console.error(`\n\nFirst batch failed: ${error.message}`);
          if (/column|schema cache|does not exist/i.test(error.message)) {
            console.error(
              "\nRun the migrations first:" +
                "\n  011_profiles_location_privacy_discovery.sql" +
                "\n  012_cities_worldwide.sql"
            );
          }
          process.exit(1);
        }
        failed += chunk.length;
        console.error(`\n  batch ${i / BATCH + 1}: ${error.message}`);
      } else {
        done += chunk.length;
      }
      process.stdout.write(
        `\r  ${done.toLocaleString()} / ${toInsert.length.toLocaleString()}`
      );
    }
  }

  // Refreshing existing rows means one UPDATE each — 24,000 sequential
  // requests, which takes far longer than the import itself and changes
  // nothing on a normal run, since populations only move when GeoNames
  // publishes a new dump. Opt in with --refresh when that happens.
  if (toUpdate.length && process.argv.includes("--refresh")) {
    console.log(`\n\nRefreshing ${toUpdate.length.toLocaleString()} existing cities`);
    let updated = 0;
    for (const r of toUpdate) {
      const { error } = await supabase
        .from("cities")
        .update({ population: r.population, is_metro: r.is_metro })
        .eq("geoname_id", r.geoname_id);
      if (!error) updated++;
    }
    console.log(`  ${updated.toLocaleString()} refreshed`);
  } else if (toUpdate.length) {
    console.log(
      `\n\n${toUpdate.length.toLocaleString()} already loaded, left as they are` +
        ` (pass --refresh to update populations)`
    );
  }

  const { count } = await supabase
    .from("cities")
    .select("id", { count: "exact", head: true });

  console.log(`\n\nDone. ${count?.toLocaleString()} cities in the table.`);
  if (failed) console.log(`${failed.toLocaleString()} rows failed — re-run to retry.`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
