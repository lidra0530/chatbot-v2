import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetDto } from './dto/pet.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('pets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  @ApiOperation({ summary: '创建新宠物' })
  @ApiResponse({ status: 201, description: '宠物创建成功', type: PetDto })
  async create(
    @CurrentUser() userId: string,
    @Body() createPetDto: CreatePetDto,
  ): Promise<PetDto> {
    return this.petsService.create(userId, createPetDto);
  }

  @Get()
  @ApiOperation({ summary: '获取用户所有宠物' })
  @ApiResponse({ status: 200, description: '获取成功', type: [PetDto] })
  async findAllByUser(@CurrentUser() userId: string): Promise<PetDto[]> {
    return this.petsService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取宠物详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: PetDto })
  async findOne(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<PetDto> {
    return this.petsService.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新宠物信息' })
  @ApiResponse({ status: 200, description: '更新成功', type: PetDto })
  async update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() updatePetDto: UpdatePetDto,
  ): Promise<PetDto> {
    return this.petsService.update(userId, id, updatePetDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除宠物' })
  @ApiResponse({ status: 204, description: '删除成功' })
  async remove(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.petsService.remove(userId, id);
  }
}