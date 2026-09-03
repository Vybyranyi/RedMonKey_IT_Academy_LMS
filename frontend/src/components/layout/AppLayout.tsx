import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="flex bg-[#F8F9FA] min-h-screen font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto">
            <Header />
            <main className="px-8 pb-10">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}