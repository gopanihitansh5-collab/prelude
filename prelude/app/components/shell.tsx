import Link from 'next/link'

/**
 * The dashboard shell.
 *
 * Every companion page shares this chrome so the nav never drifts between
 * routes. It is deliberately plain: the dashboard is where you configure and
 * verify, not where you perform. The lens is the performance surface.
 */
export function Shell({
  title,
  subtitle,
  active,
  children,
}: {
  title: string
  subtitle?: string
  active: 'overview' | 'connections' | 'memory' | 'followups' | 'actions' | 'settings'
  children: React.ReactNode
}) {
  const links: { href: string; label: string; key: typeof active }[] = [
    { href: '/dashboard', label: 'Overview', key: 'overview' },
    { href: '/connections', label: 'Connections', key: 'connections' },
    { href: '/memory', label: 'Memory', key: 'memory' },
    { href: '/followups', label: 'Follow-ups', key: 'followups' },
    { href: '/actions', label: 'Actions', key: 'actions' },
    { href: '/settings', label: 'Settings', key: 'settings' },
  ]

  return (
    <main className="shell">
      <div className="topbar">
        <h1 className="brand">
          Prelude <span>{title}</span>
        </h1>
        <nav className="nav">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              style={link.key === active ? { color: 'var(--green)' } : undefined}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/lens">Lens</Link>
        </nav>
      </div>

      {subtitle ? <p className="lede">{subtitle}</p> : null}

      {children}
    </main>
  )
}
