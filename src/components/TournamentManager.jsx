import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Eye, EyeOff, Trophy } from 'lucide-react';

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTournaments = async () => {
    const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    setTournaments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTournaments(); }, []);

  const createTournament = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from('tournaments').insert([{ name: name.trim() }]);
    if (!error) {
      setName('');
      fetchTournaments();
    }
  };

  const toggleVisibility = async (id, current) => {
    await supabase.from('tournaments').update({ Is_visible: !current }).eq('id', id);
    fetchTournaments();
  };

  const deleteTournament = async (id) => {
    if (!window.confirm('Delete this tournament? This cannot be undone.')) return;
    await supabase.from('tournaments').delete().eq('id', id);
    fetchTournaments();
  };

  return (
    <div>
      <div className="page-header">
        <h2>Tournaments</h2>
        <p>Create and manage your tournaments</p>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h3>Create Tournament</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            className="form-input"
            placeholder="Tournament name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTournament()}
          />
          <button className="btn btn-primary" onClick={createTournament} style={{ whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Create
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>All Tournaments</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tournaments.length} total</span>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : tournaments.length === 0 ? (
          <div className="empty-state">
            <Trophy />
            <h4>No tournaments yet</h4>
            <p>Create your first tournament above</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
                <th>Visibility</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${t.Is_visible ? 'btn-success' : 'btn-ghost'}`}
                      onClick={() => toggleVisibility(t.id, t.Is_visible)}
                    >
                      {t.Is_visible ? <><Eye size={14} /> Visible</> : <><EyeOff size={14} /> Hidden</>}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteTournament(t.id)}>
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
