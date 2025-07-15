import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PersonalityTraitsDto } from './personality-traits.dto';

export class PersonalityEvolutionDto {
  @ApiProperty({ description: '演化记录ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '演化前的个性特质', type: PersonalityTraitsDto })
  @IsObject()
  @Type(() => PersonalityTraitsDto)
  previousTraits!: PersonalityTraitsDto;

  @ApiProperty({ description: '演化后的个性特质', type: PersonalityTraitsDto })
  @IsObject()
  @Type(() => PersonalityTraitsDto)
  newTraits!: PersonalityTraitsDto;

  @ApiProperty({ description: '触发演化的互动类型' })
  @IsString()
  triggerType!: string;

  @ApiProperty({ description: '演化的详细描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '演化时间' })
  @IsDate()
  @Type(() => Date)
  evolutionTime!: Date;

  @ApiProperty({ description: '互动上下文数据', required: false })
  @IsOptional()
  @IsObject()
  interactionContext?: Record<string, any>;
}

export class CreatePersonalityEvolutionDto {
  @ApiProperty({ description: '宠物ID' })
  @IsString()
  petId!: string;

  @ApiProperty({ description: '演化前的个性特质', type: PersonalityTraitsDto })
  @IsObject()
  @Type(() => PersonalityTraitsDto)
  previousTraits!: PersonalityTraitsDto;

  @ApiProperty({ description: '演化后的个性特质', type: PersonalityTraitsDto })
  @IsObject()
  @Type(() => PersonalityTraitsDto)
  newTraits!: PersonalityTraitsDto;

  @ApiProperty({ description: '触发演化的互动类型' })
  @IsString()
  triggerType!: string;

  @ApiProperty({ description: '演化的详细描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '互动上下文数据', required: false })
  @IsOptional()
  @IsObject()
  interactionContext?: Record<string, any>;
}