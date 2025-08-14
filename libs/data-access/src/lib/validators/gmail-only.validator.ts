import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsGmailOnlyConstraint implements ValidatorConstraintInterface {
  validate(email: string): boolean {
    if (!email) return false;
    const emailLower = email.toLowerCase().trim();
    return (
      emailLower.endsWith('@gmail.com') ||
      emailLower.endsWith('@googlemail.com')
    );
  }

  defaultMessage(): string {
    return 'Only Gmail accounts (@gmail.com) are allowed for registration';
  }
}

export function IsGmailOnly(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsGmailOnlyConstraint,
    });
  };
}
