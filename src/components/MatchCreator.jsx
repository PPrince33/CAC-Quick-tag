import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Swords, Goal } from 'lucide-react';

const JERSEY_COLORS = [
  { name: 'red', hex: '#dc2626' },
  { name: 'blue', hex: '#2563eb' },
  { name: 'green', hex: '#16a34a' },
  { name: 'yellow', hex: '#eab308' },
  { name: 'black', hex: '#1a1a1a' },
  { name: 'white', hex: '#f5f5f5' },
  { name: 'orange', hex: '#ea580c' },
];

export default function MatchCreator() {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({
    tournament_id: '',
    team_a_id: '',
    team_b_id: '',
    home_jersey_color: 'red',
    away_jersey_color: 'blue',
    is_futsal: false,
    details: '',
  });
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const { data: t } = await supabase.from('tournaments').select('*').order('name');
      const { data: tm } = await supabase.from('teams').select('*').order('name');
      setTournaments(t || []);
      setTeams(tm || []);
    };
    fetch();
  }, []);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const tournamentTeams = teams.filter(t => t.tournament_id === form.tournament_id);
  const teamBOptions = tournamentTeams.filter(t => t.id !== form.team_a_id);
  const isReady = form.tournament_id && form.team_a_id && form.team_b_id;

  const createMatch = async () => {
    if (!isReady) return;
    setCreating(true);
    const { error } = await supabase.from('matches').insert([{
      tournament_id: form.tournament_id,
      team_a_id: form.team_a_id,
      team_b_id: form.team_b_id,
      home_jersey_color: form.home_jersey_color,
      away_jersey_color: form.away_jersey_color,
      is_futsal: form.is_futsal,
      details: form.details || null,
      status: 'Draft',
    }]);
    setCreating(false);
    if (!error) {
      setSuccess('Match created successfully!');
      setForm(prev => ({ ...prev, team_a_id: '', team_b_id: '', details: '' }));
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const ColorPicker = ({ value, onChange, label }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="color-picker">
        {JERSEY_COLORS.map(c => (
          <div
            key={c.name}
            className={`color-swatch ${value === c.name ? 'selected' : ''}`}
            style={{ background: c.hex }}
            onClick={() => onChange(c.name)}
            title={c.name}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>Create Match</h2>
        <p>Set up a new match with jersey colors and pitch type</p>
      </div>

      {success && <div className="toast success">✓ {success}</div>}

      <div className="card">
        <div className="card-header">
          <h3>Match Details</h3>
        </div>

        <div className="form-group">
          <label className="form-label">Tournament</label>
          <select
            className="form-select"
            value={form.tournament_id}
            onChange={(e) => {
              update('tournament_id', e.target.value);
              update('team_a_id', '');
              update('team_b_id', '');
            }}
          >
            <option value="">— Select Tournament —</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {form.tournament_id && (
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Team A (Home)</label>
              <select className="form-select" value={form.team_a_id} onChange={(e) => { update('team_a_id', e.target.value); update('team_b_id', ''); }}>
                <option value="">— Select Team A —</option>
                {tournamentTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Team B (Away)</label>
              <select className="form-select" value={form.team_b_id} onChange={(e) => update('team_b_id', e.target.value)} disabled={!form.team_a_id}>
                <option value="">— Select Team B —</option>
                {teamBOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <div className="grid-2">
            <ColorPicker label="Home Jersey Color" value={form.home_jersey_color} onChange={(v) => update('home_jersey_color', v)} />
            <ColorPicker label="Away Jersey Color" value={form.away_jersey_color} onChange={(v) => update('away_jersey_color', v)} />
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            className="toggle"
            onClick={() => update('is_futsal', !form.is_futsal)}
          >
            <div className={`toggle-track ${form.is_futsal ? 'active' : ''}`}>
              <div className="toggle-thumb" />
            </div>
            <span className="toggle-label">Futsal Match</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {form.is_futsal ? '32 zones (8×4)' : '96 zones (12×8)'}
          </span>
        </div>

        <div className="form-group mt-6">
          <label className="form-label">Match Details (optional)</label>
          <textarea
            className="form-input"
            placeholder="e.g. Group stage, rainy conditions..."
            value={form.details}
            onChange={(e) => update('details', e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary btn-lg btn-block mt-6"
          onClick={createMatch}
          disabled={!isReady || creating}
        >
          <Goal size={18} />
          {creating ? 'Creating...' : 'Create Match'}
        </button>
      </div>
    </div>
  );
}
