
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  SectionType
} from "docx";
import { StructuredPaper } from "./geminiService";

const toRoman = (num: number): string => {
  const lookup: { [key: string]: number } = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  for (let i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
};

export const generateIEEEDoc = async (data: StructuredPaper): Promise<Blob> => {
  const pageProperties = {
    size: {
      width: "210mm",
      height: "297mm",
    },
    margin: {
      top: "19.1mm", 
      bottom: "19.1mm",
      left: "19.1mm",
      right: "19.1mm",
    },
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: pageProperties,
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: (data.title || "Untitled Paper").toUpperCase(),
                size: 48, 
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: Array.isArray(data.authors) ? data.authors.join(", ") : (data.authors || "Authors TBD"),
                size: 22, 
                font: "Times New Roman",
              }),
            ],
          }),
        ],
      },
      {
        properties: {
          page: pageProperties,
          type: SectionType.CONTINUOUS,
          column: {
            count: 2,
            space: "6.35mm",
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: "Abstract—",
                bold: true,
                italics: true,
                size: 18, 
                font: "Times New Roman",
              }),
              new TextRun({
                text: data.abstract || "No abstract provided.",
                italics: true,
                size: 18,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: "Index Terms—",
                bold: true,
                italics: true,
                size: 18,
                font: "Times New Roman",
              }),
              new TextRun({
                text: Array.isArray(data.keywords) ? data.keywords.join(", ") : "Keywords not specified",
                size: 18,
                font: "Times New Roman",
              }),
            ],
          }),
          ...(data.sections || []).flatMap((section, index) => {
            const romanNumeral = toRoman(index + 1);
            return [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 80 },
                children: [
                  new TextRun({
                    text: `${romanNumeral}. ${(section.heading || "").toUpperCase()}`,
                    smallCaps: true,
                    size: 20, 
                    font: "Times New Roman",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: section.content || "",
                    size: 20, 
                    font: "Times New Roman",
                  }),
                ],
              }),
            ];
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 150 },
            children: [
              new TextRun({
                text: "REFERENCES",
                smallCaps: true,
                size: 16, 
                font: "Times New Roman",
              }),
            ],
          }),
          ...(data.references || []).map((ref, idx) => 
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: ref.trim().startsWith('[') ? ref : `[${idx + 1}] ${ref}`,
                  size: 16, 
                  font: "Times New Roman",
                }),
              ],
            })
          ),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
};
