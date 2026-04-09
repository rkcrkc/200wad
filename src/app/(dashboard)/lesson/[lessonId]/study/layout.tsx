export default function StudyLayout({ children }: { children: React.ReactNode }) {
  // Study mode has its own sidebar (CourseSidebar) rendered by the page
  // This layout just provides the background container
  return (
    <div className="min-h-screen bg-bone">
      {children}
    </div>
  );
}
