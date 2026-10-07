export default function DxViewport({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dx-viewport h-full min-h-0 w-full">{children}</div>;
}
