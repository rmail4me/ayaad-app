// Shared types. These shapes mirror the Postgres schema in replica/schema.sql
// so the fake data layer can be swapped for the real Drizzle one later without
// touching screen code.

export type Country = 'AE' | 'SA';
export type Locale  = 'en' | 'ar';

export type PricingModel = 'per_unit' | 'tier_bedroom' | 'flat' | 'hourly' | 'per_visit' | 'quote';

export type ServiceCategory =
  | 'ac' | 'duct' | 'deep' | 'furniture' | 'pest' | 'handyman' | 'painting' | 'water_tank';

export interface Service {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  category: ServiceCategory;
  pricing_model: PricingModel;
  base_price_fils: number | null;
  currency: 'AED' | 'SAR';
  duration_estimate_min: number | null;
  inclusions_en: string[];
  exclusions_en: string[];
  hero_image_url: string | null;
  cancellation_window_hours: number;
  sort_order: number;
}

export interface ServiceTier {
  id: string;
  service_id: string;
  tier_key: string;
  label_en: string;
  label_ar: string;
  price_fils: number;
  sort_order: number;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  building_name?: string | null;
  unit_number?: string | null;
  block?: string | null;
  line1: string;                 // street / area / landmark
  line2?: string | null;
  city: string;
  emirate_or_region?: string | null;
  country: Country;
  lat?: number | null;
  lng?: number | null;
  access_method: 'home_present' | 'key_with_security' | 'under_mat' | 'unlocked';
  access_notes?: string | null;
  pets: boolean;
  is_default: boolean;
}

export interface Company {
  id: string;
  name_en: string;
  name_ar: string | null;
  trn: string | null;
  address_line1: string | null;
  city: string | null;
  country: Country;
  prepaid_balance_fils: number;
  currency: 'AED' | 'SAR';
  active: boolean;
}

export type UserRole = 'owner' | 'admin' | 'booker' | 'approver' | 'viewer';

export interface User {
  id: string;
  phone: string | null;
  phone_country: Country | null;
  email: string | null;
  full_name: string | null;
  locale: Locale;
  country: Country;
  company_id: string | null;
  role: UserRole;
}

export type BookingStatus =
  | 'draft' | 'pending_approval' | 'pending_payment' | 'paid' | 'matched'
  | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'expired';

export interface BookingTier { tier_key: string; label_en: string; label_ar: string; qty: number; unit_price_fils: number; }

export type PaidFrom = 'prepaid' | 'card' | 'wire' | 'cash';

export interface Booking {
  id: string;
  public_ref: string;
  user_id: string;
  company_id: string | null;
  service_id: string;
  address_id: string;
  start_at: string;
  duration_min: number;
  status: BookingStatus;
  paid_from: PaidFrom;
  tiers: BookingTier[];
  subtotal_fils: number;
  service_fee_fils: number;
  vat_fils: number;
  total_fils: number;
  currency: 'AED' | 'SAR';
  special_instructions?: string | null;
  invoice_number?: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  number: string;               // e.g. 'AYD-2026-000123'
  booking_id: string;
  issued_at: string;
  subtotal_fils: number;
  vat_fils: number;
  total_fils: number;
  currency: 'AED' | 'SAR';
}
