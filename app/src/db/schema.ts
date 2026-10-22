// Drizzle schema — mirrors replica/schema.sql.
// Keep in sync: when either changes, regenerate the migration and apply.
// Money is bigint fils (1 AED = 100 fils). Times are UTC via timestamptz.

import {
  pgTable, uuid, text, timestamp, boolean, integer, bigint, smallint,
  numeric, char, jsonb, bigserial, unique, index, check, pgPolicy, primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const gen_uuid = sql`gen_random_uuid()`;
const now = sql`now()`;

export const legalEntities = pgTable('legal_entities', {
  id:            uuid('id').primaryKey().default(gen_uuid),
  name:          text('name').notNull(),
  trn:           text('trn').notNull().unique(),
  addressLine1:  text('address_line1').notNull(),
  addressLine2:  text('address_line2'),
  city:          text('city').notNull(),
  country:       char('country', { length: 2 }).notNull(),
  phone:         text('phone'),
  email:         text('email'),
  invoicePrefix: text('invoice_prefix').notNull().unique(),
  active:        boolean('active').notNull().default(true),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().default(now),
});

export const companies = pgTable('companies', {
  id:                   uuid('id').primaryKey().default(gen_uuid),
  nameEn:               text('name_en').notNull(),
  nameAr:               text('name_ar'),
  trn:                  text('trn'),
  addressLine1:         text('address_line1'),
  addressLine2:         text('address_line2'),
  city:                 text('city'),
  country:              char('country', { length: 2 }).notNull().default('AE'),
  phone:                text('phone'),
  email:                text('email'),
  prepaidBalanceFils:   bigint('prepaid_balance_fils', { mode: 'number' }).notNull().default(0),
  currency:             char('currency', { length: 3 }).notNull().default('AED'),
  rateCardJson:         jsonb('rate_card_json'),
  active:               boolean('active').notNull().default(true),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().default(now),
});

export const users = pgTable('users', {
  id:               uuid('id').primaryKey().default(gen_uuid),
  phone:            text('phone'),
  phoneCountry:     char('phone_country', { length: 2 }),
  email:            text('email'),
  fullName:         text('full_name'),
  locale:           text('locale').notNull().default('en'),
  country:          char('country', { length: 2 }).notNull(),
  companyId:        uuid('company_id').references(() => companies.id, { onDelete: 'restrict' }),
  role:             text('role').notNull().default('booker'),
  defaultAddressId: uuid('default_address_id'),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().default(now),
  deletedAt:        timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  phoneIdx:   index().on(t.phone),
  companyIdx: index().on(t.companyId),
}));

export const authTokens = pgTable('auth_tokens', {
  id:          uuid('id').primaryKey().default(gen_uuid),
  tokenHash:   text('token_hash').notNull().unique(),
  userId:      uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email:       text('email').notNull(),
  purpose:     text('purpose').notNull().default('login'),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt:  timestamp('consumed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({ emailIdx: index().on(t.email), expiresIdx: index().on(t.expiresAt) }));

export const companyBalanceTxns = pgTable('company_balance_txns', {
  id:            uuid('id').primaryKey().default(gen_uuid),
  companyId:     uuid('company_id').notNull().references(() => companies.id, { onDelete: 'restrict' }),
  deltaFils:     bigint('delta_fils', { mode: 'number' }).notNull(),
  reason:        text('reason').notNull(),
  bookingId:     uuid('booking_id'),
  actorUserId:   uuid('actor_user_id'),
  note:          text('note'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({ companyIdx: index().on(t.companyId, t.createdAt) }));

export const addresses = pgTable('addresses', {
  id:               uuid('id').primaryKey().default(gen_uuid),
  userId:           uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label:            text('label').notNull().default('Home'),
  line1:            text('line1').notNull(),
  line2:            text('line2'),
  city:             text('city').notNull(),
  emirateOrRegion:  text('emirate_or_region'),
  country:          char('country', { length: 2 }).notNull(),
  lat:              numeric('lat', { precision: 9, scale: 6 }),
  lng:              numeric('lng', { precision: 9, scale: 6 }),
  buildingName:     text('building_name'),
  unitNumber:       text('unit_number'),
  block:            text('block'),
  accessMethod:     text('access_method').notNull().default('home_present'),
  accessNotes:      text('access_notes'),
  pets:             boolean('pets').notNull().default(false),
  isDefault:        boolean('is_default').notNull().default(false),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({ userIdx: index().on(t.userId) }));

export const paymentMethods = pgTable('payment_methods', {
  id:                   uuid('id').primaryKey().default(gen_uuid),
  userId:               uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:                 text('type').notNull(),
  provider:             text('provider').notNull().default('stripe'),
  providerCustomerId:   text('provider_customer_id').notNull(),
  providerPmId:         text('provider_pm_id').notNull(),
  brand:                text('brand'),
  last4:                char('last4', { length: 4 }),
  expMonth:             smallint('exp_month'),
  expYear:              smallint('exp_year'),
  isDefault:            boolean('is_default').notNull().default(false),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({
  pmUniq:  unique().on(t.provider, t.providerPmId),
  userIdx: index().on(t.userId),
}));

export const services = pgTable('services', {
  id:                       uuid('id').primaryKey().default(gen_uuid),
  slug:                     text('slug').notNull().unique(),
  nameEn:                   text('name_en').notNull(),
  nameAr:                   text('name_ar').notNull(),
  category:                 text('category').notNull(),
  pricingModel:             text('pricing_model').notNull(),
  basePriceFils:            bigint('base_price_fils', { mode: 'number' }),
  currency:                 char('currency', { length: 3 }).notNull().default('AED'),
  durationEstimateMin:      integer('duration_estimate_min'),
  inclusionsEn:             text('inclusions_en').array().notNull().default(sql`'{}'::text[]`),
  inclusionsAr:             text('inclusions_ar').array().notNull().default(sql`'{}'::text[]`),
  exclusionsEn:             text('exclusions_en').array().notNull().default(sql`'{}'::text[]`),
  exclusionsAr:             text('exclusions_ar').array().notNull().default(sql`'{}'::text[]`),
  heroImageUrl:             text('hero_image_url'),
  imagesUrl:                text('images_url').array().notNull().default(sql`'{}'::text[]`),
  faqJson:                  jsonb('faq_json').notNull().default(sql`'[]'::jsonb`),
  cancellationWindowHours:  integer('cancellation_window_hours').notNull().default(2),
  active:                   boolean('active').notNull().default(true),
  sortOrder:                integer('sort_order').notNull().default(0),
  createdAt:                timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:                timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({ activeIdx: index().on(t.active, t.sortOrder) }));

export const servicePricingTiers = pgTable('service_pricing_tiers', {
  id:          uuid('id').primaryKey().default(gen_uuid),
  serviceId:   uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  tierKey:     text('tier_key').notNull(),
  labelEn:     text('label_en').notNull(),
  labelAr:     text('label_ar').notNull(),
  priceFils:   bigint('price_fils', { mode: 'number' }).notNull(),
  active:      boolean('active').notNull().default(true),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({
  svcTierUniq: unique().on(t.serviceId, t.tierKey),
  svcIdx:      index().on(t.serviceId),
}));

export const bookings = pgTable('bookings', {
  id:                   uuid('id').primaryKey().default(gen_uuid),
  publicRef:            text('public_ref').notNull().unique().default(sql`upper(substr(gen_random_uuid()::text,1,6))`),
  userId:               uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  companyId:            uuid('company_id').references(() => companies.id, { onDelete: 'restrict' }),
  serviceId:            uuid('service_id').notNull().references(() => services.id, { onDelete: 'restrict' }),
  addressId:            uuid('address_id').notNull().references(() => addresses.id, { onDelete: 'restrict' }),
  legalEntityId:        uuid('legal_entity_id').notNull().references(() => legalEntities.id, { onDelete: 'restrict' }),
  paidFrom:             text('paid_from').notNull().default('prepaid'),
  startAt:              timestamp('start_at', { withTimezone: true }).notNull(),
  durationMin:          integer('duration_min').notNull(),
  status:               text('status').notNull().default('draft'),
  pricingSnapshotJson:  jsonb('pricing_snapshot_json').notNull().default(sql`'{}'::jsonb`),
  subtotalFils:         bigint('subtotal_fils',    { mode: 'number' }).notNull().default(0),
  materialsFils:        bigint('materials_fils',   { mode: 'number' }).notNull().default(0),
  surchargeFils:        bigint('surcharge_fils',   { mode: 'number' }).notNull().default(0),
  serviceFeeFils:       bigint('service_fee_fils', { mode: 'number' }).notNull().default(0),
  vatFils:              bigint('vat_fils',         { mode: 'number' }).notNull().default(0),
  totalFils:            bigint('total_fils',       { mode: 'number' }).notNull().default(0),
  currency:             char('currency', { length: 3 }).notNull().default('AED'),
  paymentMethodId:      uuid('payment_method_id').references(() => paymentMethods.id, { onDelete: 'set null' }),
  paymentIntentId:      text('payment_intent_id'),
  paidAt:               timestamp('paid_at', { withTimezone: true }),
  capturedAt:           timestamp('captured_at', { withTimezone: true }),
  specialInstructions:  text('special_instructions'),
  country:              char('country', { length: 2 }).notNull(),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({
  userStatusIdx: index().on(t.userId, t.status, t.startAt),
  statusIdx:     index().on(t.status, t.startAt),
  refIdx:        index().on(t.publicRef),
}));

export const bookingTiers = pgTable('booking_tiers', {
  id:              uuid('id').primaryKey().default(gen_uuid),
  bookingId:       uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  tierKey:         text('tier_key').notNull(),
  labelEn:         text('label_en').notNull(),
  labelAr:         text('label_ar').notNull(),
  qty:             integer('qty').notNull(),
  unitPriceFils:   bigint('unit_price_fils', { mode: 'number' }).notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({ bookingIdx: index().on(t.bookingId) }));

export const bookingAssignments = pgTable('booking_assignments', {
  id:               uuid('id').primaryKey().default(gen_uuid),
  bookingId:        uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  erpAssignmentRef: text('erp_assignment_ref'),
  proDisplayName:   text('pro_display_name'),
  proPhoneLast4:    char('pro_phone_last4', { length: 4 }),
  proRatingAvg:     numeric('pro_rating_avg', { precision: 3, scale: 2 }),
  status:           text('status').notNull().default('pending'),
  assignedAt:       timestamp('assigned_at',  { withTimezone: true }),
  departedAt:       timestamp('departed_at',  { withTimezone: true }),
  arrivedAt:        timestamp('arrived_at',   { withTimezone: true }),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at',   { withTimezone: true }).notNull().default(now),
  updatedAt:        timestamp('updated_at',   { withTimezone: true }).notNull().default(now),
}, (t) => ({ bookingIdx: index().on(t.bookingId) }));

export const bookingEvents = pgTable('booking_events', {
  id:        bigserial('id', { mode: 'number' }).primaryKey(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  kind:      text('kind').notNull(),
  actor:     text('actor').notNull(),
  dataJson:  jsonb('data_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({ bookingIdx: index().on(t.bookingId, t.createdAt) }));

export const invoices = pgTable('invoices', {
  id:              uuid('id').primaryKey().default(gen_uuid),
  bookingId:       uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'restrict' }),
  legalEntityId:   uuid('legal_entity_id').notNull().references(() => legalEntities.id, { onDelete: 'restrict' }),
  userId:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  seqScope:        text('seq_scope').notNull(),
  number:          integer('number').notNull(),
  issuedAt:        timestamp('issued_at', { withTimezone: true }).notNull().default(now),
  billToJson:      jsonb('bill_to_json').notNull(),
  subtotalFils:    bigint('subtotal_fils', { mode: 'number' }).notNull(),
  vatRateBp:       integer('vat_rate_bp').notNull().default(500),
  vatFils:         bigint('vat_fils',    { mode: 'number' }).notNull(),
  totalFils:       bigint('total_fils',  { mode: 'number' }).notNull(),
  currency:        char('currency', { length: 3 }).notNull(),
  pdfStoragePath:  text('pdf_storage_path'),
  status:          text('status').notNull().default('draft'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({
  numUniq:  unique().on(t.legalEntityId, t.seqScope, t.number),
  userIdx:  index().on(t.userId, t.issuedAt),
  bkIdx:    index().on(t.bookingId),
}));

export const invoiceLines = pgTable('invoice_lines', {
  id:            uuid('id').primaryKey().default(gen_uuid),
  invoiceId:     uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  descriptionEn: text('description_en').notNull(),
  descriptionAr: text('description_ar').notNull(),
  qty:           integer('qty').notNull(),
  unitPriceFils: bigint('unit_price_fils', { mode: 'number' }).notNull(),
  lineTotalFils: bigint('line_total_fils', { mode: 'number' }).notNull(),
  sortOrder:     integer('sort_order').notNull().default(0),
}, (t) => ({ invIdx: index().on(t.invoiceId) }));

export const creditNotes = pgTable('credit_notes', {
  id:              uuid('id').primaryKey().default(gen_uuid),
  invoiceId:       uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'restrict' }),
  legalEntityId:   uuid('legal_entity_id').notNull().references(() => legalEntities.id, { onDelete: 'restrict' }),
  seqScope:        text('seq_scope').notNull(),
  number:          integer('number').notNull(),
  issuedAt:        timestamp('issued_at', { withTimezone: true }).notNull().default(now),
  reason:          text('reason').notNull(),
  amountFils:      bigint('amount_fils', { mode: 'number' }).notNull(),
  currency:        char('currency', { length: 3 }).notNull(),
  pdfStoragePath:  text('pdf_storage_path'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({
  numUniq: unique().on(t.legalEntityId, t.seqScope, t.number),
  invIdx:  index().on(t.invoiceId),
}));

export const ratings = pgTable('ratings', {
  id:         uuid('id').primaryKey().default(gen_uuid),
  bookingId:  uuid('booking_id').notNull().unique().references(() => bookings.id, { onDelete: 'cascade' }),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stars:      smallint('stars').notNull(),
  comment:    text('comment'),
  tipFils:    bigint('tip_fils', { mode: 'number' }).notNull().default(0),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({ userIdx: index().on(t.userId) }));

export const issueReports = pgTable('issue_reports', {
  id:              uuid('id').primaryKey().default(gen_uuid),
  bookingId:       uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  userId:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:            text('type').notNull(),
  description:     text('description').notNull(),
  photosJson:      jsonb('photos_json').notNull().default(sql`'[]'::jsonb`),
  status:          text('status').notNull().default('open'),
  resolvedAt:      timestamp('resolved_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({
  statusIdx: index().on(t.status, t.createdAt),
  userIdx:   index().on(t.userId),
}));

export const quotes = pgTable('quotes', {
  id:                   uuid('id').primaryKey().default(gen_uuid),
  publicRef:            text('public_ref').notNull().unique().default(sql`upper(substr(gen_random_uuid()::text,1,6))`),
  userId:               uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceId:            uuid('service_id').notNull().references(() => services.id, { onDelete: 'restrict' }),
  addressId:            uuid('address_id').notNull().references(() => addresses.id, { onDelete: 'restrict' }),
  scopeNotes:           text('scope_notes').notNull(),
  photosJson:           jsonb('photos_json').notNull().default(sql`'[]'::jsonb`),
  adminQuotedFils:      bigint('admin_quoted_fils', { mode: 'number' }),
  currency:             char('currency', { length: 3 }).notNull().default('AED'),
  status:               text('status').notNull().default('requested'),
  quotedBy:             text('quoted_by'),
  quotedAt:             timestamp('quoted_at', { withTimezone: true }),
  expiresAt:            timestamp('expires_at', { withTimezone: true }),
  convertedBookingId:   uuid('converted_booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({
  userStatusIdx: index().on(t.userId, t.status),
  statusIdx:     index().on(t.status, t.createdAt),
}));

export const erpOutbox = pgTable('erp_outbox', {
  id:             uuid('id').primaryKey().default(gen_uuid),
  eventType:      text('event_type').notNull(),
  aggregateId:    uuid('aggregate_id').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  payloadJson:    jsonb('payload_json').notNull(),
  status:         text('status').notNull().default('pending'),
  attempts:       integer('attempts').notNull().default(0),
  nextAttemptAt:  timestamp('next_attempt_at', { withTimezone: true }).notNull().default(now),
  lastError:      text('last_error'),
  deliveredAt:    timestamp('delivered_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({
  pendingIdx: index().on(t.status, t.nextAttemptAt),
  aggIdx:     index().on(t.aggregateId),
}));

export const erpInbox = pgTable('erp_inbox', {
  id:              uuid('id').primaryKey().default(gen_uuid),
  callbackType:    text('callback_type').notNull(),
  idempotencyKey:  text('idempotency_key').notNull().unique(),
  payloadJson:     jsonb('payload_json').notNull(),
  receivedAt:      timestamp('received_at', { withTimezone: true }).notNull().default(now),
  processedAt:     timestamp('processed_at', { withTimezone: true }),
  processingError: text('processing_error'),
});

export const adminUsers = pgTable('admin_users', {
  id:           uuid('id').primaryKey().default(gen_uuid),
  email:        text('email').notNull().unique(),
  fullName:     text('full_name').notNull(),
  role:         text('role').notNull().default('support'),
  passwordHash: text('password_hash').notNull(),
  totpSecret:   text('totp_secret'),
  lastLoginAt:  timestamp('last_login_at', { withTimezone: true }),
  active:       boolean('active').notNull().default(true),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().default(now),
});

export const notificationsOutbox = pgTable('notifications_outbox', {
  id:          uuid('id').primaryKey().default(gen_uuid),
  userId:      uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  channel:     text('channel').notNull(),
  template:    text('template').notNull(),
  payloadJson: jsonb('payload_json').notNull(),
  status:      text('status').notNull().default('pending'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().default(now),
  sentAt:      timestamp('sent_at', { withTimezone: true }),
  error:       text('error'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().default(now),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().default(now),
}, (t) => ({ pendingIdx: index().on(t.status, t.scheduledAt) }));
