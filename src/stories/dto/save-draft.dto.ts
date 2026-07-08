import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class SaveDraftDto {
  @ApiProperty({
    example: {
      title: 'My Story',
      description: 'A draft...',
      pov: 'first_person',
      characterIds: [1, 2],
      step: 3
    }
  })
  @IsNotEmpty()
  @IsObject()
  draftData: Record<string, any>; // JSON object with all form data
}
