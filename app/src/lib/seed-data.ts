// Seed catalog — mirrors the INSERT INTO services block in replica/schema.sql.
// Prices filled in with Justlife-public-rate-informed placeholders.
// Admin edits via the admin console in M2.

import type { Service, ServiceTier } from './types';

const AED = (dirhams: number) => dirhams * 100; // → fils

export const seedServices: Service[] = [
  {
    id: 'svc_ac', slug: 'ac-basic-cleaning', name_en: 'AC Basic Cleaning', name_ar: 'تنظيف المكيف الأساسي',
    category: 'ac', pricing_model: 'per_unit', base_price_fils: null, currency: 'AED',
    duration_estimate_min: 45,
    inclusions_en: ['Dust removal', 'Filter wash', 'Visible-coil wipe'],
    exclusions_en: ['Deep coil cleaning', 'Duct cleaning', 'Gas refill'],
    hero_image_url: null, cancellation_window_hours: 4, sort_order: 10,
  },
  {
    id: 'svc_duct', slug: 'duct-cleaning', name_en: 'Duct Cleaning', name_ar: 'تنظيف المجاري',
    category: 'duct', pricing_model: 'flat', base_price_fils: AED(499), currency: 'AED',
    duration_estimate_min: 120,
    inclusions_en: ['Full duct vacuum', 'Air outlet cleaning'],
    exclusions_en: ['Coil deep clean', 'Chemical wash'],
    hero_image_url: null, cancellation_window_hours: 4, sort_order: 20,
  },
  {
    id: 'svc_duct_coil', slug: 'duct-coil-deep-cleaning', name_en: 'Duct & Coil Deep Cleaning', name_ar: 'تنظيف عميق للمجاري والملف',
    category: 'duct', pricing_model: 'flat', base_price_fils: AED(899), currency: 'AED',
    duration_estimate_min: 180,
    inclusions_en: ['Full duct vacuum', 'Coil chemical wash', 'Air outlet cleaning', 'Drainage flush'],
    exclusions_en: ['Gas refill'],
    hero_image_url: null, cancellation_window_hours: 4, sort_order: 30,
  },
  {
    id: 'svc_deep_apt', slug: 'deep-cleaning-apartment', name_en: 'Deep Cleaning — Apartment', name_ar: 'التنظيف العميق — شقة',
    category: 'deep', pricing_model: 'tier_bedroom', base_price_fils: null, currency: 'AED',
    duration_estimate_min: 240,
    inclusions_en: ['All rooms deep clean', 'Kitchen & bathroom deep', 'Windows interior'],
    exclusions_en: ['Exterior windows', 'Carpet shampoo (add-on)'],
    hero_image_url: null, cancellation_window_hours: 2, sort_order: 40,
  },
  {
    id: 'svc_deep_villa', slug: 'deep-cleaning-villa', name_en: 'Deep Cleaning — Villa', name_ar: 'التنظيف العميق — فيلا',
    category: 'deep', pricing_model: 'tier_bedroom', base_price_fils: null, currency: 'AED',
    duration_estimate_min: 360,
    inclusions_en: ['All rooms deep clean', 'Kitchen & bathroom deep', 'Windows interior'],
    exclusions_en: ['Exterior windows', 'Garden'],
    hero_image_url: null, cancellation_window_hours: 2, sort_order: 50,
  },
  {
    id: 'svc_furniture', slug: 'furniture-cleaning', name_en: 'Furniture Cleaning', name_ar: 'تنظيف الأثاث',
    category: 'furniture', pricing_model: 'per_unit', base_price_fils: null, currency: 'AED',
    duration_estimate_min: 90,
    inclusions_en: ['Vacuum', 'Shampoo + extraction', 'Deodorize'],
    exclusions_en: ['Leather treatment', 'Dye repair'],
    hero_image_url: null, cancellation_window_hours: 2, sort_order: 60,
  },
  {
    id: 'svc_pest_apt', slug: 'pest-control-apartment', name_en: 'General Pest Control — Apartment', name_ar: 'مكافحة الآفات العامة — شقة',
    category: 'pest', pricing_model: 'tier_bedroom', base_price_fils: null, currency: 'AED',
    duration_estimate_min: 90,
    inclusions_en: ['Spray treatment', 'Bait placement', '1-month warranty'],
    exclusions_en: ['Termite treatment', 'Bedbug deep treatment'],
    hero_image_url: null, cancellation_window_hours: 2, sort_order: 70,
  },
  {
    id: 'svc_pest_villa', slug: 'pest-control-villa', name_en: 'General Pest Control — Villa', name_ar: 'مكافحة الآفات العامة — فيلا',
    category: 'pest', pricing_model: 'tier_bedroom', base_price_fils: null, currency: 'AED',
    duration_estimate_min: 120,
    inclusions_en: ['Spray treatment', 'Bait placement', '1-month warranty'],
    exclusions_en: ['Termite treatment', 'Bedbug deep treatment'],
    hero_image_url: null, cancellation_window_hours: 2, sort_order: 80,
  },
  {
    id: 'svc_handyman', slug: 'handyman', name_en: 'Handyman', name_ar: 'عامل صيانة',
    category: 'handyman', pricing_model: 'per_visit', base_price_fils: AED(150), currency: 'AED',
    duration_estimate_min: 60,
    inclusions_en: ['Call-out', 'Up to 1 hour included'],
    exclusions_en: ['Materials', 'Specialist work'],
    hero_image_url: null, cancellation_window_hours: 2, sort_order: 90,
  },
  {
    id: 'svc_painting', slug: 'painting', name_en: 'Painting', name_ar: 'طلاء',
    category: 'painting', pricing_model: 'quote', base_price_fils: null, currency: 'AED',
    duration_estimate_min: null,
    inclusions_en: ['Priced on inspection'],
    exclusions_en: ['Furniture moving (add-on)'],
    hero_image_url: null, cancellation_window_hours: 24, sort_order: 100,
  },
  {
    id: 'svc_tank', slug: 'water-tank-cleaning', name_en: 'Water Tank Cleaning', name_ar: 'تنظيف خزان المياه',
    category: 'water_tank', pricing_model: 'flat', base_price_fils: AED(299), currency: 'AED',
    duration_estimate_min: 90,
    inclusions_en: ['Drain', 'Scrub + disinfect', 'Refill'],
    exclusions_en: ['Pump repair'],
    hero_image_url: null, cancellation_window_hours: 2, sort_order: 110,
  },
];

export const seedTiers: ServiceTier[] = [
  // AC per unit
  { id: 't_ac_u', service_id: 'svc_ac', tier_key: 'per_ac_unit', label_en: 'Per AC Unit', label_ar: 'لكل مكيف', price_fils: AED(70),  sort_order: 1 },

  // Deep cleaning apartment tiers (JL-informed placeholder prices)
  { id: 't_dapt_s',  service_id: 'svc_deep_apt', tier_key: 'studio', label_en: 'Studio',       label_ar: 'استوديو',  price_fils: AED(329), sort_order: 1 },
  { id: 't_dapt_1',  service_id: 'svc_deep_apt', tier_key: '1br',    label_en: '1 Bedroom',    label_ar: 'غرفة واحدة', price_fils: AED(399), sort_order: 2 },
  { id: 't_dapt_2',  service_id: 'svc_deep_apt', tier_key: '2br',    label_en: '2 Bedrooms',   label_ar: 'غرفتان',     price_fils: AED(529), sort_order: 3 },
  { id: 't_dapt_3',  service_id: 'svc_deep_apt', tier_key: '3br',    label_en: '3 Bedrooms',   label_ar: '3 غرف',      price_fils: AED(699), sort_order: 4 },
  { id: 't_dapt_4',  service_id: 'svc_deep_apt', tier_key: '4br',    label_en: '4 Bedrooms',   label_ar: '4 غرف',      price_fils: AED(849), sort_order: 5 },

  // Deep cleaning villa tiers
  { id: 't_dv_3',  service_id: 'svc_deep_villa', tier_key: '3br',       label_en: '3 Bedrooms', label_ar: '3 غرف',          price_fils: AED(899),  sort_order: 1 },
  { id: 't_dv_4',  service_id: 'svc_deep_villa', tier_key: '4br',       label_en: '4 Bedrooms', label_ar: '4 غرف',          price_fils: AED(1099), sort_order: 2 },
  { id: 't_dv_5',  service_id: 'svc_deep_villa', tier_key: '5br',       label_en: '5 Bedrooms', label_ar: '5 غرف',          price_fils: AED(1299), sort_order: 3 },
  { id: 't_dv_6',  service_id: 'svc_deep_villa', tier_key: '6br_plus',  label_en: '6+ Bedrooms',label_ar: '6 غرف أو أكثر', price_fils: AED(1499), sort_order: 4 },

  // Pest apartment
  { id: 't_pa_s', service_id: 'svc_pest_apt', tier_key: 'studio', label_en: 'Studio',     label_ar: 'استوديو',   price_fils: AED(149), sort_order: 1 },
  { id: 't_pa_1', service_id: 'svc_pest_apt', tier_key: '1br',    label_en: '1 Bedroom',  label_ar: 'غرفة واحدة',price_fils: AED(179), sort_order: 2 },
  { id: 't_pa_2', service_id: 'svc_pest_apt', tier_key: '2br',    label_en: '2 Bedrooms', label_ar: 'غرفتان',    price_fils: AED(199), sort_order: 3 },
  { id: 't_pa_3', service_id: 'svc_pest_apt', tier_key: '3br',    label_en: '3 Bedrooms', label_ar: '3 غرف',     price_fils: AED(229), sort_order: 4 },
  { id: 't_pa_4', service_id: 'svc_pest_apt', tier_key: '4br',    label_en: '4 Bedrooms', label_ar: '4 غرف',     price_fils: AED(259), sort_order: 5 },

  // Pest villa
  { id: 't_pv_3', service_id: 'svc_pest_villa', tier_key: '3br',      label_en: '3 Bedrooms',  label_ar: '3 غرف',          price_fils: AED(299), sort_order: 1 },
  { id: 't_pv_4', service_id: 'svc_pest_villa', tier_key: '4br',      label_en: '4 Bedrooms',  label_ar: '4 غرف',          price_fils: AED(349), sort_order: 2 },
  { id: 't_pv_5', service_id: 'svc_pest_villa', tier_key: '5br',      label_en: '5 Bedrooms',  label_ar: '5 غرف',          price_fils: AED(399), sort_order: 3 },
  { id: 't_pv_6', service_id: 'svc_pest_villa', tier_key: '6br_plus', label_en: '6+ Bedrooms', label_ar: '6 غرف أو أكثر', price_fils: AED(449), sort_order: 4 },

  // Furniture per piece
  { id: 't_fur_1', service_id: 'svc_furniture', tier_key: 'per_sofa_1',  label_en: '1-Seater',       label_ar: 'مقعد واحد',       price_fils: AED(45),  sort_order: 1 },
  { id: 't_fur_2', service_id: 'svc_furniture', tier_key: 'per_sofa_2',  label_en: '2-Seater',       label_ar: 'مقعدان',          price_fils: AED(70),  sort_order: 2 },
  { id: 't_fur_3', service_id: 'svc_furniture', tier_key: 'per_sofa_3',  label_en: '3-Seater',       label_ar: 'ثلاثة مقاعد',    price_fils: AED(95),  sort_order: 3 },
  { id: 't_fur_l', service_id: 'svc_furniture', tier_key: 'per_lshape',  label_en: 'L-Shape',        label_ar: 'شكل حرف L',       price_fils: AED(135), sort_order: 4 },
  { id: 't_fur_m', service_id: 'svc_furniture', tier_key: 'per_mattress',label_en: 'Mattress',       label_ar: 'مرتبة',           price_fils: AED(85),  sort_order: 5 },
  { id: 't_fur_c', service_id: 'svc_furniture', tier_key: 'per_carpet',  label_en: 'Carpet (per sqm)',label_ar: 'سجاد (متر مربع)',price_fils: AED(15),  sort_order: 6 },
];
