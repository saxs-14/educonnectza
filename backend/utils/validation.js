export const validateSAId = (idNumber) => {
  if (!/^\d{13}$/.test(idNumber)) {
    return false;
  }

  const year = parseInt(idNumber.substring(0, 2), 10);
  const month = parseInt(idNumber.substring(2, 4), 10);
  const day = parseInt(idNumber.substring(4, 6), 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Luhn algorithm check for SA ID
  let sum = 0;
  let double = false;
  for (let i = idNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(idNumber.charAt(i), 10);
    if (double) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
};
