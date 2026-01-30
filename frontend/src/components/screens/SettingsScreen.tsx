import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameApi } from '../../services/gameApi';
import { ScreenLayout } from '../common/ScreenLayout';
import { getTowerImage } from '../../utils/pieceAssets';
import { SettingsEditor } from './settings/SettingsEditor';
import { TowerEditor } from './settings/TowerEditor';
import { EnemyEditor } from './settings/EnemyEditor';
import { TowerLevelEditor } from './settings/TowerLevelEditor';
import type {
  GameSettings,
  TowerDefinitionWithLevels,
  TowerLevel,
  EnemyDefinition,
} from '../../types';
import './SettingsScreen.css';

type AdvancedTab = 'gameSettings' | 'towers' | 'towerLevels' | 'enemies';

export const SettingsScreen = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<GameSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdvancedTab>('gameSettings');
  const [towers, setTowers] = useState<TowerDefinitionWithLevels[]>([]);
  const [enemies, setEnemies] = useState<EnemyDefinition[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Tower levels editor state
  const [selectedTowerForLevels, setSelectedTowerForLevels] = useState<number | null>(null);

  // Edit state for each category
  const [editedSettings, setEditedSettings] = useState<Map<number, Partial<GameSettings>>>(
    new Map()
  );
  const [editedTowers, setEditedTowers] = useState<
    Map<number, Partial<Omit<TowerDefinitionWithLevels, 'levels'>>>
  >(new Map());
  const [editedTowerLevels, setEditedTowerLevels] = useState<Map<string, Partial<TowerLevel>>>(
    new Map()
  );
  const [editedEnemies, setEditedEnemies] = useState<Map<number, Partial<EnemyDefinition>>>(
    new Map()
  );

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [allSettings, towersData, enemiesData] = await Promise.all([
        gameApi.getAllSettings(),
        gameApi.getAllTowerDefinitions(),
        gameApi.getAllEnemyDefinitions(),
      ]);
      setSettings(allSettings);
      setTowers(towersData);
      setEnemies(enemiesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (id: number, field: keyof GameSettings, value: number) => {
    const newEdited = new Map(editedSettings);
    const current = newEdited.get(id) ?? {};
    newEdited.set(id, { ...current, [field]: value });
    setEditedSettings(newEdited);
  };

  const handleTowerChange = (
    id: number,
    field: keyof Omit<TowerDefinitionWithLevels, 'levels'>,
    value: number | string
  ) => {
    const newEdited = new Map(editedTowers);
    const current = newEdited.get(id) ?? {};
    newEdited.set(id, { ...current, [field]: value });
    setEditedTowers(newEdited);
  };

  const handleTowerLevelChange = (
    towerId: number,
    level: number,
    field: keyof Omit<TowerLevel, 'id' | 'towerId' | 'level'>,
    value: number
  ) => {
    const key = `${towerId}-${level}`;
    const newEdited = new Map(editedTowerLevels);
    const current = newEdited.get(key) ?? {};
    newEdited.set(key, { ...current, [field]: value });
    setEditedTowerLevels(newEdited);
  };

  const handleEnemyChange = (id: number, field: keyof EnemyDefinition, value: number | string) => {
    const newEdited = new Map(editedEnemies);
    const current = newEdited.get(id) ?? {};
    newEdited.set(id, { ...current, [field]: value });
    setEditedEnemies(newEdited);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const promises: Promise<unknown>[] = [];

      for (const [id, updates] of editedSettings) {
        if (Object.keys(updates).length > 0) {
          promises.push(gameApi.updateSettings(id, updates));
        }
      }

      for (const [id, updates] of editedTowers) {
        if (Object.keys(updates).length > 0) {
          promises.push(gameApi.updateTowerDefinition(id, updates));
        }
      }

      for (const [key, updates] of editedTowerLevels) {
        const parts = key.split('-');
        if (parts.length !== 2 || !parts[0] || !parts[1]) continue;
        const towerId = parseInt(parts[0], 10);
        const levelNum = parseInt(parts[1], 10);
        if (Object.keys(updates).length > 0) {
          const tower = towers.find((t) => t.id === towerId);
          const originalLevel = tower?.levels.find((l) => l.level === levelNum);
          if (originalLevel) {
            const completeData: Omit<TowerLevel, 'towerId' | 'level'> = {
              cost: updates.cost ?? originalLevel.cost,
              damage: updates.damage ?? originalLevel.damage,
              range: updates.range ?? originalLevel.range,
              fireRate: updates.fireRate ?? originalLevel.fireRate,
            };
            promises.push(gameApi.upsertTowerLevel(towerId, levelNum, completeData));
          }
        }
      }

      for (const [id, updates] of editedEnemies) {
        if (Object.keys(updates).length > 0) {
          promises.push(gameApi.updateEnemyDefinition(id, updates));
        }
      }

      await Promise.all(promises);

      setEditedSettings(new Map());
      setEditedTowers(new Map());
      setEditedTowerLevels(new Map());
      setEditedEnemies(new Map());

      await loadAllData();
      setSaveMessage('Changes saved successfully');
    } catch (error: unknown) {
      console.error('Failed to save changes:', error);
      let errorMessage = 'Failed to save changes';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setSaveMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges =
    editedSettings.size > 0 ||
    editedTowers.size > 0 ||
    editedTowerLevels.size > 0 ||
    editedEnemies.size > 0;

  const navCenter = (
    <div className="nav-title-group">
      <h1 className="nav-page-title">Game Settings</h1>
      <p className="nav-page-subtitle">Advanced configuration</p>
    </div>
  );

  const navRight = (
    <>
      <button
        className="nav-action-btn save-nav-btn"
        onClick={handleSaveAll}
        disabled={saving || !hasUnsavedChanges}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button className="nav-action-btn" onClick={() => navigate('/')}>
        Back
      </button>
    </>
  );

  if (loading) {
    return (
      <ScreenLayout className="settings-screen" navCenter={navCenter} showBackButton>
        <div className="screen-body">
          <p>Loading settings...</p>
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout className="settings-screen" navCenter={navCenter} navRight={navRight}>
      <div className="screen-body">
        <div className="settings-panel">
          <div className="advanced-tabs">
            <button
              className={`tab-button ${activeTab === 'gameSettings' ? 'active' : ''}`}
              onClick={() => setActiveTab('gameSettings')}
            >
              Game Settings
            </button>
            <button
              className={`tab-button ${activeTab === 'towers' ? 'active' : ''}`}
              onClick={() => setActiveTab('towers')}
            >
              Towers
            </button>
            <button
              className={`tab-button ${activeTab === 'towerLevels' ? 'active' : ''}`}
              onClick={() => setActiveTab('towerLevels')}
            >
              Tower Levels
            </button>
            <button
              className={`tab-button ${activeTab === 'enemies' ? 'active' : ''}`}
              onClick={() => setActiveTab('enemies')}
            >
              Enemies
            </button>
          </div>

          <div className="advanced-content">
            {activeTab === 'gameSettings' && (
              <div className="definitions-list">
                {settings.map((setting) => (
                  <SettingsEditor
                    key={setting.id}
                    setting={setting}
                    edits={editedSettings.get(setting.id ?? 0) ?? {}}
                    onChange={(field, value) =>
                      handleSettingsChange(setting.id ?? 0, field, value)
                    }
                  />
                ))}
              </div>
            )}

            {activeTab === 'towers' && (
              <div className="definitions-list">
                {towers.map((tower) => (
                  <TowerEditor
                    key={tower.id}
                    tower={tower}
                    edits={editedTowers.get(tower.id) ?? {}}
                    onChange={(field, value) => handleTowerChange(tower.id, field, value)}
                  />
                ))}
              </div>
            )}

            {activeTab === 'towerLevels' && (
              <div className="tower-levels-section">
                <div className="tower-levels-selector">
                  <h3>Select Tower Type</h3>
                  {towers.map((tower) => (
                    <button
                      key={tower.id}
                      className={`tower-type-button ${selectedTowerForLevels === tower.id ? 'active' : ''}`}
                      onClick={() => setSelectedTowerForLevels(tower.id)}
                    >
                      <img
                        src={getTowerImage(tower.id)}
                        alt={tower.name}
                        className="piece-icon-small"
                      />
                      {tower.name}
                    </button>
                  ))}
                </div>

                {selectedTowerForLevels && (
                  <div className="tower-levels-editor">
                    {(() => {
                      const tower = towers.find((t) => t.id === selectedTowerForLevels);
                      if (!tower) return null;

                      return (
                        <>
                          <h3>
                            {tower.name} Levels (Max: {tower.maxLevel})
                          </h3>
                          <div className="levels-list">
                            {tower.levels
                              .filter((level) => level.level <= tower.maxLevel)
                              .sort((a, b) => a.level - b.level)
                              .map((level) => (
                                <TowerLevelEditor
                                  key={`${tower.id}-${level.level}`}
                                  level={level}
                                  edits={
                                    editedTowerLevels.get(`${tower.id}-${level.level}`) ?? {}
                                  }
                                  onChange={(field, value) =>
                                    handleTowerLevelChange(tower.id, level.level, field, value)
                                  }
                                />
                              ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'enemies' && (
              <div className="definitions-list">
                {enemies.map((enemy) => (
                  <EnemyEditor
                    key={enemy.id}
                    enemy={enemy}
                    edits={editedEnemies.get(enemy.id) ?? {}}
                    onChange={(field, value) => handleEnemyChange(enemy.id, field, value)}
                  />
                ))}
              </div>
            )}
          </div>

          {saveMessage && (
            <div
              className={`save-message ${saveMessage.includes('success') ? 'success' : 'error'}`}
            >
              {saveMessage}
            </div>
          )}
        </div>
      </div>
    </ScreenLayout>
  );
};
