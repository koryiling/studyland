import { 
  AIRequestPayload, 
  GeneratedPlanResponse, 
  SocraticTurnResponse, 
  FeynmanEvaluationResponse, 
  GenerateQuizResponse, 
  GradeQuizResponse 
} from '@/types/ai';

export function simulateAIResponse(payload: AIRequestPayload): any {
  const { action, topic = 'Topic', userMessage = '', difficulty = 'Intermediate' } = payload;

  switch (action) {
    case 'generate-plan': {
      return simulatePlanGeneration(topic, difficulty);
    }
    case 'socratic-turn': {
      return simulateSocraticTurn(topic, userMessage, payload.history || []);
    }
    case 'evaluate-feynman': {
      return simulateFeynmanEvaluation(topic, userMessage);
    }
    case 'generate-quiz': {
      return simulateGenerateQuiz(topic);
    }
    case 'grade-quiz-answer': {
      return simulateGradeQuiz(topic, userMessage, payload.context || '');
    }
    default:
      return { reply: `Simulated response for ${topic}` };
  }
}

function simulatePlanGeneration(topic: string, difficulty: 'Beginner' | 'Intermediate' | 'Advanced'): GeneratedPlanResponse {
  return {
    title: `Mastering ${topic}`,
    description: `A comprehensive roadmap designed to take you from core mental models to advanced practical mastery of ${topic}.`,
    category: 'Computer Science & Engineering',
    difficulty,
    targetDays: 14,
    milestones: [
      {
        title: `1. Foundations & Mental Models of ${topic}`,
        description: `Establish core vocabulary, first principles, and understand why ${topic} exists.`,
        estimatedMinutes: 45,
        concepts: [
          {
            name: `First Principles of ${topic}`,
            summary: `What fundamental problem does ${topic} solve that previous approaches could not?`,
            keyPoints: [
              'Historical context and motivation',
              'Core architectural constraints and assumptions',
              'Key terminology and mental models'
            ]
          },
          {
            name: `Anatomy & Building Blocks`,
            summary: `Deconstructing the primary components and data flows.`,
            keyPoints: [
              'Essential sub-systems and protocols',
              'Input/Output contracts',
              'Common representations'
            ]
          }
        ]
      },
      {
        title: `2. Deep Dive & Core Mechanisms`,
        description: `Explore the internal engine, lifecycle events, and state transitions.`,
        estimatedMinutes: 60,
        concepts: [
          {
            name: `Internal State & Lifecycle`,
            summary: `How state evolves, synchronizes, and mutates under standard operating conditions.`,
            keyPoints: [
              'State machines and invariants',
              'Coordination and message passing',
              'Consistency boundaries'
            ]
          },
          {
            name: `Tradeoffs & Performance Characteristics`,
            summary: `Analyzing time, space, and algorithmic complexity tradeoffs.`,
            keyPoints: [
              'Bottlenecks and optimization strategies',
              'CAP / PACELC theorem implications if distributed',
              'Cache friendliness and memory efficiency'
            ]
          }
        ]
      },
      {
        title: `3. Edge Cases, Failures & Production Patterns`,
        description: `Stress-test your understanding with failure modes, concurrency, and real-world scenarios.`,
        estimatedMinutes: 90,
        concepts: [
          {
            name: `Failure Modes & Recovery Strategies`,
            summary: `What happens when things break, disconnect, or desynchronize?`,
            keyPoints: [
              'Network partitions and split-brain scenarios',
              'Graceful degradation and circuit breakers',
              'Self-healing and reconciliation loops'
            ]
          },
          {
            name: `Real-World Architecture & Best Practices`,
            summary: `Applying ${topic} in production environments at scale.`,
            keyPoints: [
              'Observability, telemetry, and debugging techniques',
              'Security postures and isolation boundaries',
              'Evolutionary migration patterns'
            ]
          }
        ]
      }
    ]
  };
}

function simulateSocraticTurn(topic: string, userMessage: string, history: Array<{ role: string; content: string }>): SocraticTurnResponse {
  const turnCount = history.filter(h => h.role === 'user').length;

  if (turnCount === 0 || !userMessage.trim()) {
    return {
      reply: `Let's test your mental model of **${topic}**. \n\nTo begin: Imagine someone asks you why **${topic}** is necessary in modern systems. What core problem does it solve that simpler alternatives fail at?`,
      feedback: {
        score: 70,
        strengths: ['Curiosity and willingness to explore'],
        gaps: ['Foundational intuition yet to be articulated'],
        coachNote: 'Be as specific as you can about the root motivation.'
      },
      isSessionFinished: false
    };
  }

  const length = userMessage.trim().length;
  const score = Math.min(95, Math.max(50, 60 + Math.floor(length / 8)));

  if (turnCount === 1) {
    return {
      reply: `Good intuition! You highlighted the key reason behind it.\n\nNow consider an interesting tradeoff: What happens if the system load suddenly spikes by 10x or a network delay is introduced? How does **${topic}** maintain correctness without sacrificing availability?`,
      feedback: {
        score,
        strengths: ['Identified primary purpose', 'Clear high-level grasp'],
        gaps: ['Has not yet analyzed behavior under stress'],
        coachNote: 'Now push into edge cases and trade-offs.'
      },
      isSessionFinished: false
    };
  }

  if (turnCount === 2) {
    return {
      reply: `Spot on analysis of the tradeoffs! \n\nLet's take it one step further into real-world application: If you were mentoring a junior engineer who wanted to replace this with an in-memory cache or a quick script, what fatal flaw would you warn them about?`,
      feedback: {
        score: Math.min(98, score + 10),
        strengths: ['Good balance of tradeoffs', 'Understands system invariants'],
        gaps: ['Subtle race condition nuances'],
        coachNote: 'You have solid grasp of the operational realities.'
      },
      isSessionFinished: false
    };
  }

  return {
    reply: `Outstanding work! You've successfully navigated the core principle, failure modes, and architectural implications of **${topic}**.\n\nYou now have a robust, multi-dimensional mental model of this subject. You are ready to tackle practical implementation or move to the next milestone!`,
    feedback: {
      score: 95,
      strengths: ['Systematic reasoning', 'Deep conceptual clarity', 'Awareness of operational constraints'],
      gaps: [],
      coachNote: 'Mastery verified! You can confidently explain and apply this.'
    },
    isSessionFinished: true
  };
}

function simulateFeynmanEvaluation(topic: string, userMessage: string): FeynmanEvaluationResponse {
  const wordCount = userMessage.trim().split(/\s+/).length;
  const hasJargon = /(protocol|concurrency|abstraction|paradigm|synchronous|asynchronous|latency|throughput)/i.test(userMessage);

  return {
    score: wordCount > 30 ? 88 : 68,
    clarityRating: hasJargon ? 'Good with minor gaps' : 'Crystal Clear',
    strengths: [
      'Grasped the functional outcome from a user perspective',
      'Logical flow from problem to resolution'
    ],
    jargonOrVaguePhrases: hasJargon ? ['Relied on technical buzzwords without defining the underlying physical metaphor'] : [],
    missedConnections: [
      `Could more explicitly connect how state transition triggers the feedback loop in ${topic}`
    ],
    suggestedAnalogy: `Think of ${topic} like an air traffic control tower: rather than planes negotiating directly with each other (which causes chaos), all movement requests are coordinated through an authoritative sequence.`,
    challengeQuestion: `If you had to explain ${topic} to a 10-year-old using only everyday household objects, how would you describe it?`
  };
}

function simulateGenerateQuiz(topic: string): GenerateQuizResponse {
  return {
    topic,
    questions: [
      {
        id: 'q1',
        type: 'concept',
        question: `Define the core mechanism of **${topic}**. What primary guarantee or benefit does it provide?`,
        hint: `Focus on the exact guarantee it gives to callers or consumers.`,
        sampleAnswerCriteria: `Should mention core invariants, predictable behavior, and boundary isolation.`
      },
      {
        id: 'q2',
        type: 'scenario',
        question: `Suppose you are designing a high-traffic system that utilizes **${topic}**. You notice intermittent latency spikes during peak hours. What component or path would you inspect first, and why?`,
        hint: `Think about queuing delays, contention, or serialization bottlenecks.`,
        sampleAnswerCriteria: `Identifies contention points, locks/synchronization bottlenecks, or unindexed lookups.`
      },
      {
        id: 'q3',
        type: 'edge-case',
        question: `What is the most dangerous failure mode or anti-pattern when working with **${topic}**, and how do you protect against it?`,
        hint: `Consider silent data corruption, cascading timeouts, or split-brain.`,
        sampleAnswerCriteria: `Highlights failure detection, circuit breaking, idempotency, or fail-safe rollbacks.`
      }
    ]
  };
}

function simulateGradeQuiz(topic: string, userMessage: string, context: string): GradeQuizResponse {
  const isDetailed = userMessage.trim().length > 50;

  return {
    score: isDetailed ? 90 : 72,
    evaluation: isDetailed 
      ? `Strong, comprehensive response! You correctly addressed the underlying mechanical cause and demonstrated clear practical awareness.`
      : `Good foundational start. You pointed in the right direction, but adding specific causal mechanisms would strengthen your explanation.`,
    strengths: [
      'Understands the primary behavior',
      'Accurate directional reasoning'
    ],
    missingElements: isDetailed ? [] : [
      'Did not specify how timeout or retry amplification impacts downstream dependencies.'
    ],
    idealExplanation: `In ${topic}, the ideal approach prioritizes deterministic failure handling, clear backpressure, and observable telemetry so recovery is predictable under unexpected load.`,
    nextQuestionPrompt: `Next, let's explore how this impacts overall system availability.`
  };
}
