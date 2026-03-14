import React from 'react';
import { Trophy, Users, Swords, List, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'tournaments', label: 'Tournaments', icon: Trophy },
  { key: 'teams', label: 'Teams', icon: Users },
  { key: 'create-match', label: 'Create Match', icon: Swords },
  { key: 'matches', label: 'Match List', icon: List },
];

export default function Sidebar({ activeTab, onTabChange, analystId, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h1>CAC <span>TAG</span></h1>
        <div className="subtitle">Analyst Console</div>
      </div>

      <div className="nav-section">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => onTabChange(item.key)}
          >
            <item.icon />
            {item.label}
          </button>
        ))}
      </div>

      <div className="nav-footer">
        <div className="analyst-info">
          Logged in as <span className="analyst-name">{analystId}</span>
        </div>
        <button className="nav-item" onClick={onLogout} style={{ color: 'var(--danger)' }}>
          <LogOut />
          Logout
        </button>
      </div>
    </div>
  );
}
