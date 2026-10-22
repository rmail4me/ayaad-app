// Catalog update v2 (2026-10-22):
//   * FC — add missing items (sized mattresses, curtain sizes, carpet sizes, dining chair,
//     cushion, armchair, L-shape sofa). Keep existing sofa + carpet-small prices.
//     Replace the generic "Mattress cleaning" (AED 149) with 5 sized variants.
//   * DC — scrap the 8 lite/intense/move-in-out tiers and rebuild with 9 property-type
//     tiers, same shape as Painting.
//
// Deactivates old tiers instead of deleting, so existing booking_tiers rows (which hold
// a snapshot of the price at booking time) remain intact.

const { config } = require('dotenv');
config({ path: '.env.local' });
const postgres = require('postgres');

const AED = (d) => Math.round(d * 100);

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, idle_timeout: 60 });

  // ---------- Furniture Cleaning: ADD missing items ----------
  const [furniture] = await sql`select id from services where slug = 'furniture-cleaning'`;
  if (!furniture) throw new Error('furniture-cleaning service not found');

  // Deactivate the generic single-mattress tier (replaced by 5 sized variants)
  await sql`
    update service_pricing_tiers
       set active = false
     where service_id = ${furniture.id} and tier_key = 'mattress'
  `;

  // Figure out the next sort_order
  const [{ max_sort }] = await sql`
    select coalesce(max(sort_order), 0) as max_sort
    from service_pricing_tiers where service_id = ${furniture.id}
  `;
  let fcSort = Number(max_sort);

  const fcAdditions = [
    { k: 'sofa_lshape',       label: 'Sofa — L-shape',               price: 299 },
    { k: 'armchair',          label: 'Armchair / single unit',       price: 100 },
    { k: 'dining_chair',      label: 'Dining chair',                 price: 35 },
    { k: 'cushion',           label: 'Cushion',                      price: 25 },
    // Carpet sizes
    { k: 'carpet_medium',     label: 'Carpet shampooing — medium (6–10 sqm)', price: 189 },
    { k: 'carpet_large',      label: 'Carpet shampooing — large (11–15 sqm)', price: 269 },
    { k: 'carpet_xl',         label: 'Carpet shampooing — X-large (16+ sqm)', price: 349 },
    // Mattress sizes (replacing the generic one)
    { k: 'mattress_single',   label: 'Mattress — Single',            price: 149 },
    { k: 'mattress_double',   label: 'Mattress — Double',            price: 199 },
    { k: 'mattress_queen',    label: 'Mattress — Queen',             price: 229 },
    { k: 'mattress_king',     label: 'Mattress — King',              price: 269 },
    { k: 'mattress_crib',     label: 'Mattress — Baby crib',         price: 79 },
    // Curtain sizes
    { k: 'curtain_small',     label: 'Curtain — small (1–2 panels)', price: 105 },
    { k: 'curtain_medium',    label: 'Curtain — medium (3–4 panels)',price: 149 },
    { k: 'curtain_large',     label: 'Curtain — large (5–6 panels)', price: 199 },
    { k: 'curtain_xl',        label: 'Curtain — X-large (7+ panels)',price: 249 },
  ].map(t => ({ ...t, service_id: furniture.id, sort_order: ++fcSort }));

  // Insert — ON CONFLICT re-activates and updates price for existing keys
  for (const t of fcAdditions) {
    await sql`
      insert into service_pricing_tiers (service_id, tier_key, label_en, label_ar, price_fils, sort_order, active)
      values (${t.service_id}, ${t.k}, ${t.label}, ${t.label}, ${AED(t.price)}, ${t.sort_order}, true)
      on conflict (service_id, tier_key) do update
         set label_en = excluded.label_en,
             label_ar = excluded.label_ar,
             price_fils = excluded.price_fils,
             active = true
    `;
  }

  // ---------- Deep Cleaning: REPLACE with property-type tiers ----------
  const [deep] = await sql`select id from services where slug = 'deep-cleaning'`;
  if (!deep) throw new Error('deep-cleaning service not found');

  // Deactivate all existing DC tiers (preserve history)
  await sql`update service_pricing_tiers set active = false where service_id = ${deep.id}`;

  // New painting-style tiers (JL-matched where known; otherwise reasonable progression)
  const dcTiers = [
    { k: 'studio',       label: 'Studio apartment',       price: 299 },  // matches JL "furn apt lite monthly"
    { k: '1bhk_apt',     label: '1 BHK apartment',        price: 349 },
    { k: '2bhk_apt',     label: '2 BHK apartment',        price: 449 },
    { k: '3bhk_apt',     label: '3 BHK apartment',        price: 549 },
    { k: '4bhk_apt',     label: '4 BHK apartment',        price: 649 },
    { k: 'villa_2br',    label: '2 Bedroom villa',        price: 749 },  // matches JL "furn villa lite monthly" 739
    { k: 'villa_3br',    label: '3 Bedroom villa',        price: 899 },
    { k: 'villa_4br',    label: '4 Bedroom villa',        price: 999 },
    { k: 'villa_5br',    label: '5 Bedroom villa',        price: 1079 }, // matches JL "furn villa intense" 1079
  ];

  for (let i = 0; i < dcTiers.length; i++) {
    const t = dcTiers[i];
    await sql`
      insert into service_pricing_tiers (service_id, tier_key, label_en, label_ar, price_fils, sort_order, active)
      values (${deep.id}, ${t.k}, ${t.label}, ${t.label}, ${AED(t.price)}, ${i + 1}, true)
      on conflict (service_id, tier_key) do update
         set label_en = excluded.label_en,
             label_ar = excluded.label_ar,
             price_fils = excluded.price_fils,
             sort_order = excluded.sort_order,
             active = true
    `;
  }

  // ---------- Verify ----------
  const after = await sql`
    select s.slug, s.name_en, s.pricing_model,
           count(t.id) filter (where t.active) as active_tiers,
           count(t.id) filter (where not t.active) as inactive_tiers,
           min(t.price_fils) filter (where t.active) as min_fils,
           max(t.price_fils) filter (where t.active) as max_fils
      from services s left join service_pricing_tiers t on t.service_id = s.id
     group by s.id, s.slug, s.name_en, s.pricing_model, s.sort_order
     order by s.sort_order
  `;
  console.log('\n== Catalog after update ==');
  after.forEach(r => {
    const range = r.min_fils == null ? '' : ` · AED ${(Number(r.min_fils)/100).toFixed(0)}–${(Number(r.max_fils)/100).toFixed(0)}`;
    const extra = Number(r.inactive_tiers) ? ` (+${r.inactive_tiers} archived)` : '';
    console.log(`  ${r.slug.padEnd(22)} ${r.name_en.padEnd(32)} ${r.pricing_model.padEnd(13)} ${r.active_tiers} active${extra}${range}`);
  });

  // Show the new FC and DC tier lists in detail
  for (const slug of ['furniture-cleaning', 'deep-cleaning']) {
    const tiers = await sql`
      select t.tier_key, t.label_en, t.price_fils, t.sort_order
      from service_pricing_tiers t
      join services s on s.id = t.service_id
      where s.slug = ${slug} and t.active = true
      order by t.sort_order
    `;
    console.log(`\n== ${slug} ==`);
    tiers.forEach(t => console.log(`  [${String(t.sort_order).padStart(2)}] ${t.label_en.padEnd(45)} AED ${(Number(t.price_fils)/100).toFixed(2)}`));
  }

  await sql.end();
})().catch(e => { console.error(e.message); process.exit(1); });
