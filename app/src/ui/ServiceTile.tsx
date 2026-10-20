import Link from 'next/link';
import clsx from 'clsx';
import {
  AirVent, Wind, Sparkles, Sofa, Bug, Wrench, Paintbrush, Droplets, type LucideIcon,
} from 'lucide-react';
import type { Service, ServiceCategory } from '@/lib/types';

const ICONS: Record<ServiceCategory, LucideIcon> = {
  ac: AirVent,
  duct: Wind,
  deep: Sparkles,
  furniture: Sofa,
  pest: Bug,
  handyman: Wrench,
  painting: Paintbrush,
  water_tank: Droplets,
};

export function ServiceTile({ service, className }: { service: Service; className?: string }) {
  const Icon = ICONS[service.category];
  return (
    <Link
      href={`/services/${service.slug}` as any}
      className={clsx(
        'group block rounded-lg bg-surface-raised shadow-card p-4 min-h-[128px]',
        'hover:shadow-pop transition-shadow duration-fast focus:outline-none focus-visible:shadow-focus',
        className,
      )}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-md bg-accent-subtle text-accent mb-3">
        <Icon className="w-6 h-6" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-text leading-tight">{service.name_en}</h3>
      <p className="text-xs text-text-muted mt-1 line-clamp-2">
        {service.inclusions_en.slice(0, 2).join(' · ')}
      </p>
    </Link>
  );
}
