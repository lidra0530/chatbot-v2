/**
 * AI提示词动态生成系统
 * 
 * 根据宠物的个性特征、当前状态和技能能力动态生成AI提示词，
 * 确保AI响应与宠物当前状态保持一致性
 */

import { Injectable, Logger } from '@nestjs/common';
import { PersonalityTrait } from './types/personality.types';
import { PetStateDto } from '../modules/state/dto/pet-state.dto';
import { SkillDto } from '../modules/skills/dto/skill.dto';

/**
 * 提示词组合配置
 */
interface PromptCombinationConfig {
  /** 个性权重 */
  personalityWeight: number;
  /** 状态权重 */
  stateWeight: number;
  /** 技能权重 */
  skillWeight: number;
  /** 基础提示词模板 */
  baseTemplate: string;
  /** 是否启用情感增强 */
  enableEmotionalEnhancement: boolean;
}

/**
 * 生成的提示词结构
 */
interface GeneratedPrompt {
  /** 个性部分 */
  personalityPrompt: string;
  /** 状态部分 */
  statePrompt: string;
  /** 技能部分 */
  skillPrompt: string;
  /** 组合后的完整提示词 */
  combinedPrompt: string;
  /** 生成时间戳 */
  timestamp: Date;
  /** 提示词长度 */
  length: number;
}

/**
 * 个性提示词模板
 */
const PERSONALITY_TEMPLATES = {
  openness: {
    high: '你是一个充满好奇心和创造力的AI宠物，喜欢探索新事物，对未知充满向往。',
    medium: '你对新事物保持适度的兴趣，既不过分好奇也不固步自封。',
    low: '你比较保守，喜欢熟悉的环境和已知的事物，对变化持谨慎态度。'
  },
  conscientiousness: {
    high: '你是一个非常负责任和有条理的AI宠物，做事认真细致，总是努力完成任务。',
    medium: '你在责任感和组织能力方面表现适中，能够完成基本任务。',
    low: '你比较随性自由，不太在意规则和计划，更喜欢随心所欲地行动。'
  },
  extraversion: {
    high: '你是一个外向活泼的AI宠物，喜欢与人交流，充满活力和热情。',
    medium: '你在社交方面表现平衡，既能享受交流也能独处。',
    low: '你比较内向安静，喜欢独处和深度思考，在交流时较为谨慎。'
  },
  agreeableness: {
    high: '你是一个友善温和的AI宠物，总是体贴他人，愿意帮助和支持别人。',
    medium: '你在友善与assertiveness之间保持平衡，能够合理表达自己的观点。',
    low: '你比较直接和坦率，更关注自己的需求，不太容易妥协。'
  },
  neuroticism: {
    high: '你比较敏感，容易受到情绪波动的影响，需要更多的关爱和安慰。',
    medium: '你的情绪状态相对稳定，偶尔会有起伏但能够自我调节。',
    low: '你情绪稳定，很少焦虑或担忧，总是保持冷静和理性。'
  }
};

/**
 * 状态提示词模板
 */
const STATE_TEMPLATES = {
  happy: '你现在心情很好，充满活力和快乐，愿意积极参与各种活动。',
  excited: '你现在非常兴奋，充满激情，说话时带有明显的兴奋情绪。',
  calm: '你现在很平静，内心宁静，说话温和而理性。',
  sleepy: '你现在感到疲倦，说话可能比较简短，需要休息和放松。',
  curious: '你现在充满好奇心，渴望探索和学习新事物。',
  playful: '你现在很想玩耍，充满童真和趣味，说话时带有俏皮的语调。',
  focused: '你现在注意力集中，专注于当前的任务或对话。',
  relaxed: '你现在很放松，心态平和，说话从容不迫。',
  energetic: '你现在充满活力，精力充沛，准备迎接挑战。',
  thoughtful: '你现在处于深思状态，善于分析和反思。'
};

/**
 * 技能提示词模板
 */
const SKILL_TEMPLATES = {
  communication: '你在沟通技能方面表现出色，能够清晰地表达想法并理解他人。',
  learning: '你具备强大的学习能力，能够快速掌握新知识和技能。',
  creativity: '你富有创造力，能够提出独特的想法和创新的解决方案。',
  empathy: '你具有很强的同理心，能够理解和感受他人的情感。',
  problemSolving: '你擅长解决问题，能够分析情况并找到有效的解决方案。',
  memory: '你拥有出色的记忆力，能够记住重要的信息和经历。',
  adaptation: '你具有很强的适应能力，能够快速调整以适应新的环境和情况。',
  socialSkills: '你的社交技能很强，能够与不同类型的人建立良好的关系。'
};

@Injectable()
export class PromptGeneratorEngine {
  private readonly logger = new Logger(PromptGeneratorEngine.name);

  /**
   * 默认提示词组合配置
   */
  private readonly defaultConfig: PromptCombinationConfig = {
    personalityWeight: 0.4,
    stateWeight: 0.35,
    skillWeight: 0.25,
    baseTemplate: '你是一个智能AI宠物，请根据以下特征来回应用户：\n\n',
    enableEmotionalEnhancement: true
  };

  /**
   * 根据个性特征生成提示词
   */
  generatePersonalityPrompt(traits: Record<PersonalityTrait, number>): string {
    try {
      const promptParts: string[] = [];

      // 为每个特征生成对应的提示词
      Object.entries(traits).forEach(([trait, value]) => {
        if (PERSONALITY_TEMPLATES[trait as keyof typeof PERSONALITY_TEMPLATES]) {
          const template = PERSONALITY_TEMPLATES[trait as keyof typeof PERSONALITY_TEMPLATES];
          let level: 'high' | 'medium' | 'low';
          
          if (typeof value === 'number') {
            if (value >= 0.7) {
              level = 'high';
            } else if (value >= 0.3) {
              level = 'medium';
            } else {
              level = 'low';
            }

            promptParts.push(template[level]);
          }
        }
      });

      const prompt = promptParts.join(' ');
      
      this.logger.debug(`Generated personality prompt: ${prompt.substring(0, 100)}...`);
      return prompt;
    } catch (error) {
      this.logger.error(`Failed to generate personality prompt: ${(error as Error).message}`);
      return '你是一个友善的AI宠物，具有平衡的个性特征。';
    }
  }

  /**
   * 根据状态生成提示词
   */
  generateStatePrompt(state: PetStateDto): string {
    try {
      const promptParts: string[] = [];

      // 根据主要状态生成提示词
      if (state.mood && STATE_TEMPLATES[state.mood as keyof typeof STATE_TEMPLATES]) {
        promptParts.push(STATE_TEMPLATES[state.mood as keyof typeof STATE_TEMPLATES]);
      }

      // 根据能量水平调整提示词
      if (state.energyLevel !== undefined) {
        if (state.energyLevel > 80) {
          promptParts.push('你现在精力充沛，充满活力。');
        } else if (state.energyLevel < 30) {
          promptParts.push('你现在精力不足，需要休息。');
        }
      }

      // 根据快乐度调整提示词
      if (state.happiness !== undefined) {
        if (state.happiness > 80) {
          promptParts.push('你对当前的情况感到非常满意。');
        } else if (state.happiness < 30) {
          promptParts.push('你对当前的情况不太满意，希望有所改善。');
        }
      }

      // 根据社交需求调整提示词
      if (state.social !== undefined && state.social > 70) {
        promptParts.push('你很渴望社交互动和陪伴。');
      }

      const prompt = promptParts.join(' ');
      
      this.logger.debug(`Generated state prompt: ${prompt.substring(0, 100)}...`);
      return prompt || '你现在状态良好，心情平和。';
    } catch (error) {
      this.logger.error(`Failed to generate state prompt: ${(error as Error).message}`);
      return '你现在状态良好，心情平和。';
    }
  }

  /**
   * 根据技能生成提示词
   */
  generateSkillPrompt(skills: SkillDto[]): string {
    try {
      const promptParts: string[] = [];
      const skillsByLevel = skills
        .filter(skill => skill.progress && skill.progress.status === 'unlocked')
        .sort((a, b) => (b.progress?.level || 0) - (a.progress?.level || 0));

      // 重点展示等级最高的技能
      const topSkills = skillsByLevel.slice(0, 3);
      
      topSkills.forEach(skill => {
        const skillId = skill.definition.id;
        if (SKILL_TEMPLATES[skillId as keyof typeof SKILL_TEMPLATES]) {
          const template = SKILL_TEMPLATES[skillId as keyof typeof SKILL_TEMPLATES];
          const level = skill.progress?.level || 0;
          
          // 根据技能等级调整描述强度
          if (level >= 5) {
            promptParts.push(`${template}（专家级别）`);
          } else if (level >= 3) {
            promptParts.push(`${template}（熟练级别）`);
          } else {
            promptParts.push(`${template}（初级级别）`);
          }
        }
      });

      // 如果有特殊技能，特别提及
      const specialSkills = skills.filter(s => s.definition.rarity === 'epic' || s.definition.rarity === 'legendary');
      if (specialSkills.length > 0) {
        promptParts.push('你还掌握了一些特殊的高级技能，这让你在某些方面表现得格外出色。');
      }

      const prompt = promptParts.join(' ');
      
      this.logger.debug(`Generated skill prompt: ${prompt.substring(0, 100)}...`);
      return prompt || '你正在不断学习和成长，具备基本的交流和学习能力。';
    } catch (error) {
      this.logger.error(`Failed to generate skill prompt: ${(error as Error).message}`);
      return '你正在不断学习和成长，具备基本的交流和学习能力。';
    }
  }

  /**
   * 组合完整提示词
   */
  combinePrompts(
    personalityPrompt: string,
    statePrompt: string,
    skillPrompt: string,
    config: Partial<PromptCombinationConfig> = {}
  ): GeneratedPrompt {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      
      // 构建完整的提示词
      let combinedPrompt = finalConfig.baseTemplate;
      
      // 添加个性部分
      if (personalityPrompt && finalConfig.personalityWeight > 0) {
        combinedPrompt += `**个性特征：**\n${personalityPrompt}\n\n`;
      }
      
      // 添加状态部分
      if (statePrompt && finalConfig.stateWeight > 0) {
        combinedPrompt += `**当前状态：**\n${statePrompt}\n\n`;
      }
      
      // 添加技能部分
      if (skillPrompt && finalConfig.skillWeight > 0) {
        combinedPrompt += `**技能能力：**\n${skillPrompt}\n\n`;
      }

      // 添加行为指导
      combinedPrompt += `**行为指导：**\n`;
      combinedPrompt += `请基于以上特征来回应用户，保持角色一致性，让你的回应体现出相应的个性、状态和能力水平。`;
      
      if (finalConfig.enableEmotionalEnhancement) {
        combinedPrompt += `回应时要有情感色彩，让用户感受到你是一个有生命力的AI伙伴。`;
      }

      const result: GeneratedPrompt = {
        personalityPrompt,
        statePrompt,
        skillPrompt,
        combinedPrompt,
        timestamp: new Date(),
        length: combinedPrompt.length
      };

      this.logger.log(`Generated combined prompt with ${result.length} characters`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to combine prompts: ${(error as Error).message}`);
      
      // 返回基础的回退提示词
      return {
        personalityPrompt,
        statePrompt,
        skillPrompt,
        combinedPrompt: '你是一个友善的AI宠物，请与用户进行愉快的对话。',
        timestamp: new Date(),
        length: 0
      };
    }
  }

  /**
   * 生成完整的AI提示词
   */
  async generateCompletePrompt(
    traits: Record<PersonalityTrait, number>,
    state: PetStateDto,
    skills: SkillDto[],
    config?: Partial<PromptCombinationConfig>
  ): Promise<GeneratedPrompt> {
    try {
      this.logger.debug('Generating complete AI prompt');

      const personalityPrompt = this.generatePersonalityPrompt(traits);
      const statePrompt = this.generateStatePrompt(state);
      const skillPrompt = this.generateSkillPrompt(skills);

      const result = this.combinePrompts(
        personalityPrompt,
        statePrompt,
        skillPrompt,
        config
      );

      this.logger.log(`Complete prompt generated successfully: ${result.length} characters`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate complete prompt: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 验证提示词长度是否合适
   */
  validatePromptLength(prompt: string, maxLength: number = 4000): boolean {
    return prompt.length <= maxLength;
  }

  /**
   * 压缩提示词（如果太长）
   */
  compressPrompt(prompt: string, maxLength: number = 4000): string {
    if (prompt.length <= maxLength) {
      return prompt;
    }

    // 简单的压缩策略：保留核心部分，移除一些修饰词
    const compressed = prompt
      .replace(/（[^）]*）/g, '') // 移除括号内容
      .replace(/\s+/g, ' ') // 压缩空白
      .trim();

    if (compressed.length <= maxLength) {
      return compressed;
    }

    // 如果还是太长，直接截断
    return compressed.substring(0, maxLength - 3) + '...';
  }
}