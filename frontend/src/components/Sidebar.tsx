import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../assets/logo-paperchase.png';
import { X, Menu, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

type SidebarProps = {
    onLinkClick?: () => void;
};

const Sidebar = ({ onLinkClick }: SidebarProps) => {
    const { pathname } = useLocation();
    const [open, setOpen] = useState(true);

    const navItems = [
        { name: 'Chat Interface', path: '/' },
        { name: 'Upload Data', path: '/upload' },
        { name: 'Database Connection', path: '/DatabaseForm' },
        { name: 'Description Generator', path: '/TableDescription' },
        { name: 'Schema Retriever', path: '/RetrieveSchema' },
        { name: 'Query Executor', path: '/SqlQueryExecutor' },
    ];

    // Hamburger button (shown when sidebar is closed)
    if (!open) {
        return (
            <button
                className="fixed top-4 left-2 z-50"
                onClick={() => setOpen(true)}
                aria-label="Open sidebar"
            >
                <PanelLeftOpen className="text-[#163E5D] w-8 h-8 hover:text-[#2F82C3] transition-colors" />
            </button>
        );
    }

    return (
        <aside
            className={`
            w-64 min-w-64 max-w-64 h-full z-40
            bg-gradient-to-b from-[#F5F7FA] to-[#E4E9F2]
            border-r border-[#163E5D]/20
            flex flex-col shadow-xl
            fixed md:relative
            transition-transform duration-300
            `}
        >
            {/* Close (X) button */}
            <button
                className="absolute top-4 right-4 z-50"
                onClick={() => setOpen(false)}
                aria-label="Close sidebar"
                >
                <PanelLeftClose className="w-8 h-8 text-[#163E5D] hover:text-[#2F82C3] transition-colors" />
            </button>
            <Link to='/' className="flex items-center ml-5 bg-[#F5F7FA] py-4">
            <img 
                src={Logo} 
                alt="Logo" 
                width={150} 
                height={106} 
                className="hover:scale-105 transition-transform duration-200" 
            />
            </Link>
            <nav className="flex-1 px-2 py-6">
            <ul className="space-y-2">
                {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                    <li key={item.path}>
                    <Link
                        to={item.path}
                        onClick={onLinkClick}
                        className={`
                        flex items-center px-4 py-3 rounded-lg font-semibold transition-all
                        ${isActive
                            ? "bg-gradient-to-r from-[#BF2A2D] to-[#BF2A2D] text-white shadow-md"
                            : "text-[#163E5D] hover:bg-gradient-to-r hover:from-[#2F82C3]/10 hover:to-[#163E5D]/10 hover:text-[#BF2A2D]"
                        }
                        `}
                    >
                        {item.name}
                    </Link>
                    </li>
                );
                })}
            </ul>
            </nav>
            <div className="px-4 py-6 text-xs text-[#2F82C3] opacity-70 text-center">
            &copy; {new Date().getFullYear()} Paperchase Multi-Agent Platform
            </div>
        </aside>
    );
};

export default Sidebar;
