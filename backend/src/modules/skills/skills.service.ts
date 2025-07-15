import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SkillsService {
  // constructor(private _prisma: PrismaService) {}

  async getSkillTree(_petId: string) {
    // TODO: 实现获取技能树信息的逻辑
    throw new Error('Method not implemented.');
  }

  async getAvailableSkills(_petId: string) {
    // TODO: 实现获取可解锁技能的逻辑
    throw new Error('Method not implemented.');
  }

  async unlockSkill(_petId: string, _skillId: string) {
    // TODO: 实现解锁新技能的逻辑
    throw new Error('Method not implemented.');
  }

  async getCurrentAbilities(_petId: string) {
    // TODO: 实现获取当前能力的逻辑
    throw new Error('Method not implemented.');
  }
}