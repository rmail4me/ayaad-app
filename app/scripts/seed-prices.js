// One-shot catalog rebuild from Keyper rate card.
// Rule: price = JL where JL exists, else Keyper. User-approved 2026-10-20.
// Safe to re-run (truncates services + tiers; FK-cascading).

const { config } = require('dotenv');
config({ path: '.env.local' });
const postgres = require('postgres');

const AED = (d) => Math.round(d * 100);
// pick(jl, keyper) — "match JL where it exists, else fall back to Keyper"
const pick = (jl, keyper) => (jl ?? keyper);

const services = [
  { slug:'ac-cleaning',        name:'AC Cleaning',             category:'ac',         model:'per_unit',     dur:60,
    inc:['Trained technicians','Dust + filter + vent clean','Receipt + follow-up'],
    exc:['Gas refill','Compressor repair'] },
  { slug:'furniture-cleaning', name:'Furniture Cleaning',      category:'furniture',  model:'per_unit',     dur:60,
    inc:['Vacuum','Shampoo + hot-water extraction','Deodorise + 1h air-dry'],
    exc:['Leather treatment','Fabric dye repair'] },
  { slug:'deep-cleaning',      name:'Deep Cleaning',           category:'deep',       model:'tier_bedroom', dur:240,
    inc:['All rooms deep clean','Kitchen + bathrooms','Windows interior'],
    exc:['Exterior windows','Carpet shampoo (add-on)'] },
  { slug:'water-tank-cleaning',name:'Water Tank Cleaning',     category:'water_tank', model:'tier_bedroom', dur:90,
    inc:['Drain','Scrub + disinfect','Refill'],
    exc:['Pump repair'] },
  { slug:'pest-control',       name:'Pest Control',            category:'pest',       model:'tier_bedroom', dur:90,
    inc:['Spray treatment','Bait placement','1-month warranty'],
    exc:['Termite deep treatment'] },
  { slug:'painting',           name:'Painting (White / Off White)', category:'painting', model:'tier_bedroom', dur:null,
    inc:['Prep + 2 coats white or off-white','Paint supplied','Furniture moved'],
    exc:['Colour change','Wallpaper removal'] },
  { slug:'handyman',           name:'Handyman',                category:'handyman',   model:'per_unit',     dur:60,
    inc:['Trained handyman','Common tools','Minor fittings'],
    exc:['Specialist work','Materials'] },
];

// [slug, key, label, JL, Keyper] — JL null = JL doesn't offer, falls back to Keyper
const tiersRaw = [
  // AC Cleaning
  ['ac-cleaning','basic_ac',          'Basic AC cleaning (filter + vent) — ducted/central', 185, 185],
  ['ac-cleaning','split_ac',          'Split AC cleaning',                                       165, 165],
  ['ac-cleaning','window_ac',         'Window AC cleaning',                                      null, 149],
  ['ac-cleaning','deep_filter_duct',  'Deep AC cleaning (filter + duct)',                        469, 469],
  ['ac-cleaning','deep_filter_coil',  'Deep AC cleaning (filter + coil)',                        599, 599],
  ['ac-cleaning','full_system',       'Full system AC cleaning (filter + duct + coil)',          799, 799],
  // Furniture
  ['furniture-cleaning','sofa_1',       'Sofa — 1 seater',    79,  79],
  ['furniture-cleaning','sofa_2',       'Sofa — 2 seater',    99,  99],
  ['furniture-cleaning','sofa_3',       'Sofa — 3 seater',    132, 132],
  ['furniture-cleaning','sofa_recliner','Sofa — recliner',    79,  79],
  ['furniture-cleaning','sofa_4',       'Sofa — 4 seater',    199, 199],
  ['furniture-cleaning','sofa_5',       'Sofa — 5 seater',    219, 219],
  ['furniture-cleaning','sofa_6',       'Sofa — 6 seater',    null,179],
  ['furniture-cleaning','sofa_7',       'Sofa — 7 seater',    299, 299],
  ['furniture-cleaning','carpet_small', 'Carpet shampooing (small)',105, 115],
  ['furniture-cleaning','mattress',     'Mattress cleaning',       149, 220],
  // Deep Cleaning
  ['deep-cleaning','apt_unfurn_moveinout',  'Unfurnished apartment — move in/out',             null, 299],
  ['deep-cleaning','apt_furn_lite',         'Furnished apartment — deep clean lite (monthly)', 299,  299],
  ['deep-cleaning','apt_furn_intense',      'Furnished apartment — deep clean intense',        419,  419],
  ['deep-cleaning','apt_furn_moveinout',    'Furnished apartment — move in/out deep clean',    null, 314],
  ['deep-cleaning','villa_unfurn_moveinout','Unfurnished villa — move in/out',                 799,  999],
  ['deep-cleaning','villa_furn_moveinout',  'Furnished villa — move in/out deep clean',        null, 1049],
  ['deep-cleaning','villa_furn_lite',       'Furnished villa — deep clean lite (monthly)',     739,  849],
  ['deep-cleaning','villa_furn_intense',    'Furnished villa — deep clean intense',            1079, 1299],
  // Water Tank
  ['water-tank-cleaning','tank_1000gal', 'Standalone tank — up to 1,000 gallon', 949,  949],
  ['water-tank-cleaning','tank_2000gal', 'Standalone tank — up to 2,000 gallon', 1599, 1599],
  // Pest
  ['pest-control','studio',      'Cockroach / Ant / Bed Bug — studio',       139,  149],
  ['pest-control','apt_1br',     'Cockroach / Ant / Bed Bug — 1BR apartment',169,  179],
  ['pest-control','apt_2br',     'Cockroach / Ant / Bed Bug — 2BR apartment',189,  209],
  ['pest-control','apt_3br',     'Cockroach / Ant / Bed Bug — 3BR apartment',219,  239],
  ['pest-control','apt_4br',     'Cockroach / Ant / Bed Bug — 4BR apartment',239,  269],
  ['pest-control','apt_5br',     'Cockroach / Ant / Bed Bug — 5BR apartment',289,  299],
  ['pest-control','apt_6br',     'Cockroach / Ant / Bed Bug — 6BR apartment',null, 329],
  ['pest-control','flies_villa', 'Flies control — villa',                    219,  249],
  // Painting
  ['painting','studio',   'Studio',          449,  449],
  ['painting','1bhk',     '1 BHK apartment', 749,  749],
  ['painting','2bhk',     '2 BHK apartment', 1249, 1249],
  ['painting','3bhk',     '3 BHK apartment', 1549, 1549],
  ['painting','4bhk',     '4 BHK apartment', 1649, 1649],
  ['painting','villa_2br','2 Bedroom villa', 1989, 1989],
  ['painting','villa_3br','3 Bedroom villa', 2489, 2489],
  ['painting','villa_4br','4 Bedroom villa', 2989, 2989],
  ['painting','villa_5br','5 Bedroom villa', 3489, 3489],
  // Handyman (per hour)
  ['handyman','per_hour', 'Handyman work per hour', null, 130],
];

(async () => {
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1, prepare: false, idle_timeout: 60, connect_timeout: 30,
  });
  await sql`delete from service_pricing_tiers`;
  await sql`delete from services`;
  console.log('cleared old catalog');

  // Batch-insert services in one statement
  const svcRows = services.map((s, i) => ({
    slug: s.slug, name_en: s.name, name_ar: s.name,
    category: s.category, pricing_model: s.model, base_price_fils: null,
    duration_estimate_min: s.dur,
    inclusions_en: s.inc, exclusions_en: s.exc,
    sort_order: (i + 1) * 10, active: true,
  }));
  await sql`insert into services ${sql(svcRows)}`;
  console.log(`inserted ${services.length} services`);

  // Get all service ids in one query
  const svcIds = {};
  (await sql`select id, slug from services`).forEach(r => { svcIds[r.slug] = r.id; });

  // Build + batch-insert all tiers
  const sortIdx = {};
  let matchedJL = 0, usedKeyper = 0;
  const tierRows = tiersRaw.map(([slug, key, label, jl, keyper]) => {
    sortIdx[slug] = (sortIdx[slug] ?? 0) + 1;
    if (jl !== null) matchedJL++; else usedKeyper++;
    const price = pick(jl, keyper);
    return {
      service_id: svcIds[slug], tier_key: key, label_en: label, label_ar: label,
      price_fils: AED(price), sort_order: sortIdx[slug], active: true,
    };
  });
  await sql`insert into service_pricing_tiers ${sql(tierRows)}`;
  console.log(`inserted ${tiersRaw.length} tiers: ${matchedJL} matched to Justlife, ${usedKeyper} fell back to Keyper (JL doesn't offer)`);

  // Verify
  const svc = await sql`
    select s.slug, s.name_en, s.pricing_model, count(t.id)::int as tier_count,
           min(t.price_fils) as min_fils, max(t.price_fils) as max_fils
    from services s left join service_pricing_tiers t on t.service_id = s.id
    group by s.id, s.slug, s.name_en, s.pricing_model, s.sort_order
    order by s.sort_order
  `;
  console.log('\n== Catalog ==');
  svc.forEach(r => {
    const range = r.min_fils == null ? '' : ` · AED ${(Number(r.min_fils)/100).toFixed(0)}–${(Number(r.max_fils)/100).toFixed(0)}`;
    console.log(`  ${r.slug.padEnd(22)} ${r.name_en.padEnd(32)} ${r.pricing_model.padEnd(13)} ${r.tier_count} tiers${range}`);
  });

  await sql.end();
})().catch(e => { console.error(e.message); process.exit(1); });
