import { BadRequestException } from '@nestjs/common';

export function validateCitizenId(citizenId: string, dateOfBirth?: string, gender?: string): void {
  const trimmed = citizenId?.trim() ?? '';
  if (!trimmed) {
    throw new BadRequestException('Số CCCD là bắt buộc trong hồ sơ khi khám.');
  }
  if (!/^\d{12}$/.test(trimmed)) {
    throw new BadRequestException('Số CCCD phải có đúng 12 chữ số.');
  }
  if (/^(\d)\1{11}$/.test(trimmed)) {
    throw new BadRequestException('Số CCCD không hợp lệ (không được trùng lặp toàn bộ 12 chữ số).');
  }

  // 1. 3 số đầu tiên: Mã tỉnh, thành phố trực thuộc trung ương (từ 001 đến 096)
  const provinceCode = trimmed.slice(0, 3);
  const provinceNum = parseInt(provinceCode, 10);
  if (provinceNum < 1 || provinceNum > 96) {
    throw new BadRequestException(
      `3 chữ số đầu của CCCD (${provinceCode}) không hợp lệ. Mã tỉnh/thành phố phải nằm trong khoảng từ 001 đến 096.`,
    );
  }

  // 2 & 3. Đối chiếu thế kỷ, giới tính và 2 số cuối năm sinh nếu có thông tin
  if (dateOfBirth) {
    const birthYear = parseInt(dateOfBirth.split('-')[0], 10);
    if (!isNaN(birthYear)) {
      const centuryGenderChar = trimmed[3];
      const centuryGenderDigit = parseInt(centuryGenderChar, 10);

      let expectedMaleDigit: number;
      let expectedFemaleDigit: number;

      if (birthYear >= 1900 && birthYear <= 1999) {
        expectedMaleDigit = 0;
        expectedFemaleDigit = 1;
      } else if (birthYear >= 2000 && birthYear <= 2099) {
        expectedMaleDigit = 2;
        expectedFemaleDigit = 3;
      } else if (birthYear >= 1800 && birthYear <= 1899) {
        expectedMaleDigit = 8;
        expectedFemaleDigit = 9;
      } else if (birthYear >= 2100 && birthYear <= 2199) {
        expectedMaleDigit = 4;
        expectedFemaleDigit = 5;
      } else {
        expectedMaleDigit = 0;
        expectedFemaleDigit = 1;
      }

      if (gender === 'Nam' && centuryGenderDigit !== expectedMaleDigit) {
        throw new BadRequestException(
          `Chữ số thứ 4 của CCCD (${centuryGenderChar}) không hợp lệ với nam giới sinh năm ${birthYear}. Theo quy định pháp luật phải là chữ số ${expectedMaleDigit}.`,
        );
      } else if (gender === 'Nữ' && centuryGenderDigit !== expectedFemaleDigit) {
        throw new BadRequestException(
          `Chữ số thứ 4 của CCCD (${centuryGenderChar}) không hợp lệ với nữ giới sinh năm ${birthYear}. Theo quy định pháp luật phải là chữ số ${expectedFemaleDigit}.`,
        );
      } else if (
        gender === 'Khác' &&
        centuryGenderDigit !== expectedMaleDigit &&
        centuryGenderDigit !== expectedFemaleDigit
      ) {
        throw new BadRequestException(
          `Chữ số thứ 4 của CCCD (${centuryGenderChar}) không hợp lệ với người sinh năm ${birthYear}. Theo quy định phải là chữ số ${expectedMaleDigit} hoặc ${expectedFemaleDigit}.`,
        );
      }

      // 2 số kế tiếp: Hai số cuối của năm sinh công dân
      const yearDigits = trimmed.slice(4, 6);
      const expectedYearDigits = String(birthYear).slice(-2);
      if (yearDigits !== expectedYearDigits) {
        throw new BadRequestException(
          `Chữ số thứ 5 và 6 của CCCD (${yearDigits}) không khớp với 2 số cuối của năm sinh (${expectedYearDigits}).`,
        );
      }
    }
  }

  // 4. 6 số cuối cùng: Khoảng số ngẫu nhiên giúp phân biệt cá nhân
  const randomPart = trimmed.slice(6, 12);
  if (randomPart === '000000') {
    throw new BadRequestException('6 chữ số cuối của CCCD không được là 000000 (dãy số ngẫu nhiên không hợp lệ).');
  }
  if (/^(\d)\1{5}$/.test(randomPart)) {
    throw new BadRequestException(
      `6 chữ số cuối của CCCD (${randomPart}) không hợp lệ (không được là các chữ số lặp lại giống nhau).`,
    );
  }
  if (randomPart === '123456' || randomPart === '654321') {
    throw new BadRequestException('6 chữ số cuối của CCCD không được là dãy số liên tiếp đơn giản (123456/654321).');
  }
}
