import { 
  AIRequestPayload, 
  GeneratedPlanResponse, 
  SocraticTurnResponse, 
  FeynmanEvaluationResponse, 
  GenerateQuizResponse, 
  GradeQuizResponse 
} from '@/types/ai';

function hasChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str || '');
}

export function simulateAIResponse(payload: AIRequestPayload): any {
  const { action, topic = 'Topic', userMessage = '', difficulty = 'Intermediate' } = payload;
  const isZh = hasChinese(topic) || hasChinese(userMessage) || hasChinese(payload.context || '');

  switch (action) {
    case 'generate-plan': {
      return simulatePlanGeneration(topic, difficulty, isZh);
    }
    case 'socratic-turn': {
      return simulateSocraticTurn(topic, userMessage, payload.history || [], isZh);
    }
    case 'evaluate-feynman': {
      return simulateFeynmanEvaluation(topic, userMessage, isZh);
    }
    case 'generate-quiz': {
      return simulateGenerateQuiz(topic, isZh);
    }
    case 'grade-quiz-answer': {
      return simulateGradeQuiz(topic, userMessage, payload.context || '', isZh);
    }
    default:
      return { reply: isZh ? `针对 ${topic} 的模拟回复` : `Simulated response for ${topic}` };
  }
}

function simulatePlanGeneration(
  topic: string, 
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  isZh: boolean = false
): GeneratedPlanResponse {
  if (isZh) {
    return {
      title: `深入掌握：${topic}`,
      description: `针对 ${topic} 打造的高效认知图谱，从第一性原理与心智模型出发，层层递进直达高阶实战。`,
      category: '计算机与认知工程',
      difficulty,
      targetDays: 14,
      milestones: [
        {
          title: `1. 核心心智模型与第一性原理：${topic}`,
          description: `建立基础认知图景，理解 ${topic} 为解决何种本质困境而生。`,
          estimatedMinutes: 45,
          concepts: [
            {
              name: `${topic} 的本质根源与演进`,
              summary: `传统方案在何种极端边界下失效，从而促使了 ${topic} 的诞生？`,
              keyPoints: [
                '历史背景与诞生动机',
                '核心架构假设与约束条件',
                '基础术语与心智模型比喻'
              ]
            },
            {
              name: `核心解构与关键基石`,
              summary: `拆解 ${topic} 的底层核心构件与数据交互流向。`,
              keyPoints: [
                '关键子系统与协议交互',
                '输入输出契约与不变量',
                '典型状态表示模型'
              ]
            }
          ]
        },
        {
          title: `2. 底层运行机制与状态流转`,
          description: `深入探讨内部生命周期、并发协同与一致性保证。`,
          estimatedMinutes: 60,
          concepts: [
            {
              name: `状态机演进与生命周期`,
              summary: `在标准运转与异常重试时，状态如何安全变更并保持同步？`,
              keyPoints: [
                '状态机转换逻辑与边界不变量',
                '节点协同与消息通信机制',
                '一致性边界与事务隔离'
              ]
            },
            {
              name: `架构权衡与性能特性`,
              summary: `深入剖析时间、空间、吞吐量与可用性之间的博弈与取舍。`,
              keyPoints: [
                '潜在性能瓶颈与优化手段',
                '分布式环境下的 CAP / PACELC 定理映射',
                '内存局部性与缓存友好设计'
              ]
            }
          ]
        },
        {
          title: `3. 边界异常、故障恢复与工程实战`,
          description: `通过极端边界、网络分区与生产故障场景压测你的理解深度。`,
          estimatedMinutes: 90,
          concepts: [
            {
              name: `典型故障模式与自愈策略`,
              summary: `当节点断连、时钟回拨或网络分区时，系统如何优雅降级？`,
              keyPoints: [
                '脑裂防御与 Quorum 多数派决议',
                '熔断、限流与背压传导',
                '故障自愈与状态对齐循环'
              ]
            },
            {
              name: `高可用生产架构与最佳实践`,
              summary: `在真实大规模业务场景下落地 ${topic} 的工程范式。`,
              keyPoints: [
                '可观测性、链路追踪与诊断指标',
                '安全隔离与访问边界',
                '平滑演进与灰度升级策略'
              ]
            }
          ]
        }
      ]
    };
  }

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

function simulateSocraticTurn(
  topic: string, 
  userMessage: string, 
  history: Array<{ role: string; content: string }>,
  isZh: boolean = false
): SocraticTurnResponse {
  const turnCount = history.filter(h => h.role === 'user').length;

  if (turnCount === 0 || !userMessage.trim()) {
    if (isZh) {
      return {
        reply: `我们来检验你对 **${topic}** 的直觉心智模型。\n\n首先请思考：如果有人问你，在现代工程系统中为什么必须引入 **${topic}**？它究竟解决了传统简单方案无法应对的什么**本质困境**？`,
        feedback: {
          score: 70,
          strengths: ['积极投入主动探究'],
          gaps: ['底层核心动机尚未展开'],
          coachNote: '请尝试从“如果没有它，系统会发生何种灾难”的角度切入。'
        },
        isSessionFinished: false
      };
    }

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
    if (isZh) {
      return {
        reply: `很好的切入点！你抓住了核心机制的主要目标。\n\n现在考虑一个关键的**架构权衡**：如果系统负载瞬间激增 10 倍，或者偶发出现毫秒级的网络抖动，**${topic}** 如何在不破坏正确性的前提下兼顾可用性？系统为此付出了什么代价？`,
        feedback: {
          score,
          strengths: ['指出了核心作用', '宏观认知清晰'],
          gaps: ['尚未展开极端压力下的行为'],
          coachNote: '现在深入思考边界条件与权衡取舍。'
        },
        isSessionFinished: false
      };
    }

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
    if (isZh) {
      return {
        reply: `分析得非常到位！\n\n让我们更进一步推进到真实工程场景：如果你正在指导一位初级工程师，他建议为了“简单起见”用一个简单的单点内存缓存或轮询脚本来替代 **${topic}**，你会指出这个替代方案中潜藏的哪一个**致命破绽**？`,
        feedback: {
          score: Math.min(98, score + 10),
          strengths: ['权衡利弊分明', '理解系统不变量'],
          gaps: ['竞态条件的细微边界'],
          coachNote: '你对工程现实有扎实的洞察。'
        },
        isSessionFinished: false
      };
    }

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

  if (isZh) {
    return {
      reply: `太棒了！你已经成功厘清了 **${topic}** 的本质原理、边界异常与架构深意。\n\n你现在已经建立起了多维立体的心智模型，完全具备将其实战落地或讲解给他人听的理解深度！`,
      feedback: {
        score: 95,
        strengths: ['系统性逻辑推演', '概念清晰透彻', '具备工程边界意识'],
        gaps: [],
        coachNote: '掌握程度已验证！你可以自信地应用并教授此知识。'
      },
      isSessionFinished: true
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

function simulateFeynmanEvaluation(topic: string, userMessage: string, isZh: boolean = false): FeynmanEvaluationResponse {
  const wordCount = userMessage.trim().length;
  const hasJargon = /(protocol|concurrency|abstraction|paradigm|synchronous|asynchronous|latency|throughput|协议|并发|抽象|异步|吞吐量|延迟|原子性)/i.test(userMessage);

  if (isZh) {
    return {
      score: wordCount > 40 ? 88 : 70,
      clarityRating: hasJargon ? '良好（含少量专业术语）' : '通俗透彻',
      strengths: [
        '从直观结果出发，阐述了事物运作的核心过程',
        '逻辑链条顺畅，具备因果关联'
      ],
      jargonOrVaguePhrases: hasJargon ? ['使用了部分专业术语，建议尝试用生活中的实体或生活经验替代'] : [],
      missedConnections: [
        `可以更明确地描述在 ${topic} 中，当发生变化时，参与各方是如何相互确认的。`
      ],
      suggestedAnalogy: `可以把 ${topic} 想象成“飞机场的塔台调度”：所有飞机（请求）不能私自协商通行，必须统一听从权威序列的指令，才能防止撞机（数据冲突）。`,
      challengeQuestion: `如果让你只用日常厨房里的锅碗瓢盆等工具，给一个 10 岁的小朋友演示 ${topic}，你会怎么做？`
    };
  }

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

function simulateGenerateQuiz(topic: string, isZh: boolean = false): GenerateQuizResponse {
  if (isZh) {
    return {
      topic,
      questions: [
        {
          id: 'q1',
          type: 'concept',
          question: `请阐述 **${topic}** 的核心工作机制：它向使用者提供了什么最关键的核心保证或价值？`,
          hint: `聚焦于它对外承诺的不变量（Invariants）与调用契约。`,
          sampleAnswerCriteria: `应包含核心不变量、确定性行为以及边界隔离。`
        },
        {
          id: 'q2',
          type: 'scenario',
          question: `假设你在一个高负载业务系统中落地了 **${topic}**，在业务高峰期发现延迟偶尔出现毛刺尖峰。你会优先排查哪一个环节或组件？为什么？`,
          hint: `思考排队延迟、资源竞争锁冲突或串行化瓶颈。`,
          sampleAnswerCriteria: `识别出资源竞争点、锁竞争瓶颈或未命中缓存的高昂回源代价。`
        },
        {
          id: 'q3',
          type: 'edge-case',
          question: `在维护或使用 **${topic}** 时，最危险的故障反模式（Anti-Pattern）是什么？如何设计防范措施？`,
          hint: `考虑雪崩穿透、级联超时或分布式脑裂。`,
          sampleAnswerCriteria: `强调故障检测机制、熔断降级、幂等设计或安全回滚。`
        }
      ]
    };
  }

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

function simulateGradeQuiz(topic: string, userMessage: string, context: string, isZh: boolean = false): GradeQuizResponse {
  const isDetailed = userMessage.trim().length > 30;

  if (isZh) {
    return {
      score: isDetailed ? 92 : 72,
      evaluation: isDetailed
        ? `回答非常扎实完整！准确指出了底层的因果根源，体现了清晰的实战分析能力。`
        : `方向正确的基础回答。如果能进一步补充具体的因果传导机制或量化依据，论述会更有说服力。`,
      strengths: [
        '把握住了核心机制的行为特点',
        '逻辑推演方向准确'
      ],
      missingElements: isDetailed ? [] : [
        '未明确提及重试放大或超时对下游系统造成的级联雪崩风险。'
      ],
      idealExplanation: `在 ${topic} 中，理想的处理方案强调确定性的异常捕获、明确的背压（Backpressure）机制和全链路指标监控，确保在突发超载时系统能自适应恢复。`,
      nextQuestionPrompt: `接下来，让我们探讨这会对整个系统的可用性造成何种长期影响。`
    };
  }

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
