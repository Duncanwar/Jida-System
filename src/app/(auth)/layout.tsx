/**
 * Auth shell.
 *
 * Deliberately unstyled: every auth screen (login, register, verify-email,
 * check-email) paints its own full-bleed background. The previous
 * `bg-gray-100 dark:bg-gray-900` wrapper rendered near-black in dark mode and
 * fought the pages' own layouts, so it is gone rather than overridden.
 */
export default function AuthLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <div className="jida-auth-shell">{children}</div>;
}
