import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetDto } from './dto/pet.dto';

@Injectable()
export class PetsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPetDto: CreatePetDto): Promise<PetDto> {
    const pet = await this.prisma.pet.create({
      data: {
        name: createPetDto.name,
        avatar: createPetDto.avatarUrl,
        userId,
        personality: createPetDto.personality || {
          traits: {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 30
          },
          evolutionHistory: [],
          evolutionRate: 1.0,
          lastEvolutionCheck: null
        },
        currentState: createPetDto.currentState || {
          basic: {
            mood: 70,
            energy: 80,
            hunger: 60,
            health: 90
          },
          advanced: {
            curiosity: 65,
            socialDesire: 55,
            creativity: 60,
            focusLevel: 70
          },
          lastUpdate: null,
          autoDecayEnabled: true,
          decayRates: {
            hunger: 0.5,
            energy: 0.3,
            mood: 0.1
          }
        },
        skills: createPetDto.skillTree || {
          totalExperience: 0,
          skillPoints: 0,
          categories: {
            knowledge: { level: 0, experience: 0, maxLevel: 10 },
            emotional: { level: 0, experience: 0, maxLevel: 10 },
            creative: { level: 0, experience: 0, maxLevel: 10 }
          }
        },
      },
    });

    return this.mapToDto(pet);
  }

  async findAllByUser(userId: string): Promise<PetDto[]> {
    const pets = await this.prisma.pet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return pets.map(pet => this.mapToDto(pet));
  }

  async findOne(userId: string, id: string): Promise<PetDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
    });

    if (!pet) {
      throw new NotFoundException('宠物不存在');
    }

    if (pet.userId !== userId) {
      throw new ForbiddenException('无权访问此宠物');
    }

    return this.mapToDto(pet);
  }

  async update(userId: string, id: string, updatePetDto: UpdatePetDto): Promise<PetDto> {
    await this.findOne(userId, id);

    const updatedPet = await this.prisma.pet.update({
      where: { id },
      data: {
        ...updatePetDto,
        updatedAt: new Date(),
      },
    });

    return this.mapToDto(updatedPet);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);

    await this.prisma.pet.delete({
      where: { id },
    });
  }

  private mapToDto(pet: any): PetDto {
    return {
      id: pet.id,
      name: pet.name,
      breed: pet.breed || 'AI助手',
      description: pet.description,
      avatarUrl: pet.avatar,
      level: pet.level,
      experience: pet.skills?.totalExperience || 0,
      personality: pet.personality,
      currentState: pet.currentState,
      skillTree: pet.skills || { unlockedSkills: [], availableSkills: [], skillPoints: 0 },
      evolutionStage: 'basic',
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    };
  }
}