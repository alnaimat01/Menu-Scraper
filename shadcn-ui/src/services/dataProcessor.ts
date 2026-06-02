export interface ProcessedMenuItem {
  category: string;
  name: string;
  size: string;
  price: number;
  description: string;
  choiceGroups: string;
}

export interface ProcessedChoiceGroup {
  groupName: string;
  optionName: string;
  price: number;
  oldPrice: number | null;
  min: number;
  max: number;
}