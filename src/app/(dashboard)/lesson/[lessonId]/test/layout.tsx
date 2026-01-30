export default function TestLayout({ children }: { children: React.ReactNode }) {
  // Test mode has its own sidebar and navbar rendered by the page
  // This layout just provides the background container
  return (
    <div className="min-h-screen bg-[#FAF8F3]">
      {children}
    </div>
  );
}
