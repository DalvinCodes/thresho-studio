import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex h-screen bg-bg overflow-hidden text-text font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
