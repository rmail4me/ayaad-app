// Check status of a Resend domain. Shows verification + each DNS record's state.
// Usage: node scripts/check-resend-domain.js [ayaad.ae]

const { config } = require('dotenv');
config({ path: '.env.local' });

const DOMAIN = (process.argv[2] || 'ayaad.ae').trim().toLowerCase();
const KEY = process.env.RESEND_API_KEY;
if (!KEY) { console.error('RESEND_API_KEY missing'); process.exit(2); }

(async () => {
  const list = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${KEY}` },
  }).then(r => r.json());

  const d = (list.data ?? list).find?.((x) => (x.name || '').toLowerCase() === DOMAIN);
  if (!d) { console.error(`domain ${DOMAIN} not found on this Resend account`); process.exit(1); }

  const detail = await fetch(`https://api.resend.com/domains/${d.id}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  }).then(r => r.json());

  console.log(`\n== Domain: ${detail.name} ==`);
  console.log(`id:        ${detail.id}`);
  console.log(`status:    ${detail.status}`);
  console.log(`region:    ${detail.region}`);
  console.log(`created:   ${detail.created_at}`);

  const records = detail.records || detail.dns_records || [];
  console.log(`\nDNS records (${records.length}):`);
  records.forEach((r, i) => {
    console.log(`  [${i + 1}] type=${r.record || r.type}  status=${r.status}`);
    console.log(`      name:  ${r.name}`);
    console.log(`      value: ${r.value}`);
    if (r.priority !== undefined) console.log(`      priority: ${r.priority}`);
  });

  if (detail.status === 'verified') {
    console.log(`\n✅ ${DOMAIN} is VERIFIED. Switch RESEND_FROM to "Ayaad <noreply@${DOMAIN}>" and redeploy.`);
  } else {
    console.log(`\n⏳ Still ${detail.status}. Confirm each DNS record above matches what HostGator shows for ${DOMAIN}.`);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
