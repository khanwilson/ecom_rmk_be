import { BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

export function parseObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch (error) {
    throw new BadRequestException(`Invalid id: ${id}; \n Error: ${error}`);
  }
}
