// public/js/engine/aeonicLoom.js
const LOOM_STORAGE_KEY = 'amorvia:aeonic-loom:v1';

function nowISO() {
  return new Date().toISOString();
}

export function loadLoom() {
  try {
    const raw = window.localStorage.getItem(LOOM_STORAGE_KEY);
    if (!raw) {
      const fresh = {
        version: 1,
        createdAt: nowISO(),
        updatedAt: nowISO(),
        profile: {
          playerName: null,
          locale: navigator.language || 'en-US',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
        },
        sessions: [],
        scenarioStats: {},
        milestones: {}
      };
      window.localStorage.setItem(LOOM_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) {
      // simple forward-compat hook for future migrations
      parsed.version = 1;
    }
    return parsed;
  } catch (err) {
    console.error('[AeonicLoom] Failed to load; resetting.', err);
    const fresh = {
      version: 1,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      profile: {
        playerName: null,
        locale: navigator.language || 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
      },
      sessions: [],
      scenarioStats: {},
      milestones: {}
    };
    window.localStorage.setItem(LOOM_STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

function saveLoom(loom) {
  loom.updatedAt = nowISO();
  window.localStorage.setItem(LOOM_STORAGE_KEY, JSON.stringify(loom));
}

export function recordSessionStart(scenarioId, scenarioTitle, threadIds = []) {
  const loom = loadLoom();
  const sessionId = `sess-${nowISO()}`;

  loom.currentSession = {
    id: sessionId,
    scenarioId,
    scenarioTitle,
    threadIds,
    startedAt: nowISO(),
    stepsTaken: 0,
    actsVisited: []
  };

  // update scenarioStats.timesStarted
  if (!loom.scenarioStats[scenarioId]) {
    loom.scenarioStats[scenarioId] = {
      scenarioId,
      timesStarted: 0,
      timesCompleted: 0,
      lastPlayedAt: null,
      lastEndingType: null,
      bestTrust: null,
      lowestTension: null,
      lowestChildStress: null
    };
  }
  loom.scenarioStats[scenarioId].timesStarted += 1;

  saveLoom(loom);
}

export function recordStep(visitedActNumber = null) {
  const loom = loadLoom();
  if (!loom.currentSession) return;

  loom.currentSession.stepsTaken += 1;
  if (
    typeof visitedActNumber === 'number' &&
    !loom.currentSession.actsVisited.includes(visitedActNumber)
  ) {
    loom.currentSession.actsVisited.push(visitedActNumber);
  }

  saveLoom(loom);
}

export function recordSessionEnd({ scenarioId, metersEnd = null, endingType = null, endingNodeId = null }) {
  const loom = loadLoom();
  const session = loom.currentSession;

  if (!session || session.scenarioId !== scenarioId) {
    console.warn('[AeonicLoom] No matching currentSession for', scenarioId);
    return;
  }

  session.endedAt = nowISO();
  session.metersEnd = metersEnd;
  session.endingType = endingType;
  session.endingNodeId = endingNodeId;

  // move session into sessions[]
  loom.sessions.push(session);
  delete loom.currentSession;

  // update scenarioStats
  const stats = loom.scenarioStats[scenarioId] || {
    scenarioId,
    timesStarted: 0,
    timesCompleted: 0,
    lastPlayedAt: null,
    lastEndingType: null,
    bestTrust: null,
    lowestTension: null,
    lowestChildStress: null
  };

  stats.timesCompleted += 1;
  stats.lastPlayedAt = session.endedAt;
  stats.lastEndingType = endingType || stats.lastEndingType;

  if (metersEnd && typeof metersEnd === 'object') {
    if (typeof metersEnd.trust === 'number') {
      if (stats.bestTrust == null || metersEnd.trust > stats.bestTrust) {
        stats.bestTrust = metersEnd.trust;
      }
    }
    if (typeof metersEnd.tension === 'number') {
      if (stats.lowestTension == null || metersEnd.tension < stats.lowestTension) {
        stats.lowestTension = metersEnd.tension;
      }
    }
    if (typeof metersEnd.childStress === 'number') {
      if (stats.lowestChildStress == null || metersEnd.childStress < stats.lowestChildStress) {
        stats.lowestChildStress = metersEnd.childStress;
      }
    }
  }

  loom.scenarioStats[scenarioId] = stats;
  saveLoom(loom);
}

export function getThreadsWithProgress(v2Index, loomConfig) {
  const loom = loadLoom();

  const byId = {};
  for (const s of v2Index.scenarios) {
    byId[s.id] = s;
  }

  return loomConfig.threads.map(thread => {
    const scenarios = thread.scenarioIds
      .map(id => byId[id])
      .filter(Boolean);

    const total = scenarios.length;
    const completed = scenarios.filter(s => {
      const st = loom.scenarioStats[s.id];
      return st && st.timesCompleted > 0;
    }).length;

    return {
      ...thread,
      totalScenarios: total,
      completedScenarios: completed
    };
  });
}
