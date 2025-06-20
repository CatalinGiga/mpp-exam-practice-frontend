import React, { useEffect, useCallback, useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export default function GameScreen({ character, position, onBack }) {
  const [pos, setPos] = useState(position);
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [enemies, setEnemies] = useState([]);
  const [enemyIds, setEnemyIds] = useState([]);
  const [attackLoading, setAttackLoading] = useState(false);
  const [attackResult, setAttackResult] = useState(null);
  const [enemySessionHp, setEnemySessionHp] = useState({});

  // On mount: pick 3 random enemy IDs (excluding player) and set session HP
  useEffect(() => {
    const pickEnemies = async () => {
      try {
        const res = await axios.get('http://localhost:8000/positions/');
        const others = res.data.filter(c => c.id !== character?.id);
        // Shuffle and pick 3
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        const picked = others.slice(0, 3);
        setEnemyIds(picked.map(c => c.id));
        setEnemySessionHp(Object.fromEntries(picked.map(c => [c.id, c.health])));
      } catch (err) {
        setEnemyIds([]);
        setEnemySessionHp({});
      }
    };
    pickEnemies();
  }, [character?.id]);

  // Poll every 5s: update only those 3 enemies' positions (keep session HP)
  useEffect(() => {
    if (enemyIds.length === 0) return;
    let interval;
    const fetchEnemies = async () => {
      try {
        const res = await axios.get('http://localhost:8000/positions/');
        const filtered = res.data.filter(c => enemyIds.includes(c.id));
        setEnemies(filtered);
      } catch (err) {
        setEnemies([]);
      }
    };
    fetchEnemies();
    interval = setInterval(fetchEnemies, 5000);
    return () => clearInterval(interval);
  }, [enemyIds]);

  // Helper: get all tiles within radius 1 of all enemies
  const getDangerTiles = () => {
    const danger = new Set();
    for (const enemy of enemies) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tx = enemy.x + dx;
          const ty = enemy.y + dy;
          if (tx >= 0 && tx < 10 && ty >= 0 && ty < 10) {
            danger.add(`${tx},${ty}`);
          }
        }
      }
    }
    return danger;
  };
  const dangerTiles = getDangerTiles();

  // Helper: is this tile an enemy?
  const isEnemy = (x, y) => enemies.some(e => e.x === x && e.y === y);
  const getEnemyAt = (x, y) => enemies.find(e => e.x === x && e.y === y);

  // Update local position if prop changes
  useEffect(() => { setPos(position); }, [position]);

  // Move handler
  const move = useCallback(async (direction) => {
    if (!character?.id || moveLoading) return;
    setMoveLoading(true);
    setMoveError('');
    try {
      const res = await axios.post(`${API_URL}/move/${character.id}`, { direction });
      setPos(res.data);
    } catch (err) {
      setMoveError('Failed to move');
    } finally {
      setMoveLoading(false);
    }
  }, [character, moveLoading]);

  // Keyboard arrow key support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp') move('up');
      if (e.key === 'ArrowDown') move('down');
      if (e.key === 'ArrowLeft') move('left');
      if (e.key === 'ArrowRight') move('right');
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Helper: is enemy in range
  const isInRange = (enemy) => {
    if (!pos || !enemy) return false;
    const dx = Math.abs(pos.x - enemy.x);
    const dy = Math.abs(pos.y - enemy.y);
    return Math.max(dx, dy) <= 1;
  };

  // Helper: get a new random enemy not already on the map or the player, and set its session HP
  const getNewEnemy = async (excludeIds, fallbackEnemy) => {
    const res = await axios.get('http://localhost:8000/positions/');
    const others = res.data.filter(c => c.id !== character?.id && !excludeIds.includes(c.id));
    if (others.length === 0 && fallbackEnemy) {
      // Respawn the same enemy at a new random position
      // Pick a random free tile
      const taken = res.data.map(c => `${c.x},${c.y}`);
      let nx, ny;
      do {
        nx = Math.floor(Math.random() * 10);
        ny = Math.floor(Math.random() * 10);
      } while (taken.includes(`${nx},${ny}`));
      // Return the fallback enemy with new position
      return { ...fallbackEnemy, x: nx, y: ny };
    }
    if (others.length === 0) return null;
    const idx = Math.floor(Math.random() * others.length);
    const newEnemy = others[idx];
    setEnemySessionHp((prev) => ({ ...prev, [newEnemy.id]: newEnemy.health }));
    return newEnemy;
  };

  // Attack handler (session HP logic)
  const handleAttack = async (enemyId) => {
    setAttackLoading(true);
    setAttackResult(null);
    try {
      const sessionHp = enemySessionHp[enemyId];
      const res = await axios.post('http://localhost:8000/attack/', {
        attacker_id: character.id,
        target_id: enemyId,
        session_hp: sessionHp
      });
      setAttackResult(res.data);
      if (res.data.killed) {
        // Find the killed enemy's last known data
        const killedEnemy = enemies.find(e => e.id === enemyId);
        // Replace killed enemy with a new one or respawn same enemy
        const newEnemy = await getNewEnemy([...enemyIds, enemyId], killedEnemy);
        setEnemies((prev) => {
          const filtered = prev.filter(e => e.id !== enemyId);
          // If newEnemy has the same ID as killedEnemy, replace it in the array
          if (newEnemy && newEnemy.id === enemyId) {
            return [...filtered, newEnemy];
          }
          return newEnemy ? [...filtered, newEnemy] : filtered;
        });
        setEnemyIds((prev) => {
          const filtered = prev.filter(id => id !== enemyId);
          // If newEnemy has the same ID as killedEnemy, keep the ID in the array
          if (newEnemy && newEnemy.id === enemyId) {
            return [...filtered, newEnemy.id];
          }
          return newEnemy ? [...filtered, newEnemy.id] : filtered;
        });
        setEnemySessionHp((prev) => {
          const copy = { ...prev };
          delete copy[enemyId];
          if (newEnemy) copy[newEnemy.id] = newEnemy.health || 100;
          return copy;
        });
        // Refetch player data to update kills
        const charRes = await axios.get(`http://localhost:8000/characters/${character.id}`);
        if (charRes.data) character.kills = charRes.data.kills;
      } else {
        setEnemySessionHp((prev) => ({ ...prev, [enemyId]: res.data.target_health }));
      }
    } catch (err) {
      setAttackResult({ error: 'Attack failed' });
    } finally {
      setAttackLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: '#232326', color: '#fff', padding: 0 }}>
      {/* Left: Character Info */}
      <div style={{ flex: '0 0 340px', background: '#18181b', borderRadius: 16, padding: 36, marginRight: 48, boxShadow: '0 2px 12px #0003', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
        <button onClick={onBack} style={{ marginBottom: 32, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, alignSelf: 'flex-start' }}>← Back</button>
        <h2 style={{ textAlign: 'center', marginBottom: 18, fontSize: 28, fontWeight: 700 }}>{character?.name}</h2>
        <img src={character?.image} alt={character?.name} width={100} height={100} style={{ borderRadius: '50%', display: 'block', margin: '0 auto 24px' }} />
        <div style={{ fontSize: 18, marginBottom: 8 }}><strong>Health:</strong> {character?.health}</div>
        <div style={{ fontSize: 18, marginBottom: 8 }}><strong>Armor:</strong> {character?.armor}</div>
        <div style={{ fontSize: 18, marginBottom: 8 }}><strong>Mana:</strong> {character?.mana}</div>
        <div style={{ fontSize: 18, marginBottom: 8 }}><strong>Kills:</strong> {character?.kills}</div>
        {pos && (
          <div style={{ marginTop: 18, fontSize: 18 }}>
            <strong>Position:</strong> ({pos.x}, {pos.y})
          </div>
        )}
        {moveError && <div style={{ color: '#f87171', marginTop: 12 }}>{moveError}</div>}
      </div>
      {/* Right: Map and Controls */}
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 16, fontSize: 22 }}>World Map (10x10)</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 48px)',
            gridTemplateRows: 'repeat(10, 48px)',
            gap: 4,
            background: '#18181b',
            padding: 16,
            borderRadius: 12,
            boxShadow: '0 2px 12px #0003',
          }}>
            {Array.from({ length: 10 * 10 }).map((_, idx) => {
              const x = idx % 10;
              const y = Math.floor(idx / 10);
              const isChar = pos && pos.x === x && pos.y === y;
              const isEnemyTile = isEnemy(x, y);
              const enemy = getEnemyAt(x, y);
              const inDanger = dangerTiles.has(`${x},${y}`);
              return (
                <div key={idx} style={{
                  width: 48,
                  height: 48,
                  background: isChar ? '#10b981' : isEnemyTile ? '#f87171' : '#27272a',
                  border: isChar ? '3px solid #fff' : inDanger ? '2.5px solid #ef4444' : '1.5px solid #444',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: isChar || isEnemyTile ? '#fff' : '#a1a1aa',
                  fontSize: 28,
                  transition: 'all 0.2s',
                  boxShadow: isChar ? '0 0 8px #10b98188' : isEnemyTile ? '0 0 8px #ef444488' : 'none',
                  position: 'relative',
                }}>
                  {isChar ? (
                    <img src={character?.image} alt="char" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                  ) : isEnemyTile && enemy ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img src={enemy.image} alt={enemy.name} title={enemy.name} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #fff' }} />
                      <span style={{ fontSize: 12, color: '#fff', marginTop: 2 }}>HP: {enemySessionHp[enemy.id]}</span>
                      {isInRange(enemy) && (
                        <button
                          onClick={() => handleAttack(enemy.id)}
                          disabled={attackLoading}
                          style={{ marginTop: 2, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', fontWeight: 'bold', fontSize: 13, cursor: 'pointer', opacity: attackLoading ? 0.7 : 1 }}
                        >
                          Attack
                        </button>
                      )}
                    </div>
                  ) : ''}
                </div>
              );
            })}
          </div>
        </div>
        {/* Movement Controls to the right of the map */}
        <div style={{ marginLeft: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Up Arrow */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
            <button onClick={() => move('up')} disabled={moveLoading} style={{ width: 56, height: 56, fontSize: 28, borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', opacity: moveLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0002' }}>↑</button>
          </div>
          {/* Left, Down, Right Arrows */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <button onClick={() => move('left')} disabled={moveLoading} style={{ width: 56, height: 56, fontSize: 28, borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', opacity: moveLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0002' }}>←</button>
            <button onClick={() => move('down')} disabled={moveLoading} style={{ width: 56, height: 56, fontSize: 28, borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', opacity: moveLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0002' }}>↓</button>
            <button onClick={() => move('right')} disabled={moveLoading} style={{ width: 56, height: 56, fontSize: 28, borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', opacity: moveLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0002' }}>→</button>
          </div>
        </div>
      </div>
      {/* Show attack result feedback */}
      {attackResult && (
        <div style={{ marginTop: 16, color: attackResult.error ? '#ef4444' : '#fff', background: attackResult.error ? '#232326' : '#18181b', padding: 10, borderRadius: 8, fontWeight: 'bold', fontSize: 16 }}>
          {attackResult.error ? (
            attackResult.error
          ) : attackResult.killed ? (
            <>Enemy defeated! Damage: {attackResult.damage}</>
          ) : (
            <>Hit! Damage: {attackResult.damage}, Enemy HP: {attackResult.target_health}</>
          )}
        </div>
      )}
    </div>
  );
} 