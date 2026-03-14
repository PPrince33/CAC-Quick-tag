import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Play, Edit3, Eye, List, Trash2, RotateCcw, CheckSquare, Square, Lock } from 'lucide-react';

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

  const fetchData = async () => {
    const { data: m } = await supabase.from('matches')
      .select('*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*), tournaments(*)')
      .order('start_time', { ascending: false });
    setMatches(m || []);
    setLoading(false);
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

    // Verify password against analysts table
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

    // Password verified — delete selected matches and their events
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
