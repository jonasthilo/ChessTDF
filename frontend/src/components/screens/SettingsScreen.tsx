import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameApi } from '../../services/gameApi';
import { ScreenLayout } from '../common/ScreenLayout';
import { ConfirmModal } from '../common/ConfirmModal';
import { getTowerImage, getEnemyImage } from '../../utils/pieceAssets';
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

type AdvancedTab = 'gameModes' | 'towers' | 'towerLevels' | 'enemies';

export const SettingsScreen = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<GameSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdvancedTab>('gameModes');
  const [towers, setTowers] = useState<TowerDefinitionWithLevels[]>([]);
  const [enemies, setEnemies] = useState<EnemyDefinition[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Selector state per tab
  const [selectedSettingId, setSelectedSettingId] = useState<number | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  const [selectedTowerForLevels, setSelectedTowerForLevels] = useState<number | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<number | null>(null);

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

  // Auto-dismiss save message after 3 seconds
  useEffect(() => {
    if (saveMessage?.type === 'success') {
      saveTimerRef.current = setTimeout(() => setSaveMessage(null), 3000);
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      };
    }
  }, [saveMessage]);

  const getDirtyCategories = useCallback((): string[] => {
    const categories: string[] = [];
    if (editedSettings.size > 0) categories.push('Game Modes');
    if (editedTowers.size > 0) categories.push('Towers');
    if (editedTowerLevels.size > 0) categories.push('Tower Levels');
    if (editedEnemies.size > 0) categories.push('Enemies');
    return categories;
  }, [editedSettings, editedTowers, editedTowerLevels, editedEnemies]);

  const handleBack = () => {
    if (getDirtyCategories().length > 0) {
      setShowBackConfirm(true);
    } else {
      navigate('/');
    }
  };

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

      // Auto-select first item in each category
      if (allSettings.length > 0 && allSettings[0]?.id != null) {
        setSelectedSettingId(allSettings[0].id);
      }
      if (towersData.length > 0) {
        setSelectedTowerId(towersData[0]?.id ?? null);
        setSelectedTowerForLevels(towersData[0]?.id ?? null);
      }
      if (enemiesData.length > 0) {
        setSelectedEnemyId(enemiesData[0]?.id ?? null);
      }
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

    const savedCategories = getDirtyCategories();

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
      setSaveMessage({
        text: `${savedCategories.join(', ')} saved successfully`,
        type: 'success',
      });
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
      setSaveMessage({ text: errorMessage, type: 'error' });
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
        className="btn btn-dark"
        onClick={handleSaveAll}
        disabled={saving || !hasUnsavedChanges}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button className="btn btn-dark" onClick={handleBack}>
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

  const selectedSetting = settings.find((s) => s.id === selectedSettingId);
  const selectedTower = towers.find((t) => t.id === selectedTowerId);
  const selectedTowerLevels = towers.find((t) => t.id === selectedTowerForLevels);
  const selectedEnemy = enemies.find((e) => e.id === selectedEnemyId);

  return (
    <ScreenLayout className="settings-screen" navCenter={navCenter} navRight={navRight}>
      <div className="screen-body">
        <div className="settings-panel">
          <div className="advanced-tabs">
            <button
              className={`btn btn-dark btn-sm tab-button ${activeTab === 'gameModes' ? 'active' : ''}`}
              onClick={() => setActiveTab('gameModes')}
            >
              Game Modes
            </button>
            <button
              className={`btn btn-dark btn-sm tab-button ${activeTab === 'towers' ? 'active' : ''}`}
              onClick={() => setActiveTab('towers')}
            >
              Towers
            </button>
            <button
              className={`btn btn-dark btn-sm tab-button ${activeTab === 'towerLevels' ? 'active' : ''}`}
              onClick={() => setActiveTab('towerLevels')}
            >
              Tower Levels
            </button>
            <button
              className={`btn btn-dark btn-sm tab-button ${activeTab === 'enemies' ? 'active' : ''}`}
              onClick={() => setActiveTab('enemies')}
            >
              Enemies
            </button>
          </div>

          <div className="advanced-content">
            {activeTab === 'gameModes' && (
              <div className="selector-detail-layout">
                <div className="item-selector">
                  {settings.map((setting) => (
                    <button
                      key={setting.id}
                      className={`btn btn-dark btn-sm selector-button ${selectedSettingId === setting.id ? 'active' : ''}`}
                      onClick={() => setSelectedSettingId(setting.id ?? null)}
                    >
                      {setting.mode.charAt(0).toUpperCase() + setting.mode.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="detail-panel">
                  {selectedSetting ? (
                    <SettingsEditor
                      setting={selectedSetting}
                      edits={editedSettings.get(selectedSetting.id ?? 0) ?? {}}
                      onChange={(field, value) =>
                        handleSettingsChange(selectedSetting.id ?? 0, field, value)
                      }
                    />
                  ) : (
                    <div className="detail-empty">Select a game mode</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'towers' && (
              <div className="selector-detail-layout">
                <div className="item-selector">
                  {towers.map((tower) => (
                    <button
                      key={tower.id}
                      className={`btn btn-dark btn-sm selector-button ${selectedTowerId === tower.id ? 'active' : ''}`}
                      onClick={() => setSelectedTowerId(tower.id)}
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

                <div className="detail-panel">
                  {selectedTower ? (
                    <TowerEditor
                      tower={selectedTower}
                      edits={editedTowers.get(selectedTower.id) ?? {}}
                      onChange={(field, value) =>
                        handleTowerChange(selectedTower.id, field, value)
                      }
                    />
                  ) : (
                    <div className="detail-empty">Select a tower</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'towerLevels' && (
              <div className="selector-detail-layout">
                <div className="item-selector">
                  {towers.map((tower) => (
                    <button
                      key={tower.id}
                      className={`btn btn-dark btn-sm selector-button ${selectedTowerForLevels === tower.id ? 'active' : ''}`}
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

                <div className="detail-panel-scroll">
                  {selectedTowerLevels ? (
                    <>
                      <h3>
                        {selectedTowerLevels.name} Levels (Max: {selectedTowerLevels.maxLevel})
                      </h3>
                      <div className="levels-list">
                        {selectedTowerLevels.levels
                          .filter((level) => level.level <= selectedTowerLevels.maxLevel)
                          .sort((a, b) => a.level - b.level)
                          .map((level) => (
                            <TowerLevelEditor
                              key={`${selectedTowerLevels.id}-${level.level}`}
                              level={level}
                              edits={
                                editedTowerLevels.get(
                                  `${selectedTowerLevels.id}-${level.level}`
                                ) ?? {}
                              }
                              onChange={(field, value) =>
                                handleTowerLevelChange(
                                  selectedTowerLevels.id,
                                  level.level,
                                  field,
                                  value
                                )
                              }
                            />
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="detail-empty">Select a tower type</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'enemies' && (
              <div className="selector-detail-layout">
                <div className="item-selector">
                  {enemies.map((enemy) => (
                    <button
                      key={enemy.id}
                      className={`btn btn-dark btn-sm selector-button ${selectedEnemyId === enemy.id ? 'active' : ''}`}
                      onClick={() => setSelectedEnemyId(enemy.id)}
                    >
                      <img
                        src={getEnemyImage(enemy.id)}
                        alt={enemy.name}
                        className="piece-icon-small"
                      />
                      {enemy.name}
                    </button>
                  ))}
                </div>

                <div className="detail-panel">
                  {selectedEnemy ? (
                    <EnemyEditor
                      enemy={selectedEnemy}
                      edits={editedEnemies.get(selectedEnemy.id) ?? {}}
                      onChange={(field, value) =>
                        handleEnemyChange(selectedEnemy.id, field, value)
                      }
                    />
                  ) : (
                    <div className="detail-empty">Select an enemy</div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {saveMessage && (
          <div className={`save-message ${saveMessage.type}`}>
            {saveMessage.text}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showBackConfirm}
        title="Unsaved Changes"
        message={`You have unsaved changes in: ${getDirtyCategories().join(', ')}. Discard changes and go back?`}
        cancelLabel="Stay"
        confirmLabel="Discard"
        onCancel={() => setShowBackConfirm(false)}
        onConfirm={() => {
          setShowBackConfirm(false);
          navigate('/');
        }}
      />
    </ScreenLayout>
  );
};
