
import './App.css'
import { Routes, Route } from "react-router";
import UploadFile from './pages/UploadFIle';
import DatabaseForm from './pages/DatabaseForm';
import Chat from './pages/Chat'
import Sidebar from './components/Sidebar';
import TableDescription from './pages/TableDescription';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import RetrieveSchema from './pages/RetrieveSchema';
import SqlQueryExecutor from './pages/SqlQueryExecutor';



function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <>

      <div className="flex h-screen overflow-hidden">
        {isSidebarOpen && (
          <Sidebar onLinkClick={() => {
            if (window.innerWidth <= 768) {
              setIsSidebarOpen(false);
            }
          }} />
        )}
        <div className="flex-1 relative overflow-y-auto"
          style={{
            width: isSidebarOpen ? 'calc(100% - 16rem)' : '100%',
            // marginLeft: isSidebarOpen ? '16rem' : '0', // optional, if you don’t use flex
          }}
        >
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`
    absolute top-4 p-2 rounded transition-all duration-300 z-50
    ${isSidebarOpen
                ? ' left-50 md:left-[-50px] z-30 hover:text-[#163E5D] text-[#2F82C3]'
                : 'left-4 hover:text-[#2F82C3] text-[#163E5D]'
              }
  `}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Routes>
            <Route path="/" element={<Chat isSidebarOpen={isSidebarOpen} />} />
            <Route path="/upload" element={<UploadFile isSidebarOpen={isSidebarOpen} />} />
            <Route path="/databaseForm" element={<DatabaseForm />} />
            <Route path="/chat" element={<Chat isSidebarOpen={isSidebarOpen} />} />
            <Route path="/tableDescription" element={<TableDescription />} />
            <Route path="/retrieveschema" element={<RetrieveSchema onSelect={function (db: string, table: string): void {
              throw new Error('Function not implemented.');
            } } />} />
            <Route path="/SqlQueryExecutor" element={<SqlQueryExecutor />} />
          </Routes>
        </div>
      </div>

    </>
  )
}

export default App
