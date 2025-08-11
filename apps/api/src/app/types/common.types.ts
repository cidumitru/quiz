import {Request} from '@nestjs/common';
import {User} from '../entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user: User;
}

// Database raw query result types
export interface QuestionCountRawResult {
  q_questionBankId: string;
  count: string;
}


export interface QuestionCountMap {
  [questionBankId: string]: number;
}
