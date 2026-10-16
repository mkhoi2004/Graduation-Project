import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

export abstract class PasswordHasher {
  abstract compare(plainText: string, digest: string): Promise<boolean>;
  abstract hash(plainText: string): Promise<string>;
}

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  compare(plainText: string, digest: string): Promise<boolean> {
    return compare(plainText, digest);
  }

  hash(plainText: string): Promise<string> {
    return hash(plainText, 12);
  }
}
