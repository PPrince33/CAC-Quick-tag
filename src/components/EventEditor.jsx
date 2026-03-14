import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Trash2, Save, Edit3, Plus } from 'lucide-react';

const ACTIONS = ['Pass', 'Pass Received', 'Shot', 'Tackle', 'Carry', 'Dribble', 'Own Goal'];
const HALVES = ['1st', '2nd', '1st Extra', '2nd Extra', 'Penalty Shootout'];
const TYPES = ['Normal', 'Goalkick', 'Goalkeeper Throw', 'Corner', 'Free Kick', 'Throw-in', 'Penalty'];
const OUTCOMES = {
  'Pass': ['Successful', 'Miss', 'Interception', 'Assist'],
  'Pass Received': ['Successful', 'Lost Control'],
  'Shot': ['Save', 'Block', 'Off-Target', 'SoT Save', 'SoT Block', 'Goal'],
  'Tackle': ['Foul', 'Yellow', 'Red', 'Successful'],
  'Dribble': ['Successful', 'Unsuccessful'],
  'Carry': ['Successful'],
  'Own Goal': ['Deflected', 'Clearance'],
};

const inputStyle = { padding: '6px 10px', fontSize: '12px' };

export default function EventEditor({ match, teams, onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Add new event state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    team_id: match.team_a_id,
    half: '1st',
    action: 'Pass',
    type: 'Normal',
    outcome: 'Successful',
    location_box: '',
    timestamp: '',
    direction_of_attack: 'L2R',
    player_name: '',
    jersey_number: '',
  });

  const teamA = teams.find(t => t.id === match.team_a_id);
  const teamB = teams.find(t => t.id === match.team_b_id);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('match_id', match.id)
      .order('timestamp', { ascending: true });
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const getTeamName = (teamId) => {
    if (teamId === match.team_a_id) return teamA?.name || 'Team A';
    if (teamId === match.team_b_id) return teamB?.name || 'Team B';
    return '—';
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setEditForm({
      action: ev.action || '',
      type: ev.type || '',
      outcome: ev.outcome || '',
      half: ev.half || '',
      location_box: ev.location_box || '',
      player_name: ev.player_name || '',
      jersey_number: ev.jersey_number || '',
    });
  };

  const saveEdit = async () => {
    const updates = { ...editForm };
    if (updates.location_box) updates.location_box = parseInt(updates.location_box);
    await supabase.from('events').update(updates).eq('id', editingId);
    setEditingId(null);
    fetchEvents();
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await supabase.from('events').delete().eq('id', id);
    fetchEvents();
  };

  const addNewEvent = async () => {
    const ts = newEvent.timestamp ? parseInt(newEvent.timestamp) : 0;
    const payload = {
      match_id: match.id,
      team_id: newEvent.team_id,
      half: newEvent.half,
      action: newEvent.action,
      type: newEvent.type || null,
      outcome: newEvent.outcome,
      location_box: newEvent.location_box ? parseInt(newEvent.location_box) : null,
      timestamp: ts,
      match_minute: Math.floor(ts / 60),
      direction_of_attack: newEvent.direction_of_attack,
      player_name: newEvent.player_name || null,
      jersey_number: newEvent.jersey_number || null,
    };

    const { error } = await supabase.from('events').insert([payload]);
    if (!error) {
      setShowAddForm(false);
      setNewEvent(prev => ({ ...prev, location_box: '', timestamp: '', player_name: '', jersey_number: '' }));
      fetchEvents();
    }
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '—';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const outcomeOptions = OUTCOMES[newEvent.action] || [];

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-ghost btn-sm" onClick={onBack}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h2>{teamA?.name} vs {teamB?.name}</h2>
              <p>Edit match events • {events.length} events logged</p>
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={14} /> Add Event
          </button>
        </div>
      </div>

      {/* Add New Event Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: '16px', borderColor: 'var(--accent)', borderWidth: '1px' }}>
          <div className="card-header">
            <h3>Add New Event</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowAddForm(false)}>✕</button>
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            {/* Team */}
            <div className="form-group">
              <label className="form-label">Team</label>
              <select className="form-select" value={newEvent.team_id} onChange={e => setNewEvent(p => ({ ...p, team_id: e.target.value }))}>
                <option value={match.team_a_id}>{teamA?.name}</option>
                <option value={match.team_b_id}>{teamB?.name}</option>
              </select>
            </div>

            {/* Half */}
            <div className="form-group">
              <label className="form-label">Half</label>
              <select className="form-select" value={newEvent.half} onChange={e => setNewEvent(p => ({ ...p, half: e.target.value }))}>
                {HALVES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            {/* Action */}
            <div className="form-group">
              <label className="form-label">Action</label>
              <select className="form-select" value={newEvent.action} onChange={e => {
                const action = e.target.value;
                const outcomes = OUTCOMES[action] || [];
                setNewEvent(p => ({ ...p, action, outcome: outcomes[0] || '' }));
              }}>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Type */}
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={newEvent.type} onChange={e => setNewEvent(p => ({ ...p, type: e.target.value }))}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Outcome */}
            <div className="form-group">
              <label className="form-label">Outcome</label>
              <select className="form-select" value={newEvent.outcome} onChange={e => setNewEvent(p => ({ ...p, outcome: e.target.value }))}>
                {outcomeOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Location Box */}
            <div className="form-group">
              <label className="form-label">Zone (Box #)</label>
              <input className="form-input" type="number" placeholder={match.is_futsal ? '1-32' : '1-96'} value={newEvent.location_box} onChange={e => setNewEvent(p => ({ ...p, location_box: e.target.value }))} />
            </div>

            {/* Timestamp */}
            <div className="form-group">
              <label className="form-label">Timestamp (seconds)</label>
              <input className="form-input" type="number" placeholder="e.g. 1200" value={newEvent.timestamp} onChange={e => setNewEvent(p => ({ ...p, timestamp: e.target.value }))} />
            </div>

            {/* Direction */}
            <div className="form-group">
              <label className="form-label">Direction</label>
              <select className="form-select" value={newEvent.direction_of_attack} onChange={e => setNewEvent(p => ({ ...p, direction_of_attack: e.target.value }))}>
                <option value="L2R">L2R</option>
                <option value="R2L">R2L</option>
              </select>
            </div>

            {/* Player Name */}
            <div className="form-group">
              <label className="form-label">Player Name (optional)</label>
              <input className="form-input" placeholder="Player name" value={newEvent.player_name} onChange={e => setNewEvent(p => ({ ...p, player_name: e.target.value }))} />
            </div>

            {/* Jersey Number */}
            <div className="form-group">
              <label className="form-label">Jersey # (optional)</label>
              <input className="form-input" placeholder="#" value={newEvent.jersey_number} onChange={e => setNewEvent(p => ({ ...p, jersey_number: e.target.value }))} />
            </div>
          </div>

          <button className="btn btn-primary btn-block mt-4" onClick={addNewEvent}>
            <Plus size={16} /> Add Event
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading events...</p></div>
        ) : events.length === 0 && !showAddForm ? (
          <div className="empty-state">
            <h4>No events logged</h4>
            <p>Click "Add Event" to create one</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time</th>
                  <th>Half</th>
                  <th>Team</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Outcome</th>
                  <th>Zone</th>
                  <th>Player</th>
                  <th style={{ textAlign: 'right' }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, idx) => (
                  <tr key={ev.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{idx + 1}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{formatTime(ev.timestamp)}</td>

                    {editingId === ev.id ? (
                      <>
                        <td><input className="form-input" style={{ ...inputStyle, width: '80px' }} value={editForm.half} onChange={e => setEditForm(p => ({ ...p, half: e.target.value }))} /></td>
                        <td>{getTeamName(ev.team_id)}</td>
                        <td><input className="form-input" style={{ ...inputStyle, width: '100px' }} value={editForm.action} onChange={e => setEditForm(p => ({ ...p, action: e.target.value }))} /></td>
                        <td><input className="form-input" style={{ ...inputStyle, width: '100px' }} value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} /></td>
                        <td><input className="form-input" style={{ ...inputStyle, width: '100px' }} value={editForm.outcome} onChange={e => setEditForm(p => ({ ...p, outcome: e.target.value }))} /></td>
                        <td><input className="form-input" style={{ ...inputStyle, width: '50px' }} value={editForm.location_box} onChange={e => setEditForm(p => ({ ...p, location_box: e.target.value }))} /></td>
                        <td>
                          <input className="form-input" style={{ ...inputStyle, width: '100px', marginBottom: '4px' }} value={editForm.player_name} onChange={e => setEditForm(p => ({ ...p, player_name: e.target.value }))} placeholder="Name" />
                          <input className="form-input" style={{ ...inputStyle, width: '50px' }} value={editForm.jersey_number} onChange={e => setEditForm(p => ({ ...p, jersey_number: e.target.value }))} placeholder="#" />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-primary" onClick={saveEdit}><Save size={12} /></button>
                            <button className="btn btn-sm btn-ghost" onClick={() => setEditingId(null)}>✕</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{ev.half || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{getTeamName(ev.team_id)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.action || ev.event_type || '—'}</td>
                        <td>{ev.type || '—'}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: ev.outcome === 'Goal' ? 'var(--success)' : (ev.outcome === 'Red' || ev.outcome === 'Yellow' ? 'var(--warning)' : 'var(--text-secondary)') }}>
                            {ev.outcome || '—'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{ev.location_box || '—'}</td>
                        <td>
                          {ev.player_name ? (
                            <span style={{ fontSize: '12px' }}>{ev.player_name}{ev.jersey_number ? ` (${ev.jersey_number})` : ''}</span>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-ghost" onClick={() => startEdit(ev)}><Edit3 size={12} /></button>
                            <button className="btn btn-sm btn-danger" onClick={() => deleteEvent(ev.id)}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
