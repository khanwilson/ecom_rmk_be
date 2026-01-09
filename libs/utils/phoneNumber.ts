import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

export interface PhoneNumberInfo {
  phoneFormatted: string;
  phoneCode: string;
  phoneNumber: string;
  phoneCountry: string;
  isValid: true;
}

/**
 * Process phone number: validate, parse and format
 * @param phoneNumber - Phone number to process (e.g., '+84901234567', '0901234567')
 * @param phoneCountry - ISO 3166-1 alpha-2 country code (e.g., 'VN', 'US')
 * @returns Phone number info object if valid, undefined if invalid
 * @example
 * processPhoneNumber('+84901234567', 'VN')
 * returns { phoneFormatted: '+84901234567', phoneCode: '84', phoneNumber: '901234567', phoneCountry: 'VN', isValid: true }
 *
 * processPhoneNumber('0901234567', 'VN')
 * returns { phoneFormatted: '+84901234567', phoneCode: '84', phoneNumber: '901234567', phoneCountry: 'VN', isValid: true }
 *
 * processPhoneNumber('901234567', 'VN')
 * returns { phoneFormatted: '+84901234567', phoneCode: '84', phoneNumber: '901234567', phoneCountry: 'VN', isValid: true }
 *
 * processPhoneNumber('123', 'VN')
 * returns undefined (invalid phone number)
 */
export function processPhoneNumber(
  phoneNumber: string,
  phoneCountry: string
): PhoneNumberInfo | undefined {
  try {
    const parsed = parsePhoneNumberFromString(
      phoneNumber,
      phoneCountry.toUpperCase() as CountryCode
    );

    if (!parsed || !parsed.isValid()) {
      return;
    }

    return {
      isValid: true,
      phoneFormatted: parsed.format('E.164'),
      phoneCode: parsed.countryCallingCode,
      phoneNumber: parsed.nationalNumber,
      phoneCountry: parsed.country || phoneCountry.toUpperCase(),
    };
  } catch (error) {
    console.error('Error processing phone number:', error);
    return undefined;
  }
}
