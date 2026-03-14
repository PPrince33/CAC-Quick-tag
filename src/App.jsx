import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import TournamentManager from './components/TournamentManager';
import TeamManager from './components/TeamManager';
import MatchCreator from './components/MatchCreator';
import MatchList from './components/MatchList';
import EventEditor from './components/EventEditor';
import TaggingPortal from './components/TaggingPortal';

// localStorage keys
const LS_ANALYST = 'cac_analyst_id';
const LS_ACTIVE_MATCH = 'cac_active_match_id';

export default function App() {
  // Restore analyst from localStorage
  const [analystId, setAnalystId] = useState(() => localStorage.getItem(LS_ANALYST) || null);
  const [activeTab, setActiveTab] = useState('tournaments');
  const [teams, setTeams] = useState([]);

  // Special views
  const [taggingMatch, setTaggingMatch] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);

  // Persist analyst to localStorage
  const handleLogin = (id) => {
    localStorage.setItem(LS_ANALYST, id);
    setAnalystId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem(LS_ANALYST);
    localStorage.removeItem(LS_ACTIVE_MATCH);
    setAnalystId(null);
    setTaggingMatch(null);
    setEditingMatch(null);
  };

  // Fetch teams for use in tagging/editing
  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*');
    setTeams(data || []);
  };

  useEffect(() => {
    if (analystId) fetchTeams();
  }, [analystId]);

  // On mount: check for active match to resume
  useEffect(() => {
    const checkResume = async () => {
      if (!analystId) {
        setResumeLoading(false);
        return;
      }

      const savedMatchId = localStorage.getItem(LS_ACTIVE_MATCH);
      if (!savedMatchId) {
        setResumeLoading(false);
        return;
      }

      // Fetch match from DB — only resume if still Live
      const { data: match } = await supabase
        .from('matches')
        .select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)')
        .eq('id', savedMatchId)
        .single();

      if (match && match.status === 'Live') {
        await fetchTeams();
        setTaggingMatch(match);
      } else {
        // Match is no longer live, clean up
        localStorage.removeItem(LS_ACTIVE_MATCH);
      }
      setResumeLoading(false);
    };

    checkResume();
  }, [analystId]);

  // Handle starting a match (go to tagging portal)
  const handleStartMatch = async (match) => {
    // Set match to Live
    await supabase.from('matches').update({ status: 'Live', start_time: new Date().toISOString() }).eq('id', match.id);
    await fetchTeams();
    const liveMatch = { ...match, status: 'Live' };
    localStorage.setItem(LS_ACTIVE_MATCH, match.id);
    setTaggingMatch(liveMatch);
  };

  // Handle resuming a live match from match list
  const handleResumeMatch = async (match) => {
    await fetchTeams();
    localStorage.setItem(LS_ACTIVE_MATCH, match.id);
    setTaggingMatch(match);
  };

  // Handle editing a match's events
  const handleEditMatch = async (match) => {
    await fetchTeams();
    setEditingMatch(match);
  };

  // If still checking for resume
  if (resumeLoading) {
    return (
      <div className="login-container">
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
          Loading session...
        </div>
      </div>
    );
  }

  // If in tagging mode, render full-screen tagging portal
  if (taggingMatch) {
    return (
      <TaggingPortal
        match={taggingMatch}
        teams={teams}
        onEnd={() => {
          localStorage.removeItem(LS_ACTIVE_MATCH);
          setTaggingMatch(null);
          setActiveTab('matches');
        }}
      />
    );
  }

  // If not logged in
  if (!analystId) {
    return <Login onLogin={handleLogin} />;
  }

  // If editing match events
  if (editingMatch) {
    return (
      <div className="app-shell">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => { setEditingMatch(null); setActiveTab(tab); }}
          analystId={analystId}
          onLogout={handleLogout}
        />
        <div className="main-content">
          <EventEditor
            match={editingMatch}
            teams={teams}
            onBack={() => setEditingMatch(null)}
          />
        </div>
      </div>
    );
  }

  // Admin panel with sidebar + content
  const renderContent = () => {
    switch (activeTab) {
      case 'tournaments':
        return <TournamentManager />;
      case 'teams':
        return <TeamManager />;
      case 'create-match':
        return <MatchCreator />;
      case 'matches':
        return (
          <MatchList
            onStartMatch={handleStartMatch}
            onEditMatch={handleEditMatch}
            onResumeMatch={handleResumeMatch}
          />
        );
      default:
        return <TournamentManager />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        analystId={analystId}
        onLogout={handleLogout}
      />
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
}
