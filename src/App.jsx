import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import GameScreen from './GameScreen'
import logo from './assets/react.svg'; // Use your own fantasy logo if available

//const API_URL = 'https://mpp-exam-practice-backend.onrender.com'
const API_URL = 'http://localhost:8000'

function App() {
  const [characters, setCharacters] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Separate state for create and edit forms
  const [createForm, setCreateForm] = useState({ name: '', image: '', health: '', armor: '', mana: '', kills: '' });
  const [editForm, setEditForm] = useState({ name: '', image: '', health: '', armor: '', mana: '', kills: '' });
  const [stats, setStats] = useState({ total: 0, avg_health: 0, avg_armor: 0, avg_mana: 0 });
  const [position, setPosition] = useState(null);
  const [inGame, setInGame] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch characters and stats on mount
  useEffect(() => {
    fetchCharacters();
    fetchStats();
  }, []);

  const fetchCharacters = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/characters/`);
      setCharacters(res.data);
      if (res.data.length > 0 && !selectedId) {
        setSelectedId(res.data[0].id);
      }
    } catch (err) {
      setError('Failed to fetch characters');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/characters/stats`);
      setStats(res.data);
    } catch (err) {
      setError('Failed to fetch stats');
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch position for selected character (optional, if you want to persist position on reload)
  const fetchPosition = async (charId) => {
    try {
      const res = await axios.get(`${API_URL}/positions/${charId}`);
      setPosition(res.data);
    } catch (err) {
      setPosition(null);
    }
  };

  // When character changes, clear position
  useEffect(() => {
    setPosition(null);
  }, [selectedId]);

  // After any CRUD operation, also refresh stats
  const fetchAll = async () => {
    await fetchCharacters();
    await fetchStats();
  };

  const selected = characters.find((c) => c.id === selectedId);

  // Handle create form input changes
  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((f) => ({ ...f, [name]: value }));
  };

  // Handle edit form input changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  // Create new character
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_URL}/characters/`, {
        ...createForm,
        health: Number(createForm.health) || 0,
        armor: Number(createForm.armor) || 0,
        mana: Number(createForm.mana) || 0,
        kills: Number(createForm.kills) || 0,
      });
      await fetchAll();
      setCreateForm({ name: '', image: '', health: '', armor: '', mana: '', kills: '' });
      setSelectedId(res.data.id);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to create character');
    }
  };

  // Start editing selected character
  const handleEdit = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      image: selected.image,
      health: selected.health,
      armor: selected.armor,
      mana: selected.mana,
      kills: selected.kills || 0,
    });
    setIsEditing(true);
  };

  // Save edited character
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.put(`${API_URL}/characters/${selectedId}`, {
        ...editForm,
        health: Number(editForm.health),
        armor: Number(editForm.armor),
        mana: Number(editForm.mana),
        kills: Number(editForm.kills) || 0,
      });
      await fetchAll();
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update character');
    }
  };

  // Delete character
  const handleDelete = async () => {
    setError('');
    try {
      await axios.delete(`${API_URL}/characters/${selectedId}`);
      await fetchAll();
      setSelectedId((prevId) => {
        const idx = characters.findIndex((c) => c.id === prevId);
        if (characters.length === 1) return null;
        if (idx === 0) return characters[1].id;
        return characters[idx - 1].id;
      });
      setIsEditing(false);
    } catch (err) {
      setError('Failed to delete character');
    }
  };

  const handleRandom = async () => {
    setError('');
    try {
      const res = await axios.post(`${API_URL}/characters/random`);
      await fetchAll();
      setSelectedId(res.data.id);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to create random character');
    }
  };

  const handleEnterWorld = async () => {
    if (!selectedId) return;
    setError('');
    try {
      const res = await axios.post(`${API_URL}/spawn/${selectedId}`);
      setPosition(res.data);
      setInGame(true);
      localStorage.setItem('characterId', selectedId.toString());
    } catch (err) {
      setError('Failed to spawn character');
    }
  };

  const handleBackToMain = () => {
    setInGame(false);
  };

  return (
    <div style={{ minHeight: '100vh', height: '100vh', background: '#232326', color: '#fff', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {inGame ? (
        <GameScreen character={selected} position={position} onBack={handleBackToMain} />
      ) : (
        // Main Screen
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {/* Title and Logo */}
          <div style={{ marginTop: 0, marginBottom: 12, textAlign: 'center' }}>
            <img src={logo} alt="Game Logo" style={{ width: 56, height: 56, marginBottom: 4, filter: 'drop-shadow(0 2px 8px #0008)' }} />
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, margin: 0, color: '#a5b4fc', textShadow: '0 2px 8px #0008' }}>MPP MMORPG</h1>
          </div>
          {/* Main content row, centered */}
          <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: 2000, minWidth: 1200, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 60, background: 'rgba(24,24,27,0.98)', borderRadius: 18, boxShadow: '0 4px 32px #0004', padding: 32, margin: '0 auto' }}>
              {/* Left: Sidebar */}
              <div style={{ minWidth: 300, maxWidth: 350, height: '60vh', background: '#18181b', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px #0002', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', position: 'relative' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 10, fontSize: 20, fontWeight: 700 }}>Characters</h2>
                {loading && <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 14 }}>Loading...</div>}
                {error && <div style={{ color: '#f87171', textAlign: 'center', marginBottom: 8, fontSize: 14 }}>{error}</div>}
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 12, maxHeight: '38vh', overflowY: 'auto' }}>
                  {characters.map((char) => (
                    <li
                      key={char.id}
                      onClick={() => { setSelectedId(char.id); setIsEditing(false); }}
                      style={{
                        cursor: 'pointer',
                        background: char.id === selectedId ? '#6366f1' : 'transparent',
                        color: char.id === selectedId ? '#fff' : '#e5e7eb',
                        padding: '0.4rem',
                        borderRadius: 8,
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: char.id === selectedId ? '0 0 0 2px #a5b4fc' : 'none',
                        border: char.id === selectedId ? '2px solid #fff' : '2px solid transparent',
                        fontWeight: char.id === selectedId ? 'bold' : 'normal',
                        fontSize: 15,
                        transition: 'all 0.2s',
                      }}
                    >
                      <img src={char.image} alt={char.name} width={28} height={28} style={{ borderRadius: '50%', marginRight: 8 }} />
                      <span>{char.name}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => setShowCreateForm(true)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 'bold', fontSize: 16, marginTop: 'auto', marginBottom: 4, cursor: 'pointer' }}>+ Create Character</button>
                {showCreateForm && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#232326ee', borderRadius: 12, boxShadow: '0 2px 16px #0008', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                    <h3 style={{ marginBottom: 8, textAlign: 'center', fontSize: 17 }}>Create Character</h3>
                    <form onSubmit={async (e) => { await handleCreate(e); setShowCreateForm(false); }} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '90%' }}>
                      <input name="name" placeholder="Name" value={createForm.name} onChange={handleCreateFormChange} required autoComplete="off" style={{ fontSize: 15 }} />
                      <input name="image" placeholder="Image URL" value={createForm.image} onChange={handleCreateFormChange} required autoComplete="off" style={{ fontSize: 15 }} />
                      <input name="health" placeholder="Health" type="number" value={createForm.health} onChange={handleCreateFormChange} autoComplete="off" style={{ fontSize: 15 }} />
                      <input name="armor" placeholder="Armor" type="number" value={createForm.armor} onChange={handleCreateFormChange} autoComplete="off" style={{ fontSize: 15 }} />
                      <input name="mana" placeholder="Mana" type="number" value={createForm.mana} onChange={handleCreateFormChange} autoComplete="off" style={{ fontSize: 15 }} />
                      <input name="kills" placeholder="Kills" type="number" value={createForm.kills} onChange={handleCreateFormChange} autoComplete="off" style={{ fontSize: 15 }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'center' }}>
                        <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontWeight: 'bold', fontSize: 15 }}>Create</button>
                        <button type="button" onClick={() => setShowCreateForm(false)} style={{ background: '#a1a1aa', color: '#232326', border: 'none', borderRadius: 6, padding: '7px 12px', fontWeight: 'bold', fontSize: 15 }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
              {/* Center: Stats */}
              <div style={{ minWidth: 300, maxWidth: 350, height: '60vh', background: '#18181b', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px #0002', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>Statistics</div>
                <div style={{ fontSize: 15, marginBottom: 4 }}><strong>Total:</strong> {stats.total}</div>
                <div style={{ fontSize: 15, marginBottom: 4 }}><strong>Avg Health:</strong> {stats.avg_health}</div>
                <div style={{ fontSize: 15, marginBottom: 4 }}><strong>Avg Armor:</strong> {stats.avg_armor}</div>
                <div style={{ fontSize: 15, marginBottom: 4 }}><strong>Avg Mana:</strong> {stats.avg_mana}</div>
                <div style={{ fontSize: 15, marginBottom: 4 }}><strong>Avg Kills:</strong> {stats.avg_kills}</div>
                <button onClick={handleRandom} style={{ marginTop: 10, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: 15, boxShadow: '0 2px 8px #0002' }}>
                  + Random Character
                </button>
              </div>
              {/* Right: Character Details */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', maxWidth: 350 }}>
                <div style={{ width: '100%', maxWidth: 350 }}>
                  <h2 style={{ textAlign: 'center', marginBottom: 10, fontSize: 20, fontWeight: 700 }}>Character Details</h2>
                  {selected ? (
                    <div style={{ border: '1.5px solid #6366f1', borderRadius: 14, padding: 18, background: '#232326', boxShadow: '0 2px 8px #0002', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '48vh', justifyContent: 'center' }}>
                      {isEditing ? (
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                          <input name="name" placeholder="Name" value={editForm.name} onChange={handleEditFormChange} required style={{ fontSize: 14 }} />
                          <input name="image" placeholder="Image URL" value={editForm.image} onChange={handleEditFormChange} required style={{ fontSize: 14 }} />
                          <input name="health" placeholder="Health" type="number" value={editForm.health} onChange={handleEditFormChange} style={{ fontSize: 14 }} />
                          <input name="armor" placeholder="Armor" type="number" value={editForm.armor} onChange={handleEditFormChange} style={{ fontSize: 14 }} />
                          <input name="mana" placeholder="Mana" type="number" value={editForm.mana} onChange={handleEditFormChange} style={{ fontSize: 14 }} />
                          <input name="kills" placeholder="Kills" type="number" value={editForm.kills} onChange={handleEditFormChange} style={{ fontSize: 14 }} />
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'center' }}>
                            <button type="submit" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontWeight: 'bold', fontSize: 15 }}>Save</button>
                            <button type="button" onClick={() => setIsEditing(false)} style={{ background: '#a1a1aa', color: '#232326', border: 'none', borderRadius: 6, padding: '7px 12px', fontWeight: 'bold', fontSize: 15 }}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <img src={selected.image} alt={selected.name} width={70} height={70} style={{ borderRadius: '50%', marginBottom: 10, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                          <h3 style={{ textAlign: 'center', marginBottom: 8, fontSize: 17 }}>{selected.name}</h3>
                          <p style={{ fontSize: 15, margin: 0 }}><strong>Health:</strong> {selected.health}</p>
                          <p style={{ fontSize: 15, margin: 0 }}><strong>Armor:</strong> {selected.armor}</p>
                          <p style={{ fontSize: 15, margin: 0 }}><strong>Mana:</strong> {selected.mana}</p>
                          <p style={{ fontSize: 15, margin: 0 }}><strong>Kills:</strong> {selected.kills ?? 0}</p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                            <button onClick={handleEdit} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontWeight: 'bold', fontSize: 15 }}>Edit</button>
                            <button onClick={handleDelete} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontWeight: 'bold', fontSize: 15 }}>Delete</button>
                          </div>
                          <button onClick={handleEnterWorld} style={{ marginTop: 10, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: 15, marginLeft: 6 }}>Enter World</button>
                        </>
                      )}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', fontSize: 15 }}>No character selected.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
