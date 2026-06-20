"use client";

import { useState } from "react";
import Link from "next/link";

interface UserMenuProps {
  userName: string;
  onLogout: () => void;
}

export function UserMenu({ userName, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-50">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border border-white/10 rounded-full text-white font-sans text-[16px] hover:border-teal-400/50 transition-all duration-300 focus:outline-none"
      >
        <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-black font-bold text-xs shadow-[0_0_10px_rgba(20,184,166,0.3)]">
          {userName.charAt(0).toUpperCase()}
        </div>
        <span>{userName}</span>
        <svg
          className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
          <Link 
            href="/profile" 
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
          >
            Profile
          </Link>
          
          <div className="h-px bg-white/10 my-1"></div>
          
          <button 
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}