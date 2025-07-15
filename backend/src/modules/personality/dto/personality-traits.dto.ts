import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class PersonalityTraitsDto {
  @ApiProperty({ description: '友好度 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  friendliness!: number;

  @ApiProperty({ description: '活跃度 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  activeness!: number;

  @ApiProperty({ description: '好奇心 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  curiosity!: number;

  @ApiProperty({ description: '耐心 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  patience!: number;

  @ApiProperty({ description: '智慧 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  intelligence!: number;

  @ApiProperty({ description: '创造力 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  creativity!: number;

  @ApiProperty({ description: '忠诚度 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  loyalty!: number;

  @ApiProperty({ description: '独立性 (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  independence!: number;
}

export class UpdatePersonalityTraitsDto {
  @ApiProperty({ description: '友好度 (0-100)', minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  friendliness?: number;

  @ApiProperty({ description: '活跃度 (0-100)', minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  activeness?: number;

  @ApiProperty({ description: '好奇心 (0-100)', minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  curiosity?: number;

  @ApiProperty({ description: '耐心 (0-100)', minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  patience?: number;

  @ApiProperty({ description: '智慧 (0-100)', minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  intelligence?: number;

  @ApiProperty({ description: '创造力 (0-100)', minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  creativity?: number;

  @ApiProperty({ description: '忠诚度 (0-100)', minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  loyalty?: number;

  @ApiProperty({ description: '独立性 (0-100)', minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  independence?: number;
}