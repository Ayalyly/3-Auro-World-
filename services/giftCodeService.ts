import { InventoryItem } from '../types';
// @ts-ignore
import Papa from 'papaparse';

export interface GiftCodeReward {
  code: string;
  type: 'COIN' | 'ITEM' | 'SKIN' | 'NOITHAT' | 'FURNITURE';
  value: string | number;
  description: string;
}

export class GiftCodeService {
  private sheetUrl: string;

  constructor(sheetUrl: string) {
    this.sheetUrl = sheetUrl;
  }

  public async getGiftCodes(): Promise<GiftCodeReward[]> {
    if (!this.sheetUrl) {
      console.error('Gift Code Sheet URL is not valid.');
      return [];
    }

    return new Promise((resolve, reject) => {
      const url = `${this.sheetUrl}&_=${new Date().getTime()}`;
      Papa.parse(url, {
        download: true,
        header: true,
        complete: (results) => {
          if (results.errors.length) {
            console.error('Error parsing Gift Code CSV:', results.errors);
            reject(results.errors);
            return;
          }

          const codes: GiftCodeReward[] = (results.data as any[]).map(row => ({
            code: row.Code || row.code || '',
            type: (row.Type || row.type || 'COIN').toUpperCase() as any,
            value: row.Value || row.value || 0,
            description: row.Description || row.description || 'Phần quà may mắn!',
          }));
          resolve(codes.filter(c => c.code));
        },
        error: (error: any) => {
          console.error('Error fetching or parsing gift code sheet:', error);
          reject(error);
        }
      });
    });
  }
}
