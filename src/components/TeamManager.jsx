import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Users } from 'lucide-react';

export default function TeamManager() {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [teamName, setTeamName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: tourns } = await supabase.from('tournaments').select('*').order('name');
    const { data: tms } = await supabase.from('teams').select('*, tournaments(name)').order('name');
    setTournaments(tourns || []);
    setTeams(tms || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const createTeam = async () => {
    if (!teamName.trim() || !selectedTournament) return;
    const payload = {
      name: teamName.trim(),
      tournament_id: selectedTournament,
    };
    if (logoUrl.trim()) payload.Logo = logoUrl.trim();

    const { error } = await supabase.from('teams').insert([payload]);
    if (!error) {
      setTeamName('');
      setLogoUrl('');
      fetchData();
    }
  };

  const deleteTeam = async (id) => {
    if (!window.confirm('Delete this team?')) return;
    await supabase.from('teams').delete().eq('id', id);
    fetchData();
  };

  const filteredTeams = selectedTournament
    ? teams.filter(t => t.tournament_id === selectedTournament)
    : teams;

  return (
    <div>
      <div className="page-header">
        <h2>Teams</h2>
        <p>Manage teams across your tournaments</p>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h3>Add Team</h3>
        </div>
        <div className="form-group">
          <label className="form-label">Tournament</label>
          <select
            className="form-select"
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
          >
            <option value="">— Select Tournament —</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Team Name</label>
            <input
              className="form-input"
              placeholder="e.g. FC Barcelona"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Logo URL (optional)</label>
            <input
              className="form-input"
              placeholder="https://..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
        </div>
        <button
          className="btn btn-primary mt-4"
          onClick={createTeam}
          disabled={!teamName.trim() || !selectedTournament}
        >
          <Plus size={16} /> Add Team
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>All Teams</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredTeams.length} shown</span>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : filteredTeams.length === 0 ? (
          <div className="empty-state">
            <Users />
            <h4>No teams found</h4>
            <p>{selectedTournament ? 'No teams in this tournament yet' : 'Select a tournament or create teams'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Tournament</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {t.Logo && <img src={t.Logo} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />}
                      {t.name}
                    </div>
                  </td>
                  <td>{t.tournaments?.name || '—'}</td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteTeam(t.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
