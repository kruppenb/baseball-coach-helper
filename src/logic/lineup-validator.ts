import type { Lineup } from '../types/index.ts';
import type { GenerateLineupInput, ValidationError } from './lineup-types.ts';

export function validateLineup(
  _lineup: Lineup,
  _input: GenerateLineupInput,
): ValidationError[] {
  // TODO: implement validation rules
  return [];
}
