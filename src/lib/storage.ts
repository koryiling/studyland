import { StudyPlan, UserSettings, QuestioningSession, KnowledgeGap, StudyStats } from '@/types/study';

const STORAGE_KEYS = {
  PLANS: 'studyland_plans_v1',
  SETTINGS: 'studyland_settings_v1',
  SESSIONS: 'studyland_sessions_v1',
  GAPS: 'studyland_gaps_v1',
  STATS: 'studyland_stats_v1',
};

export const DEFAULT_SETTINGS: UserSettings = {
  provider: 'demo',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  dailyGoalMinutes: 30,
  streakDays: 3,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

export const SEED_PLANS: StudyPlan[] = [
  {
    id: 'seed-plan-1',
    title: 'System Design & Distributed Systems',
    description: 'Master high-scale architectures, consensus algorithms, caching trade-offs, and fault tolerance through Socratic drills.',
    category: 'Computer Science',
    difficulty: 'Intermediate',
    status: 'active',
    targetDays: 21,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [
      {
        id: 'm1-1',
        title: 'CAP Theorem, PACELC & Consistency Models',
        description: 'Understand why you cannot have both strong consistency and partition tolerance in networks, and how modern databases make tradeoffs.',
        order: 1,
        status: 'mastered',
        estimatedMinutes: 45,
        concepts: [
          {
            id: 'c1-1-1',
            name: 'Linearizability vs Eventual Consistency',
            summary: 'Understanding total order of operations vs eventual convergence of state across distributed nodes.',
            keyPoints: [
              'Linearizability provides illusion of a single global copy',
              'Eventual consistency permits stale reads for high availability',
              'Vector clocks and CRDTs for conflict resolution'
            ],
            masteryScore: 92,
            lastReviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'c1-1-2',
            name: 'PACELC Theorem Invariants',
            summary: 'Extending CAP theorem to normal operation: Partition ? Availability / Consistency : Else Latency / Consistency.',
            keyPoints: [
              'Latency tradeoffs occur even without network partitions',
              'Dynamo-style quorum reads/writes: R + W > N'
            ],
            masteryScore: 85,
            lastReviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'm1-2',
        title: 'Caching Strategies & Cache Invalidation',
        description: 'Explore Write-Through, Write-Behind, Cache-Aside, and mitigating cache stampedes/penetration.',
        order: 2,
        status: 'in-progress',
        estimatedMinutes: 60,
        concepts: [
          {
            id: 'c1-2-1',
            name: 'Cache Invalidation & Thundering Herd',
            summary: 'Why cache invalidation is one of the hardest problems in CS and how to prevent thousands of simultaneous database queries on key expiration.',
            keyPoints: [
              'Mutual exclusion mutex locks on cache misses',
              'Probabilistic early expiration (XFetch algorithm)',
              'Cache warming and staggered TTLs'
            ],
            masteryScore: 68,
            lastReviewedAt: new Date().toISOString()
          },
          {
            id: 'c1-2-2',
            name: 'Bloom Filters for Cache Penetration',
            summary: 'Using space-efficient probabilistic data structures to reject queries for non-existent IDs before hitting database.',
            keyPoints: [
              'False positives possible, false negatives impossible',
              'Optimal number of hash functions calculation'
            ],
            masteryScore: 40
          }
        ]
      },
      {
        id: 'm1-3',
        title: 'Distributed Consensus & Raft Protocol',
        description: 'How nodes agree on values in an untrusted network with crash-recovery failures.',
        order: 3,
        status: 'todo',
        estimatedMinutes: 90,
        concepts: [
          {
            id: 'c1-3-1',
            name: 'Raft Leader Election & Term Numbers',
            summary: 'Heartbeat timers, randomized election timeouts, and majority quorum voting.',
            keyPoints: [
              'Randomized timeouts prevent split votes',
              'Candidate step-down on encountering higher term'
            ],
            masteryScore: 0
          },
          {
            id: 'c1-3-2',
            name: 'Log Replication & Safety Invariant',
            summary: 'Leader append-only log, follower replication, and log matching property.',
            keyPoints: [
              'Committing log entries once replicated to majority',
              'Leader never overwrites its own log'
            ],
            masteryScore: 0
          }
        ]
      }
    ]
  },
  {
    id: 'seed-plan-2',
    title: 'Deep Learning & Transformer Architecture',
    description: 'Build an intuitive first-principles understanding of attention, self-attention mechanisms, and positional encoding.',
    category: 'Artificial Intelligence',
    difficulty: 'Advanced',
    status: 'active',
    targetDays: 14,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [
      {
        id: 'm2-1',
        title: 'Query, Key, Value & Scaled Dot-Product Attention',
        description: 'The mathematical and intuitive foundation of the Attention mechanism in modern LLMs.',
        order: 1,
        status: 'in-progress',
        estimatedMinutes: 60,
        concepts: [
          {
            id: 'c2-1-1',
            name: 'Q, K, V Mental Model',
            summary: 'Think of Query as a search query, Key as video titles in a database, and Value as the actual video content.',
            keyPoints: [
              'Soft lookup via dot product similarity',
              'Softmax normalization creates probability distribution',
              'Scaling by sqrt(d_k) prevents vanishing gradients'
            ],
            masteryScore: 78,
            lastReviewedAt: new Date().toISOString()
          }
        ]
      }
    ]
  }
];

export const SEED_GAPS: KnowledgeGap[] = [
  {
    id: 'gap-1',
    topic: 'System Design',
    concept: 'Cache Stampede Mitigation',
    notes: 'Struggled to articulate the difference between probabilistic early expiration and distributed mutex locking.',
    severity: 'medium',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    resolved: false
  },
  {
    id: 'gap-2',
    topic: 'Distributed Systems',
    concept: 'PACELC Theorem',
    notes: 'Forgot what "E" stands for (Else: when no partition exists, tradeoff is between Latency and Consistency).',
    severity: 'low',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    resolved: true
  }
];

// Helper to safely access localStorage (client-side only)
function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function loadPlans(): StudyPlan[] {
  if (!isClient()) return SEED_PLANS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLANS);
    if (!raw) {
      savePlans(SEED_PLANS);
      return SEED_PLANS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading plans from localStorage:', err);
    return SEED_PLANS;
  }
}

export function savePlans(plans: StudyPlan[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
  } catch (err) {
    console.error('Error saving plans:', err);
  }
}

export function loadSettings(): UserSettings {
  if (!isClient()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error loading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

export function loadSessions(): QuestioningSession[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error loading sessions:', err);
    return [];
  }
}

export function saveSessions(sessions: QuestioningSession[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

export function loadGaps(): KnowledgeGap[] {
  if (!isClient()) return SEED_GAPS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAPS);
    if (!raw) {
      saveGaps(SEED_GAPS);
      return SEED_GAPS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading gaps:', err);
    return SEED_GAPS;
  }
}

export function saveGaps(gaps: KnowledgeGap[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.GAPS, JSON.stringify(gaps));
  } catch (err) {
    console.error('Error saving gaps:', err);
  }
}

export function calculateStats(plans: StudyPlan[], sessions: QuestioningSession[]): StudyStats {
  let completedMilestones = 0;
  let totalConcepts = 0;
  let totalScore = 0;

  plans.forEach(plan => {
    plan.milestones.forEach(m => {
      if (m.status === 'mastered') {
        completedMilestones++;
      }
      m.concepts.forEach(c => {
        totalConcepts++;
        totalScore += c.masteryScore || 0;
      });
    });
  });

  const totalQuestionsAnswered = sessions.reduce((acc, s) => {
    return acc + s.turns.filter(t => t.role === 'user').length;
  }, 0);

  const averageMasteryScore = totalConcepts > 0 ? Math.round(totalScore / totalConcepts) : 75;

  return {
    totalPlans: plans.length,
    completedMilestones,
    totalQuestionsAnswered: totalQuestionsAnswered || 14,
    averageMasteryScore,
    totalStudyMinutes: completedMilestones * 45 + totalQuestionsAnswered * 5,
    activeStreak: 3
  };
}

export function exportBackupData(): string {
  if (!isClient()) return '{}';
  const data = {
    plans: loadPlans(),
    settings: loadSettings(),
    sessions: loadSessions(),
    gaps: loadGaps(),
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonStr: string): boolean {
  if (!isClient()) return false;
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.plans) savePlans(parsed.plans);
    if (parsed.settings) saveSettings(parsed.settings);
    if (parsed.sessions) saveSessions(parsed.sessions);
    if (parsed.gaps) saveGaps(parsed.gaps);
    return true;
  } catch (err) {
    console.error('Failed to import backup data:', err);
    return false;
  }
}
