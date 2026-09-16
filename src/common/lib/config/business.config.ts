/**
 * Business facts shown to customers. PLACEHOLDERS until the owner supplies
 * the real ones (brief, open decision 3). Everything here is public by
 * nature (it is printed on the payment screen), so it is plain config,
 * not an environment secret.
 */
export const BUSINESS = {
  name: "La Casa de Grado",
  legalName: "La Casa de Grado C.A.",
  rif: "J-00000000-0",

  /** Pago Móvil receiving account. */
  pagoMovil: {
    bank: "Banco de Venezuela",
    bankCode: "0102",
    phone: "0412-0000000",
    idNumber: "V-00000000",
  },

  /** Bank transfer receiving account. */
  bankTransfer: {
    bank: "Banco de Venezuela",
    accountNumber: "0102-0000-00-0000000000",
    accountType: "Corriente",
    holder: "La Casa de Grado C.A.",
    idNumber: "J-00000000-0",
  },

  /** What we promise on the "we're verifying" screen and in email. */
  verificationSlaHours: 24,

  /**
   * Printed photos. The business delivers prints to the institution, not
   * to the person; the institution hands them out. Past the
   * responsibility window the business no longer answers for the print.
   */
  print: {
    /** Approximate days from approval to delivery at the institution. */
    deliveryDays: 5,
    /** Days after delivery to the institution during which claims are accepted. */
    responsibilityDays: 15,
  },
} as const;
