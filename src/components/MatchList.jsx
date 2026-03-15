import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Play, Edit3, Eye, List, Trash2, RotateCcw, CheckSquare, Square, Lock, Save, X, Users } from 'lucide-react';

export default function MatchList({ onStartMatch, onEditMatch, onResumeMatch }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Score & Notes edit modal
  const [editMatch, setEditMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({ team_a_score: '', team_b_score: '', notes: '' });
  const [saving, setSaving] = useState(false);
  
  // Lineup management
  const [lineupMatch, setLineupMatch] = useState(null);
  const [lineupText, setLineupText] = useState('');
  const [importingLineup, setImportingLineup] = useState(false);
  const [lineupCounts, setLineupCounts] = useState({});

  const fetchData = async () => {
    const { data: m } = await supabase.from('matches')
      .select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*), tournaments(*)')
      .order('start_time', { ascending: false });
    setMatches(m || []);
    setLoading(false);

    // Fetch lineup counts
    const { data: lu } = await supabase.from('lineups').select('match_id, team_id');
    const counts = {};
    lu?.forEach(l => {
        const key = `${l.match_id}-${l.team_id}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    setLineupCounts(counts);
  };

  useEffect(() => { fetchData(); }, []);

  const publishMatch = async (id) => {
    await supabase.from('matches').update({ status: 'Published' }).eq('id', id);
    fetchData();
  };

  const getBadgeClass = (status) => {
    switch (status) {
      case 'Live': return 'badge badge-live';
      case 'Finished': return 'badge badge-finished';
      case 'Published': return 'badge badge-published';
      default: return 'badge badge-draft';
    }
  };

  // Selection handlers
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === matches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(matches.map(m => m.id)));
    }
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelected(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  // Delete flow
  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setDeleteError('');
    setDeleting(true);

    const analystId = localStorage.getItem('cac_analyst_id');
    const { data, error } = await supabase
      .from('analysts')
      .select('analyst_id')
      .eq('analyst_id', analystId)
      .eq('password', deletePassword)
      .single();

    if (error || !data) {
      setDeleteError('Incorrect password');
      setDeleting(false);
      return;
    }

    const ids = Array.from(selected);
    for (const id of ids) {
      await supabase.from('events').delete().eq('match_id', id);
      await supabase.from('matches').delete().eq('id', id);
    }

    setDeleting(false);
    setShowDeleteModal(false);
    setSelectMode(false);
    setSelected(new Set());
    fetchData();
  };

  // Score & Notes handlers
  const openScoreEdit = (m) => {
    setEditMatch(m);
    setScoreForm({
      team_a_score: m.team_a_score ?? '',
      team_b_score: m.team_b_score ?? '',
      notes: m.notes || '',
    });
  };

  const saveScore = async () => {
    setSaving(true);
    await supabase.from('matches').update({
      team_a_score: scoreForm.team_a_score !== '' ? parseInt(scoreForm.team_a_score) : null,
      team_b_score: scoreForm.team_b_score !== '' ? parseInt(scoreForm.team_b_score) : null,
      notes: scoreForm.notes || null,
    }).eq('id', editMatch.id);
    setSaving(false);
    setEditMatch(null);
    fetchData();
  };

  const openLineupEdit = (m) => {
    setLineupMatch(m);
    setLineupText('');
  };

  const saveLineup = async () => {
    if (!lineupText.trim()) return;
    setImportingLineup(true);

    const lines = lineupText.split('\n').filter(l => l.trim());
    const newRecords = [];

    for (const line of lines) {
        // Try to parse: Team [Tab/Space] Name [Tab/Space] Number
        const parts = line.split(/[\t]+| {2,}/).map(p => p.trim());
        if (parts.length < 2) continue;

        let [teamLabel, name, number] = parts;
        // If only 2 parts, maybe team and name, or name and number?
        // Let's assume the user follows the format: Team | Name | Number
        
        let teamId = null;
        const lowTeam = teamLabel.toLowerCase();
        if (lowTeam.includes('home') || lowTeam.includes(lineupMatch.team_a?.name.toLowerCase())) {
            teamId = lineupMatch.team_a_id;
        } else if (lowTeam.includes('away') || lowTeam.includes(lineupMatch.team_b?.name.toLowerCase())) {
            teamId = lineupMatch.team_b_id;
        }

        if (teamId) {
            newRecords.push({
                match_id: lineupMatch.id,
                team_id: teamId,
                player_name: name,
                jersey_number: number || null,
                is_starting: true
            });
        }
    }

    if (newRecords.length > 0) {
        // Delete existing lineup for this match? 
        // The user said "add lineup data", usually implies replacement or append.
        // Let's replace for the teams identified in the paste.
        const teamIds = [...new Set(newRecords.map(r => r.team_id))];
        for (const tid of teamIds) {
            await supabase.from('lineups').delete().eq('match_id', lineupMatch.id).eq('team_id', tid);
        }
        await supabase.from('lineups').insert(newRecords);
    }

    setImportingLineup(false);
    setLineupMatch(null);
    fetchData();
  };

  const allSelected = matches.length > 0 && selected.size === matches.length;

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h2>Match List</h2>
            <p>View, start, edit, or publish matches</p>
          </div>
          <div className="flex-gap">
            {selectMode ? (
              <>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                  {selected.size} selected
                </span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={handleDeleteSelected}
                  disabled={selected.size === 0}
                >
                  <Trash2 size={14} /> Delete ({selected.size})
                </button>
                <button className="btn btn-sm btn-ghost" onClick={exitSelectMode}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="btn btn-sm btn-ghost" onClick={enterSelectMode}>
                <CheckSquare size={14} /> Select
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '420px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={20} /> Confirm Deletion
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
              You are about to permanently delete <strong>{selected.size} match{selected.size > 1 ? 'es' : ''}</strong> and all associated events.
            </p>
            <p style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 600, marginBottom: '20px' }}>
              ⚠ This action cannot be undone.
            </p>
            <div className="form-group">
              <label className="form-label">Enter your password to confirm</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
                autoFocus
              />
              {deleteError && (
                <div style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                  {deleteError}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={!deletePassword || deleting}
                style={{ background: 'var(--danger)', color: 'white', border: 'none' }}
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting...' : `Delete ${selected.size} Match${selected.size > 1 ? 'es' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score & Notes Modal */}
      {editMatch && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: 0 }}>Match Score & Notes</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditMatch(null)}><X size={14} /></button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                {/* Team A */}
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', margin: '0 auto 6px',
                    background: `var(--jersey-${editMatch.home_jersey_color || 'red'})`,
                    border: '1px solid var(--border)'
                  }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {editMatch.team_a?.name}
                  </div>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={scoreForm.team_a_score}
                    onChange={e => setScoreForm(p => ({ ...p, team_a_score: e.target.value }))}
                    style={{
                      width: '80px', textAlign: 'center', fontSize: '28px', fontWeight: 900,
                      fontFamily: 'var(--font-mono)', padding: '12px', margin: '0 auto',
                    }}
                  />
                </div>

                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-muted)', paddingTop: '28px' }}>—</div>

                {/* Team B */}
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', margin: '0 auto 6px',
                    background: `var(--jersey-${editMatch.away_jersey_color || 'blue'})`,
                    border: '1px solid var(--border)'
                  }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {editMatch.team_b?.name}
                  </div>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={scoreForm.team_b_score}
                    onChange={e => setScoreForm(p => ({ ...p, team_b_score: e.target.value }))}
                    style={{
                      width: '80px', textAlign: 'center', fontSize: '28px', fontWeight: 900,
                      fontFamily: 'var(--font-mono)', padding: '12px', margin: '0 auto',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Match Notes</label>
              <textarea
                className="form-input"
                placeholder="e.g. Great performance from both sides, 2 penalties..."
                value={scoreForm.notes}
                onChange={e => setScoreForm(p => ({ ...p, notes: e.target.value }))}
                style={{ minHeight: '100px' }}
              />
            </div>

            <button className="btn btn-primary btn-block mt-4" onClick={saveScore} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Score & Notes'}
            </button>
          </div>
        </div>
      )}

      {/* Lineup Import Modal */}
      {lineupMatch && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: 0 }}>Import Lineup Data</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setLineupMatch(null)}><X size={14} /></button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Paste your lineup table below. Format: <strong>Team [Tab] Name [Tab] Number</strong>.<br/>
              Use "Home" or "{lineupMatch.team_a?.name}" for Team A, "Away" or "{lineupMatch.team_b?.name}" for Team B.
            </p>

            <div className="form-group">
              <textarea
                className="form-input"
                placeholder={`Home  John Doe  10\nHome  Jane Smith  7\nAway  Bob Brown  1`}
                value={lineupText}
                onChange={e => setLineupText(e.target.value)}
                style={{ minHeight: '240px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-ghost flex-1" onClick={() => setLineupMatch(null)}>Cancel</button>
              <button className="btn btn-primary flex-1" onClick={saveLineup} disabled={importingLineup || !lineupText.trim()}>
                <Save size={16} /> {importingLineup ? 'Importing...' : 'Import Lineup'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading matches...</p></div>
        ) : matches.length === 0 ? (
          <div className="empty-state">
            <List />
            <h4>No matches yet</h4>
            <p>Create a match first</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {selectMode && (
                  <th style={{ width: '40px' }}>
                    <button
                      onClick={toggleSelectAll}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    >
                      {allSelected
                        ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
                        : <Square size={16} style={{ color: 'var(--text-muted)' }} />
                      }
                    </button>
                  </th>
                )}
                <th>Match</th>
                <th>Score</th>
                <th>Tournament</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map(m => (
                <tr key={m.id} style={selected.has(m.id) ? { background: 'rgba(239, 68, 68, 0.06)' } : {}}>
                  {selectMode && (
                    <td>
                      <button
                        onClick={() => toggleSelect(m.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                      >
                        {selected.has(m.id)
                          ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
                          : <Square size={16} style={{ color: 'var(--text-muted)' }} />
                        }
                      </button>
                    </td>
                  )}
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: `var(--jersey-${m.home_jersey_color || 'red'})`,
                        display: 'inline-block', border: '1px solid var(--border)'
                      }} />
                      {m.team_a?.name || '?'}
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>vs</span>
                      {m.team_b?.name || '?'}
                      <span style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: `var(--jersey-${m.away_jersey_color || 'blue'})`,
                        display: 'inline-block', border: '1px solid var(--border)'
                      }} />
                    </div>
                    {m.details && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.details}</div>}
                    {m.notes && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>📝 {m.notes}</div>}
                  </td>
                  <td>
                    {(m.team_a_score !== null && m.team_b_score !== null) ? (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '16px',
                        color: 'var(--text-primary)', letterSpacing: '1px',
                      }}>
                        {m.team_a_score} — {m.team_b_score}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                    )}
                  </td>
                  <td>{m.tournaments?.name || '—'}</td>
                  <td>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {m.is_futsal ? 'FUTSAL' : 'FOOTBALL'}
                    </span>
                  </td>
                  <td><span className={getBadgeClass(m.status)}>{m.status || 'Draft'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    {!selectMode && (
                      <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                        {(m.status === 'Draft' || !m.status) && (
                          <button className="btn btn-sm btn-primary" onClick={() => onStartMatch(m)}>
                            <Play size={14} /> Start
                          </button>
                        )}
                        {m.status === 'Live' && (
                          <button className="btn btn-sm btn-primary" onClick={() => onResumeMatch(m)}>
                            <RotateCcw size={14} /> Resume
                          </button>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => openScoreEdit(m)} title="Score & Notes">
                          🏆
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => openLineupEdit(m)} title="Manage Lineup" style={{ color: (lineupCounts[`${m.id}-${m.team_a_id}`] || lineupCounts[`${m.id}-${m.team_b_id}`]) ? 'var(--success)' : 'var(--text-muted)' }}>
                          <Users size={14} />
                          { (lineupCounts[`${m.id}-${m.team_a_id}`] || 0) + (lineupCounts[`${m.id}-${m.team_b_id}`] || 0) > 0 && 
                            <span style={{ fontSize: '10px', marginLeft: '4px' }}>{(lineupCounts[`${m.id}-${m.team_a_id}`] || 0) + (lineupCounts[`${m.id}-${m.team_b_id}`] || 0)}</span>
                          }
                        </button>
                        {(m.status === 'Live' || m.status === 'Finished' || m.status === 'Published') && (
                          <button className="btn btn-sm btn-ghost" onClick={() => onEditMatch(m)}>
                            <Edit3 size={14} /> Edit
                          </button>
                        )}
                        {m.status === 'Finished' && (
                          <button className="btn btn-sm btn-success" onClick={() => publishMatch(m.id)}>
                            <Eye size={14} /> Publish
                          </button>
                        )}
                      </div>
                    )}
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
