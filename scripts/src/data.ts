export interface Party {
  name: string;
  taxId: string;
  address: string[];
  iban?: string;
  bank?: string;
  extra?: string[];
}

export interface Line {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export type Route = "invoices" | "review";
export type ReviewReason = "amounts_mismatch" | "no_text_layer";

export interface SampleInvoice {
  file: string;
  title: string;
  layout: "ua" | "de";
  supplier: Party;
  buyer: Party;
  number: string;
  /** ISO dates */
  invoiceDate: string;
  printedDate: string;
  dueDate: string | null;
  printedDueDate: string;
  currency: string;
  lines: Line[];
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  totalInWords?: string;
  vatNote?: string;
  accent: string;
  signatory?: string;
  /** Where the workflow should send it, and why. */
  route: Route;
  reviewReasons: ReviewReason[];
  scanned: boolean;
  notes: string[];
}

const LUMEN_UA: Party = {
  name: "ТОВ «Люмен Трейд»",
  taxId: "44556677",
  address: ["01033, м. Київ, вул. Саксаганського, 70, оф. 12"],
};

const LUMEN_DE: Party = {
  name: "Lumen Trade GmbH",
  taxId: "DE341207785",
  address: ["Friedrichstraße 68", "10117 Berlin", "Deutschland"],
};

export const INVOICES: SampleInvoice[] = [
  {
    file: "01-budmax-uah-vat-20.pdf",
    title: "Ukrainian supplier, UAH, ПДВ 20%",
    layout: "ua",
    supplier: {
      name: "ТОВ «Будмакс»",
      taxId: "41234567",
      address: ["02094, м. Київ, вул. Гната Хоткевича, 20"],
      iban: "UA213052990000026007015012345",
      bank: "АТ КБ «ПриватБанк»",
      extra: ["ІПН 412345626591", "Платник ПДВ на загальних підставах"],
    },
    buyer: LUMEN_UA,
    number: "INV-2026-0142",
    invoiceDate: "2026-11-03",
    printedDate: "3 листопада 2026 р.",
    dueDate: "2026-11-17",
    printedDueDate: "17 листопада 2026 р.",
    currency: "UAH",
    lines: [
      {
        description: "Цемент ПЦ II/Б-Ш-400, мішок 50 кг",
        quantity: 40,
        unit: "міш.",
        unitPrice: 180,
        amount: 7200,
      },
      {
        description: "Пісок кварцовий митий",
        quantity: 2,
        unit: "т",
        unitPrice: 650,
        amount: 1300,
      },
      {
        description: "Доставка по м. Київ",
        quantity: 1,
        unit: "посл.",
        unitPrice: 1500,
        amount: 1500,
      },
    ],
    netAmount: 10000,
    vatRate: 20,
    vatAmount: 2000,
    totalAmount: 12000,
    totalInWords: "Дванадцять тисяч гривень 00 копійок, у т.ч. ПДВ: дві тисячі гривень 00 копійок",
    accent: "#1f3a5f",
    signatory: "Бухгалтер Мельник І. В.",
    route: "invoices",
    reviewReasons: [],
    scanned: false,
    notes: ["Date written out in Ukrainian words."],
  },
  {
    file: "02-nordlicht-eur-vat-19.pdf",
    title: "EU supplier, EUR, VAT 19%",
    layout: "de",
    supplier: {
      name: "Nordlicht Bürotechnik GmbH",
      taxId: "DE298765431",
      address: ["Spaldingstraße 160", "20097 Hamburg", "Deutschland"],
      iban: "DE89370400440532013000",
      bank: "Commerzbank Hamburg",
      extra: ["Amtsgericht Hamburg HRB 145872", "Geschäftsführer: Jonas Weber"],
    },
    buyer: LUMEN_DE,
    number: "2026-11-0387",
    invoiceDate: "2026-11-03",
    printedDate: "03.11.2026",
    dueDate: "2026-11-17",
    printedDueDate: "17.11.2026",
    currency: "EUR",
    lines: [
      {
        description: "Bürostuhl „ErgoPro 300“, schwarz",
        quantity: 4,
        unit: "Stk.",
        unitPrice: 289,
        amount: 1156,
      },
      {
        description: "Monitorhalterung Dual, Tischklemme",
        quantity: 4,
        unit: "Stk.",
        unitPrice: 74.5,
        amount: 298,
      },
      {
        description: "Lieferung und Montage",
        quantity: 1,
        unit: "psch.",
        unitPrice: 120,
        amount: 120,
      },
    ],
    netAmount: 1574,
    vatRate: 19,
    vatAmount: 299.06,
    totalAmount: 1873.06,
    accent: "#0f766e",
    route: "invoices",
    reviewReasons: [],
    scanned: false,
    notes: ["German labels and number format: 1.574,00 €.", "Date as 03.11.2026."],
  },
  {
    file: "03-kovalenko-uah-no-vat.pdf",
    title: "VAT-exempt services (0%)",
    layout: "ua",
    supplier: {
      name: "ФОП Коваленко Олена Ігорівна",
      taxId: "3104512876",
      address: ["79005, м. Львів, вул. Дорошенка, 41, кв. 8"],
      iban: "UA903220010000026001330098765",
      bank: "АТ «Універсал Банк»",
      extra: ["Платник єдиного податку 3 групи"],
    },
    buyer: LUMEN_UA,
    number: "27",
    invoiceDate: "2026-11-05",
    printedDate: "05.11.2026",
    dueDate: "2026-11-15",
    printedDueDate: "15.11.2026",
    currency: "UAH",
    lines: [
      {
        description: "Дизайн інтерфейсу дашборду (UI/UX)",
        quantity: 1,
        unit: "посл.",
        unitPrice: 18000,
        amount: 18000,
      },
      {
        description: "Набір іконок для дашборду",
        quantity: 12,
        unit: "шт.",
        unitPrice: 450,
        amount: 5400,
      },
    ],
    netAmount: 23400,
    vatRate: 0,
    vatAmount: 0,
    totalAmount: 23400,
    totalInWords: "Двадцять три тисячі чотириста гривень 00 копійок, без ПДВ",
    vatNote: "Без ПДВ. Постачальник не є платником ПДВ.",
    accent: "#7c3aed",
    signatory: "ФОП Коваленко О. І.",
    route: "invoices",
    reviewReasons: [],
    scanned: false,
    notes: ["Sole proprietor, not registered for VAT."],
  },
  {
    file: "04-ofis-plus-amounts-mismatch.pdf",
    title: "Net + VAT doesn't match the total",
    layout: "ua",
    supplier: {
      name: "ТОВ «Офіс Плюс»",
      taxId: "38765412",
      address: ["79008, м. Львів, пл. Ринок, 14"],
      iban: "UA563348510000026009120044781",
      bank: "АТ «ПУМБ»",
      extra: ["ІПН 387654113045", "Платник ПДВ на загальних підставах"],
    },
    buyer: LUMEN_UA,
    number: "ОП-5531",
    invoiceDate: "2026-11-06",
    printedDate: "06.11.2026",
    dueDate: "2026-11-13",
    printedDueDate: "13.11.2026",
    currency: "UAH",
    lines: [
      {
        description: "Папір офісний А4, 80 г/м², 500 арк.",
        quantity: 30,
        unit: "пач.",
        unitPrice: 215,
        amount: 6450,
      },
      {
        description: "Картридж лазерний HP 59A (CF259A)",
        quantity: 2,
        unit: "шт.",
        unitPrice: 1000,
        amount: 2000,
      },
    ],
    netAmount: 8450,
    vatRate: 20,
    vatAmount: 1690,
    // 8450 + 1690 is 10140. The printed total is 100 more.
    totalAmount: 10240,
    totalInWords:
      "Десять тисяч двісті сорок гривень 00 копійок, у т.ч. ПДВ: одна тисяча шістсот дев'яносто гривень 00 копійок",
    accent: "#b45309",
    signatory: "Менеджер Ткачук Р. С.",
    route: "review",
    reviewReasons: ["amounts_mismatch"],
    scanned: false,
    notes: ["Printed total is 10 240,00; net + VAT is 10 140,00."],
  },
  {
    file: "05-tekhnoservis-scanned.pdf",
    title: "Scanned image, no text layer",
    layout: "ua",
    supplier: {
      name: "ТОВ «ТехноСервіс Груп»",
      taxId: "40917355",
      address: ["61002, м. Харків, вул. Сумська, 88"],
      iban: "UA713510050000026004878321654",
      bank: "АТ «Укрсиббанк»",
      extra: ["ІПН 409173520318", "Платник ПДВ на загальних підставах"],
    },
    buyer: LUMEN_UA,
    number: "ТС-0918",
    invoiceDate: "2026-11-07",
    printedDate: "07.11.2026",
    dueDate: "2026-11-21",
    printedDueDate: "21.11.2026",
    currency: "UAH",
    lines: [
      {
        description: "Технічне обслуговування кондиціонерів",
        quantity: 6,
        unit: "посл.",
        unitPrice: 850,
        amount: 5100,
      },
      {
        description: "Заправка фреоном R410A",
        quantity: 2,
        unit: "посл.",
        unitPrice: 1200,
        amount: 2400,
      },
    ],
    netAmount: 7500,
    vatRate: 20,
    vatAmount: 1500,
    totalAmount: 9000,
    totalInWords:
      "Дев'ять тисяч гривень 00 копійок, у т.ч. ПДВ: одна тисяча п'ятсот гривень 00 копійок",
    accent: "#334155",
    signatory: "Директор Бондар В. П.",
    route: "review",
    reviewReasons: ["no_text_layer"],
    scanned: true,
    notes: ["A photo of the page: no text to extract, so it goes straight to review."],
  },
];
