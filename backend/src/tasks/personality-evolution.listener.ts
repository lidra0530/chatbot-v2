import { Injectable, Logger } from '@nestjs/common';
import { PersonalityEvolutionTask } from './personality-evolution.task';

@Injectable()
export class PersonalityEvolutionListener {
  private readonly logger = new Logger(PersonalityEvolutionListener.name);

  constructor(
    private readonly personalityEvolutionTask: PersonalityEvolutionTask
  ) {}

  async handleChatMessageCreated(payload: any) {
    try {
      this.logger.debug(`Handling chat message created event for pet ${payload.petId}`);
      
      const interactionData = {
        type: 'chat_message',
        content: payload.message,
        timestamp: new Date(),
        userId: payload.userId,
        context: {
          messageLength: payload.message.length,
          conversationId: payload.conversationId
        }
      };

      await this.personalityEvolutionTask.handleRealTimeEvolution(
        payload.petId,
        interactionData
      );

    } catch (error) {
      this.logger.error('Failed to handle chat message created event', error);
    }
  }

  async handlePetInteractionCreated(payload: any) {
    try {
      this.logger.debug(`Handling pet interaction created event for pet ${payload.petId}`);
      
      const interactionData = {
        type: payload.interactionType || 'general_interaction',
        content: payload.content,
        timestamp: new Date(),
        userId: payload.userId,
        context: payload.context || {}
      };

      await this.personalityEvolutionTask.handleRealTimeEvolution(
        payload.petId,
        interactionData
      );

    } catch (error) {
      this.logger.error('Failed to handle pet interaction created event', error);
    }
  }

  async handleBatchEvolutionCompleted(payload: any) {
    this.logger.log('Batch personality evolution completed', payload);
  }

  async handleBatchEvolutionFailed(payload: any) {
    this.logger.error('Batch personality evolution failed', payload);
  }

  async handleRealTimeEvolutionCompleted(payload: any) {
    this.logger.debug('Real-time personality evolution completed', payload);
  }

  async handleRealTimeEvolutionFailed(payload: any) {
    this.logger.error('Real-time personality evolution failed', payload);
  }
}