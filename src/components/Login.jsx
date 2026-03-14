import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Activity, Lock, User } from 'lucide-react';

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const id = e.target.analystId.value.trim();
    const pwd = e.target.password.value;

    const { data, error: err } = await supabase
      .from('analysts')
      .select('*')
      .eq('analyst_id', id)
      .eq('password', pwd)
      .single();

    if (data && !err) {
      onLogin(id);
    } else {
      setError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">
          <h1>CAC <span>QUICK-TAG</span></h1>
          <div className="tag">Analytics Tagging System</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Analyst ID</label>
            <input
              name="analystId"
              type="text"
              required
              className="form-input"
              placeholder="Enter your analyst ID"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              name="password"
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block mt-4"
            disabled={loading}
          >
            <Lock size={16} />
            {loading ? 'Authenticating...' : 'Login to System'}
          </button>
        </form>
      </div>
    </div>
  );
}
