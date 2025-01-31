import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

interface PasswordCriterion {
  message: string;
  isMet: boolean;
}

interface PasswordCriteria {
  [key: string]: boolean;
}

export enum PasswordRequirement {
  UpperCase = 'hasUpperCase',
  LowerCase = 'hasLowerCase',
  Number = 'hasNumber',
  SpecialChar = 'hasSpecialCharacter',
}

export interface ValidationErrorResponse {
  message: string;
  status: number;
  errorDetails: {
    kind: 'validation';
    failed_requirements: {
      [K in PasswordRequirement]?: string;
    };
    fulfilled_requirements: {
      [K in PasswordRequirement]?: string;
    };
  };
}

interface PasswordValidationResult {
  isValid: boolean;
  criteria: {
    [K in PasswordRequirement]: PasswordCriterion;
  };
  errorDetail?: string;
  failedRequirements: {
    [K in PasswordRequirement]?: string;
  };
  fulfilledRequirements: {
    [K in PasswordRequirement]?: string;
  };
}

@ValidatorConstraint({ async: false })
class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  private lastValidationResult: PasswordValidationResult | null = null;

  public static criteriaPatterns: { [K in PasswordRequirement]: RegExp } = {
    [PasswordRequirement.UpperCase]: /[A-Z]/,
    [PasswordRequirement.LowerCase]: /[a-z]/,
    [PasswordRequirement.Number]: /[0-9]/,
    [PasswordRequirement.SpecialChar]: /[!@#$%^&*(),.?":{}|<>]/,
  };

  public static criteriaMessages: { [K in PasswordRequirement]: string } = {
    [PasswordRequirement.UpperCase]: 'A capital (uppercase) letter',
    [PasswordRequirement.LowerCase]: 'A lowercase letter',
    [PasswordRequirement.Number]: 'A number',
    [PasswordRequirement.SpecialChar]:
      'A special character (!@#$%^&*(),.?":{}|<>)',
  };

  private getCriteriaMessages(criteria: PasswordCriteria): {
    fulfilled: { [K in PasswordRequirement]?: string };
    failed: { [K in PasswordRequirement]?: string };
  } {
    const fulfilled: { [K in PasswordRequirement]?: string } = {};
    const failed: { [K in PasswordRequirement]?: string } = {};

    (Object.keys(criteria) as PasswordRequirement[]).forEach((key) => {
      if (criteria[key]) {
        fulfilled[key] = IsStrongPasswordConstraint.criteriaMessages[key];
      } else {
        failed[key] = IsStrongPasswordConstraint.criteriaMessages[key];
      }
    });

    return { fulfilled, failed };
  }

  validate(password: string, _args: ValidationArguments): boolean {
    const criteria: PasswordCriteria = Object.keys(
      IsStrongPasswordConstraint.criteriaPatterns,
    ).reduce((acc, key) => {
      acc[key] =
        IsStrongPasswordConstraint.criteriaPatterns[
          key as PasswordRequirement
        ].test(password);
      return acc;
    }, {} as PasswordCriteria);

    const isValid = Object.values(criteria).every(Boolean);
    const { fulfilled, failed } = this.getCriteriaMessages(criteria);

    this.lastValidationResult = {
      isValid,
      criteria: Object.keys(criteria).reduce(
        (acc, key) => {
          acc[key as PasswordRequirement] = {
            message:
              IsStrongPasswordConstraint.criteriaMessages[
                key as PasswordRequirement
              ],
            isMet: criteria[key],
          };
          return acc;
        },
        {} as { [K in PasswordRequirement]: PasswordCriterion },
      ),
      errorDetail: isValid
        ? undefined
        : `Password must contain: ${Object.values(failed).join(', ')}`,
      failedRequirements: failed,
      fulfilledRequirements: fulfilled,
    };

    return isValid;
  }

  defaultMessage(_args: ValidationArguments): string {
    return (
      this.lastValidationResult?.errorDetail || 'Password validation failed'
    );
  }

  getLastValidationResult(): PasswordValidationResult | null {
    return this.lastValidationResult;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const constraint = new IsStrongPasswordConstraint();
  constraint.validate(password, {} as ValidationArguments);
  return (
    constraint.getLastValidationResult() || {
      isValid: false,
      criteria: Object.keys(IsStrongPasswordConstraint.criteriaMessages).reduce(
        (acc, key) => {
          acc[key as PasswordRequirement] = {
            message:
              IsStrongPasswordConstraint.criteriaMessages[
                key as PasswordRequirement
              ],
            isMet: false,
          };
          return acc;
        },
        {} as { [K in PasswordRequirement]: PasswordCriterion },
      ),
      errorDetail: `Password must contain: ${Object.values(IsStrongPasswordConstraint.criteriaMessages).join(', ')}`,
      failedRequirements: IsStrongPasswordConstraint.criteriaMessages,
      fulfilledRequirements: {},
    }
  );
}

export function formatValidationError(
  validationResult: PasswordValidationResult,
  status: number = 400,
): ValidationErrorResponse {
  return {
    message: validationResult.errorDetail || 'Password validation failed',
    status,
    errorDetails: {
      kind: 'validation',
      failed_requirements: validationResult.failedRequirements,
      fulfilled_requirements: validationResult.fulfilledRequirements,
    },
  };
}
