// S03 — Home / service grid
import { ServiceTile } from '@/ui/ServiceTile';
import { listServices } from '@/lib/data';

export default async function HomePage() {
  const services = await listServices();
  return (
    <section>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text leading-tight">
          Home services, done right.
        </h1>
        <p className="mt-2 text-text-muted max-w-prose">
          Pick a service, pick a time, and we take care of the rest. Transparent prices, trained teams, no surprises.
        </p>
      </div>

      <h2 className="sr-only">All services</h2>
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {services.map(s => (
          <li key={s.id}><ServiceTile service={s} /></li>
        ))}
      </ul>
    </section>
  );
}
