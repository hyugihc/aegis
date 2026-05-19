export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`glass-panel rounded-lg ${className}`}>{children}</section>;
}
