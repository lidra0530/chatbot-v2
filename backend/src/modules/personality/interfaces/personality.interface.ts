export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  [key: string]: number;
}

export interface PersonalityEvolutionLog {
  id: string;
  petId: string;
  oldTraits: PersonalityTraits;
  newTraits: PersonalityTraits;
  trigger: string;
  metadata: any;
  createdAt: Date;
}

export interface PersonalityAnalytics {
  trends: {
    [key: string]: {
      direction: 'increasing' | 'decreasing' | 'stable';
      changeRate: number;
      significance: number;
    };
  };
  stability: {
    overall: number;
    individual: {
      [key: string]: number;
    };
  };
  patterns: {
    type: string;
    frequency: number;
    impact: number;
  }[];
  recommendations: {
    type: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
  }[];
}

export interface EvolutionSettings {
  enabled: boolean;
  evolutionRate: number;
  stabilityThreshold: number;
  maxDailyChange: number;
  maxWeeklyChange: number;
  maxMonthlyChange: number;
  traitLimits: {
    [key: string]: {
      min: number;
      max: number;
    };
  };
  triggers: {
    [key: string]: {
      enabled: boolean;
      weight: number;
    };
  };
}