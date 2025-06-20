import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'https://mpp-exam-practice-backend.onrender.com/'

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

  return (
    <div style={{ minHeight: '100vh', background: '#232326', color: '#fff', padding: 0 }}>
      {/* Top section: Stats and Random Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
        <div style={{ background: '#18181b', borderRadius: 8, padding: 16, fontSize: 16, minWidth: 260, textAlign: 'center', marginBottom: 12, boxShadow: '0 2px 8px #0002' }}>
          <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>Statistics</div>
          <div><strong>Total:</strong> {stats.total}</div>
          <div><strong>Avg Health:</strong> {stats.avg_health}</div>
          <div><strong>Avg Armor:</strong> {stats.avg_armor}</div>
          <div><strong>Avg Mana:</strong> {stats.avg_mana}</div>
          <div><strong>Avg Kills:</strong> {stats.avg_kills}</div>
        </div>
        <button onClick={handleRandom} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, boxShadow: '0 2px 8px #0002' }}>
          + Random Character
        </button>
      </div>
      {/* Main content: Sidebar and Detail */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '4rem', maxWidth: 1100, margin: '0 auto' }}>
        {/* Sidebar: Character list and create form */}
        <div style={{ minWidth: 260, background: '#18181b', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px #0002', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 18 }}>Characters</h2>
          {loading && <div style={{ textAlign: 'center', marginBottom: 12 }}>Loading...</div>}
          {error && <div style={{ color: '#f87171', textAlign: 'center', marginBottom: 12 }}>{error}</div>}
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
            {characters.map((char) => (
              <li
                key={char.id}
                onClick={() => { setSelectedId(char.id); setIsEditing(false); }}
                style={{
                  cursor: 'pointer',
                  background: char.id === selectedId ? '#6366f1' : 'transparent',
                  color: char.id === selectedId ? '#fff' : '#e5e7eb',
                  padding: '0.5rem',
                  borderRadius: 8,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: char.id === selectedId ? '0 0 0 3px #a5b4fc' : 'none',
                  border: char.id === selectedId ? '2px solid #fff' : '2px solid transparent',
                  fontWeight: char.id === selectedId ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                }}
              >
                <img src={char.image} alt={char.name} width={40} height={40} style={{ borderRadius: '50%', marginRight: 12 }} />
                <span>{char.name}</span>
              </li>
            ))}
          </ul>
          {/* Create character form */}
          <div style={{ background: '#232326', padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginBottom: 8, textAlign: 'center' }}>Create Character</h3>
            <form onSubmit={handleCreate} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input name="name" placeholder="Name" value={createForm.name} onChange={handleCreateFormChange} required autoComplete="off" />
              <input name="image" placeholder="Image URL" value={createForm.image} onChange={handleCreateFormChange} required autoComplete="off" />
              <input name="health" placeholder="Health" type="number" value={createForm.health} onChange={handleCreateFormChange} autoComplete="off" />
              <input name="armor" placeholder="Armor" type="number" value={createForm.armor} onChange={handleCreateFormChange} autoComplete="off" />
              <input name="mana" placeholder="Mana" type="number" value={createForm.mana} onChange={handleCreateFormChange} autoComplete="off" />
              <input name="kills" placeholder="Kills" type="number" value={createForm.kills} onChange={handleCreateFormChange} autoComplete="off" />
              <button type="submit" style={{ marginTop: 8 }}>Create</button>
            </form>
          </div>
        </div>
        {/* Detail view */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 420 }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <h2 style={{ textAlign: 'center', marginBottom: 18 }}>Character Details</h2>
            {selected ? (
              <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 32, background: '#232326', boxShadow: '0 2px 8px #0002' }}>
                {isEditing ? (
                  <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input name="name" placeholder="Name" value={editForm.name} onChange={handleEditFormChange} required />
                    <input name="image" placeholder="Image URL" value={editForm.image} onChange={handleEditFormChange} required />
                    <input name="health" placeholder="Health" type="number" value={editForm.health} onChange={handleEditFormChange} />
                    <input name="armor" placeholder="Armor" type="number" value={editForm.armor} onChange={handleEditFormChange} />
                    <input name="mana" placeholder="Mana" type="number" value={editForm.mana} onChange={handleEditFormChange} />
                    <input name="kills" placeholder="Kills" type="number" value={editForm.kills} onChange={handleEditFormChange} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="submit">Save</button>
                      <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <img src={selected.image} alt={selected.name} width={90} height={90} style={{ borderRadius: '50%', marginBottom: 18, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                    <h3 style={{ textAlign: 'center', marginBottom: 12 }}>{selected.name}</h3>
                    <p><strong>Health:</strong> {selected.health}</p>
                    <p><strong>Armor:</strong> {selected.armor}</p>
                    <p><strong>Mana:</strong> {selected.mana}</p>
                    <p><strong>Kills:</strong> {selected.kills ?? 0}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                      <button onClick={handleEdit}>Edit</button>
                      <button onClick={handleDelete} style={{ background: '#dc2626', color: '#fff' }}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p style={{ textAlign: 'center' }}>No character selected.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App
