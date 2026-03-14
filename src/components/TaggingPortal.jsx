import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Clock, Pause, RotateCcw, X } from 'lucide-react';

// =============================================
// CONSTANTS
// =============================================
const JERSEY_HEX = {
  red: '#dc2626', blue: '#2563eb', green: '#16a34a',
  yellow: '#eab308', black: '#1a1a1a', white: '#f5f5f5', orange: '#ea580c',
};

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

// Actions that require Type selection
const ACTIONS_WITH_TYPE = ['Pass', 'Shot'];

// Outcomes that switch to the OTHER team
const SWITCH_TEAM_OUTCOMES = {
  'Pass': ['Miss', 'Interception'],
  'Pass Received': ['Lost Control'],
  'Tackle': ['Foul', 'Yellow', 'Red'],
  'Shot': ['Off-Target'],
};

// Key events that need player names at end-match
const KEY_OUTCOMES = ['Goal', 'Red', 'Yellow', 'Assist'];
const KEY_ACTIONS = ['Own Goal'];

// =============================================
// PITCH COMPONENT
// =============================================
function PitchGrid({ isFutsal, selectedBox, onSelectBox, accentColor }) {
  const cols = isFutsal ? 8 : 12;
  const rows = isFutsal ? 4 : 8;
  const totalBoxes = cols * rows;
  const viewWidth = 600;
  const viewHeight = isFutsal ? 300 : 400;
  const boxW = viewWidth / cols;
  const boxH = viewHeight / rows;

  // Pitch markings
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const circleR = isFutsal ? 40 : 55;
  const penAreaW = isFutsal ? 80 : 100;
  const penAreaH = isFutsal ? 160 : 220;
  const goalAreaW = isFutsal ? 35 : 30;
  const goalAreaH = isFutsal ? 100 : 120;

  return (
    <svg className="pitch-svg" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="xMidYMid meet">
      {/* Background */}
      <rect x="0" y="0" width={viewWidth} height={viewHeight} fill="#ffffff" rx="4" />

      {/* Field lines */}
      <rect x="2" y="2" width={viewWidth - 4} height={viewHeight - 4} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="2" rx="2" />
      {/* Center line */}
      <line x1={centerX} y1="2" x2={centerX} y2={viewHeight - 2} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
      {/* Center circle */}
      <circle cx={centerX} cy={centerY} r={circleR} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
      <circle cx={centerX} cy={centerY} r="3" fill="rgba(0,0,0,0.4)" />

      {/* Left penalty area */}
      <rect x="2" y={(viewHeight - penAreaH) / 2} width={penAreaW} height={penAreaH} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
      <rect x="2" y={(viewHeight - goalAreaH) / 2} width={goalAreaW} height={goalAreaH} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />

      {/* Right penalty area */}
      <rect x={viewWidth - penAreaW - 2} y={(viewHeight - penAreaH) / 2} width={penAreaW} height={penAreaH} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
      <rect x={viewWidth - goalAreaW - 2} y={(viewHeight - goalAreaH) / 2} width={goalAreaW} height={goalAreaH} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />

      {/* Grid boxes — dotted lines */}
      {Array.from({ length: totalBoxes }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const boxNum = (col * rows) + row + 1; // Top-to-Bottom!
        const isSelected = selectedBox === boxNum;

        return (
          <rect
            key={boxNum}
            x={col * boxW}
            y={row * boxH}
            width={boxW}
            height={boxH}
            className={`pitch-box ${isSelected ? 'selected' : ''}`}
            style={isSelected ? { fill: accentColor + '40', stroke: accentColor, strokeDasharray: 'none' } : {}}
            onClick={() => onSelectBox(boxNum)}
          />
        );
      })}

      {/* Box numbers — black */}
      {Array.from({ length: totalBoxes }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const boxNum = (col * rows) + row + 1;
        return (
          <text
            key={`t${boxNum}`}
            x={col * boxW + boxW / 2}
            y={row * boxH + boxH / 2 + 3}
            textAnchor="middle"
            fill="rgba(0,0,0,0.6)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            fontWeight="700"
            style={{ pointerEvents: 'none' }}
          >
            {boxNum}
          </text>
        );
      })}
    </svg>
  );
}

// =============================================
// HALF DIRECTION MODAL
// =============================================
function DirectionModal({ teamA, teamB, onSelect }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Select Direction of Attack</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Which team is attacking <strong>Left → Right</strong> in this half?
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSelect(teamA.id, 'L2R')}>
            {teamA.name} → L2R
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSelect(teamB.id, 'L2R')}>
            {teamB.name} → L2R
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// END MATCH - ACTION PLAYER FORM
// =============================================
function ActionPlayerModal({ events, teamA, teamB, onSubmit, onCancel }) {
  // Filter key events
  const keyEvents = events.filter(ev =>
    KEY_OUTCOMES.includes(ev.outcome) || KEY_ACTIONS.includes(ev.action)
  );

  const [playerData, setPlayerData] = useState(
    keyEvents.map(ev => ({ id: ev.id, player_name: ev.player_name || '', jersey_number: ev.jersey_number || '' }))
  );

  const updatePlayer = (idx, field, val) => {
    setPlayerData(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const getTeamName = (teamId) => {
    if (teamId === teamA.id) return teamA.name;
    if (teamId === teamB.id) return teamB.name;
    return '—';
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '—';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmit = () => {
    onSubmit(playerData);
  };

  if (keyEvents.length === 0) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>End Match</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>No goals, cards, assists, or own goals to record player details for.</p>
          <button className="btn btn-primary btn-block" onClick={() => onSubmit([])}>
            Finalize Match
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '700px' }}>
        <h3>Record Action Players</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Fill in player details for key match events (Goals, Assists, Cards, Own Goals)
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Time</th>
                <th>Half</th>
                <th>Action</th>
                <th>Player Name</th>
                <th>Jersey #</th>
              </tr>
            </thead>
            <tbody>
              {keyEvents.map((ev, idx) => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 700 }}>{getTeamName(ev.team_id)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{formatTime(ev.timestamp)}</td>
                  <td>{ev.half}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ev.action === 'Own Goal' ? 'Own Goal' : ev.outcome}
                  </td>
                  <td>
                    <input
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                      placeholder="Player name"
                      value={playerData[idx]?.player_name || ''}
                      onChange={(e) => updatePlayer(idx, 'player_name', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '12px', width: '60px' }}
                      placeholder="#"
                      value={playerData[idx]?.jersey_number || ''}
                      onChange={(e) => updatePlayer(idx, 'jersey_number', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Finalize Match</button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MAIN TAGGING PORTAL
// =============================================
export default function TaggingPortal({ match, teams, onEnd }) {
  const teamA = teams.find(t => t.id === match.team_a_id);
  const teamB = teams.find(t => t.id === match.team_b_id);

  // Timer state
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Match state
  const [currentHalf, setCurrentHalf] = useState('1st');
  const [currentTeamId, setCurrentTeamId] = useState(match.team_a_id);
  const [directionOfAttack, setDirectionOfAttack] = useState('L2R');
  const [directionTeamId, setDirectionTeamId] = useState(match.team_a_id);

  // Event building state
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedType, setSelectedType] = useState('Normal');
  const [selectedBox, setSelectedBox] = useState(null);

  // Events log
  const [loggedEvents, setLoggedEvents] = useState([]);
  const [logCount, setLogCount] = useState(0);

  // Modal state — don't show direction modal if resuming
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Toast
  const [toast, setToast] = useState('');

  // Accent color based on selected team
  const currentTeamColor = currentTeamId === match.team_a_id
    ? (match.home_jersey_color || 'red')
    : (match.away_jersey_color || 'blue');
  const accentHex = JERSEY_HEX[currentTeamColor] || '#3b82f6';

  const currentTeamName = currentTeamId === match.team_a_id ? teamA?.name : teamB?.name;
  const otherTeamId = currentTeamId === match.team_a_id ? match.team_b_id : match.team_a_id;

  // =============================================
  // INITIALIZATION: restore state on resume
  // =============================================
  useEffect(() => {
    const init = async () => {
      // Fetch any existing events for this match
      const { data: existingEvents } = await supabase
        .from('events')
        .select('*')
        .eq('match_id', match.id)
        .order('timestamp', { ascending: true });

      const events = existingEvents || [];

      if (events.length > 0) {
        // RESUMING — restore state from existing events
        setLoggedEvents(events);
        setLogCount(events.length);

        // Restore timer to max timestamp + add real elapsed time
        const maxTimestamp = Math.max(...events.map(e => e.timestamp || 0));
        // Use match start_time to compute elapsed seconds if available
        if (match.start_time) {
          const matchStartMs = new Date(match.start_time).getTime();
          const nowMs = Date.now();
          const realElapsed = Math.floor((nowMs - matchStartMs) / 1000);
          // Use whichever is higher: real elapsed or max event timestamp
          setSeconds(Math.max(realElapsed, maxTimestamp));
        } else {
          setSeconds(maxTimestamp);
        }

        // Restore half from the most recent event
        const lastEvent = events[events.length - 1];
        if (lastEvent.half) setCurrentHalf(lastEvent.half);

        // Restore direction from most recent event
        if (lastEvent.direction_of_attack) {
          const dir = lastEvent.direction_of_attack;
          setDirectionTeamId(lastEvent.team_id);
          setDirectionOfAttack(dir);
        }

        // Don't show direction modal on resume
        setShowDirectionModal(false);
        setToast(`↺ Resumed — ${events.length} events restored`);
      } else {
        // FRESH START — show direction modal
        setShowDirectionModal(true);
      }

      setHasInitialized(true);
    };

    init();
  }, [match.id]);

  // Timer
  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isPaused]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Get current direction for selected team
  const getCurrentDirection = () => {
    if (currentTeamId === directionTeamId) return directionOfAttack;
    return directionOfAttack === 'L2R' ? 'R2L' : 'L2R';
  };

  // Handle half change
  const cycleHalf = () => {
    const currentIdx = HALVES.indexOf(currentHalf);
    const nextIdx = (currentIdx + 1) % HALVES.length;
    setCurrentHalf(HALVES[nextIdx]);
    setShowDirectionModal(true);
  };

  // Handle direction selection
  const handleDirectionSelect = (teamId, direction) => {
    setDirectionTeamId(teamId);
    setDirectionOfAttack(direction);
    setShowDirectionModal(false);
  };

  // Handle team toggle
  const toggleTeam = () => {
    setCurrentTeamId(prev => prev === match.team_a_id ? match.team_b_id : match.team_a_id);
    // Reset action selection on team change
    setSelectedAction(null);
    setSelectedType('Normal');
    setSelectedBox(null);
  };

  // Handle outcome click = save event
  const handleOutcome = async (outcome) => {
    if (!selectedAction || !selectedBox) {
      setToast('⚠ Select location on pitch first');
      return;
    }

    const direction = getCurrentDirection();
    let finalBox = selectedBox;

    // Mirror the location box (180 degree rotation) if the team is playing Right-to-Left (R2L)
    if (direction === 'R2L' && selectedBox) {
        const cols = match.is_futsal ? 8 : 12;
        const rows = match.is_futsal ? 4 : 8;
        const b = selectedBox - 1;
        const col = Math.floor(b / rows);
        const row = b % rows;
        const mirroredCol = cols - 1 - col;
        const mirroredRow = rows - 1 - row;
        finalBox = (mirroredCol * rows) + mirroredRow + 1;
    }

    const eventPayload = {
      match_id: match.id,
      team_id: currentTeamId,
      half: currentHalf,
      action: selectedAction,
      location_box: finalBox,
      type: ACTIONS_WITH_TYPE.includes(selectedAction) ? selectedType : null,
      outcome: outcome,
      direction_of_attack: getCurrentDirection(),
      timestamp: seconds,
      match_minute: Math.floor(seconds / 60),
    };

    console.log("SENDING PAYLOAD TO SUPABASE:", eventPayload);

    const { data, error } = await supabase.from('events').insert([eventPayload]).select().single();
    if (error) console.error("SUPABASE ERROR:", error);

    if (!error && data) {
      setLoggedEvents(prev => [...prev, data]);
      setLogCount(prev => prev + 1);
      setToast(`✓ ${selectedAction} → ${outcome}`);

      // Auto team-switching logic
      const shouldSwitch = SWITCH_TEAM_OUTCOMES[selectedAction]?.includes(outcome);
      if (shouldSwitch) {
        setCurrentTeamId(otherTeamId);
      }

      // Reset for next entry
      setSelectedAction(null);
      setSelectedType('Normal');
      setSelectedBox(null);
    } else {
      setToast('✗ Failed to save event');
      console.error(error);
    }
  };

  // Delete last event
  const deleteLastEvent = async () => {
    if (loggedEvents.length === 0) return;
    const lastEvent = loggedEvents[loggedEvents.length - 1];
    await supabase.from('events').delete().eq('id', lastEvent.id);
    setLoggedEvents(prev => prev.slice(0, -1));
    setLogCount(prev => prev - 1);
    setToast('↩ Last event deleted');
  };

  // End match flow
  const handleEndMatch = () => {
    setShowEndModal(true);
  };

  const confirmEndMatch = async () => {
    setShowEndModal(false);
    // Fetch all events for player modal
    const { data } = await supabase.from('events').select('*')
      .eq('match_id', match.id).order('timestamp', { ascending: true });
    setLoggedEvents(data || []);
    setShowPlayerModal(true);
  };

  const handlePlayerSubmit = async (playerData) => {
    // Update events with player info
    for (const p of playerData) {
      if (p.player_name || p.jersey_number) {
        await supabase.from('events').update({
          player_name: p.player_name || null,
          jersey_number: p.jersey_number || null,
        }).eq('id', p.id);
      }
    }
    // Update match status
    await supabase.from('matches').update({ status: 'Finished' }).eq('id', match.id);
    setShowPlayerModal(false);
    onEnd();
  };

  // Determine if type selector should show
  const showType = selectedAction && ACTIONS_WITH_TYPE.includes(selectedAction);

  // Get outcome buttons for current action
  const outcomeOptions = selectedAction ? (OUTCOMES[selectedAction] || []) : [];

  // Outcome button style helper
  const getOutcomeClass = (outcome) => {
    if (outcome === 'Goal') return 'outcome-btn goal';
    if (outcome === 'Yellow') return 'outcome-btn card-yellow';
    if (outcome === 'Red') return 'outcome-btn card-red';
    if (['Miss', 'Interception', 'Lost Control', 'Foul', 'Off-Target', 'Unsuccessful'].includes(outcome)) return 'outcome-btn negative';
    return 'outcome-btn';
  };

  return (
    <div className="tagging-shell" style={{ '--team-accent': accentHex, background: accentHex, transition: 'background 0.4s ease' }}>
      {/* Toast */}
      {toast && (
        <div className="toast success" style={{ left: '50%', right: 'auto', transform: 'translateX(-50%)' }}>
          {toast}
        </div>
      )}

      {/* Direction Modal */}
      {showDirectionModal && teamA && teamB && (
        <DirectionModal teamA={teamA} teamB={teamB} onSelect={handleDirectionSelect} />
      )}

      {/* End Match Confirmation */}
      {showEndModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>End Match?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Are you sure you want to end this match? You'll be asked to fill in player details for key events.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowEndModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmEndMatch} style={{ background: 'var(--danger)', color: 'white', border: 'none' }}>
                End Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player details modal */}
      {showPlayerModal && (
        <ActionPlayerModal
          events={loggedEvents}
          teamA={teamA}
          teamB={teamB}
          onSubmit={handlePlayerSubmit}
          onCancel={() => setShowPlayerModal(false)}
        />
      )}

      {/* =============================================
          TOP BAR
          ============================================= */}
      <div className="tagging-topbar">
        {/* Timer */}
        <button
          className={`topbar-btn timer ${isPaused ? 'paused' : ''}`}
          onClick={() => setIsPaused(!isPaused)}
          title={isPaused ? 'Resume timer' : 'Pause timer'}
          style={isPaused ? {} : { borderColor: accentHex + '60' }}
        >
          {isPaused ? <Pause size={16} /> : <Clock size={16} />}
          {formatTime(seconds)}
        </button>

        {/* Half */}
        <button
          className="topbar-btn"
          onClick={cycleHalf}
          title="Change half"
        >
          {currentHalf}
        </button>

        {/* Team Selector */}
        <button
          className="topbar-btn team-btn"
          onClick={toggleTeam}
          style={{
            borderColor: accentHex,
            background: accentHex + '18',
            color: currentTeamColor === 'black' ? '#aaa' : accentHex,
          }}
        >
          {currentTeamName}
        </button>

        {/* Direction indicator */}
        <div style={{
          fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)', padding: '0 4px',
        }}>
          {getCurrentDirection()}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Log count */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px',
          color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <span style={{ fontSize: '18px' }}>{logCount}</span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>events</span>
        </div>

        {/* Undo */}
        <button
          className="btn btn-sm btn-warning"
          onClick={deleteLastEvent}
          disabled={loggedEvents.length === 0}
          style={{ fontSize: '10px', padding: '6px 10px' }}
        >
          <RotateCcw size={12} /> Undo
        </button>

        {/* End Match */}
        <button
          className="btn btn-sm btn-danger"
          onClick={handleEndMatch}
          style={{ fontSize: '10px', padding: '6px 10px' }}
        >
          <X size={12} /> End
        </button>
      </div>

      {/* =============================================
          ACTIONS ROW
          ============================================= */}
      <div className="actions-row">
        {ACTIONS.map(action => (
          <button
            key={action}
            className={`action-btn ${selectedAction === action ? 'selected' : ''}`}
            onClick={() => {
              setSelectedAction(action);
              setSelectedType('Normal');
            }}
            style={selectedAction === action ? { background: accentHex, borderColor: accentHex } : {}}
          >
            {action}
          </button>
        ))}
      </div>

      {/* =============================================
          TYPE ROW (conditional)
          ============================================= */}
      {showType && (
        <div className="type-row">
          <span className="row-label">Type:</span>
          {TYPES.map(type => (
            <button
              key={type}
              className={`type-btn ${selectedType === type ? 'selected' : ''}`}
              onClick={() => setSelectedType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* =============================================
          PITCH AREA (full width, no sidebars)
          ============================================= */}
      <div className="pitch-container">
        <div className="pitch-wrapper">
          <PitchGrid
            isFutsal={match.is_futsal}
            selectedBox={selectedBox}
            onSelectBox={setSelectedBox}
            accentColor={accentHex}
          />
        </div>
      </div>

      {/* =============================================
          OUTCOME ROW
          ============================================= */}
      {selectedAction && (
        <div className="outcome-row">
          <span className="row-label">Outcome:</span>
          {outcomeOptions.map(outcome => (
            <button
              key={outcome}
              className={getOutcomeClass(outcome)}
              onClick={() => handleOutcome(outcome)}
            >
              {outcome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
