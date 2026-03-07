import { InventoryItem, GiftCode } from '../types';
// @ts-ignore
import Papa from 'papaparse';

export class GoogleSheetService {
  private shopUrl: string;

  constructor(shopUrl: string) {
    this.shopUrl = shopUrl;
  }

  public async getShopItems(): Promise<InventoryItem[]> {
    return this.fetchFromSheet<InventoryItem>(this.shopUrl, (row) => {
      // Find the interactive column dynamically to handle spaces, \r, etc.
      let interactiveUrl = '';
      let furnitureType: 'floor' | 'wall' | 'decor' | undefined;
      
      for (const key in row) {
        const val = row[key]?.toLowerCase() || '';
        const lowerKey = key.toLowerCase();
        
        if (lowerKey.includes('tương tác') || lowerKey.includes('tuong tac')) {
          interactiveUrl = row[key] || '';
        }
        
        if (lowerKey.includes('loại nội thất') || lowerKey.includes('furnituretype')) {
          if (val.includes('nền') || val.includes('floor')) furnitureType = 'floor';
          else if (val.includes('tường') || val.includes('wall')) furnitureType = 'wall';
          else if (val.includes('decor')) furnitureType = 'decor';
        }
      }

      return {
        id: row.ID || `item_${Math.random().toString(36).substr(2, 9)}`,
        name: row.Name || 'Unnamed Item',
        value: parseInt(row['Giá'], 10) || 0,
        description: row.description || 'Một món đồ nội thất.',
        icon: row.icon || 'fa-solid fa-couch',
        category: (row.Category || row.category || row['Loại'] || row['Loại '] || row['Phân loại'] || 'Furniture')?.trim() || 'Furniture',
        affinityBonus: parseInt(row.affinityBonus, 10) || 0,
        rarity: row.rarity || 'Thường',
        shopType: (row.ShopType || row.shopType || row['Nơi bán'] || row['Shop'] || 'Furniture') === 'General' || (row.ShopType || row.shopType || row['Nơi bán'] || row['Shop'] || 'Furniture') === 'Thương mại' ? 'General' : 'Furniture',
        isFurniture: (row.ShopType || row.shopType || row['Nơi bán'] || row['Shop'] || 'Furniture') !== 'General' && (row.ShopType || row.shopType || row['Nơi bán'] || row['Shop'] || 'Furniture') !== 'Thương mại',
        pixelImage: row['Link ảnh'] || row['Link ảnh '] || '',
        interactiveImage: interactiveUrl,
        isInteractive: !!interactiveUrl,
        furnitureType: furnitureType,
      };
    });
  }

  public async getGiftCodes(url: string): Promise<GiftCode[]> {
    return this.fetchFromSheet<GiftCode>(url, (row) => ({
      code: row.Code || row.code || '',
      rewardCoins: parseInt(row.RewardCoins || row.rewardCoins, 10) || 0,
      rewardItemId: row.RewardItemId || row.rewardItemId || '',
      description: row.Description || row.description || '',
    }));
  }

  private async fetchFromSheet<T>(url: string, mapper: (row: any) => T): Promise<T[]> {
    if (!url) {
      console.error('URL is not valid.');
      return [];
    }

    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          const items: T[] = (results.data as any[]).map(mapper);
          resolve(items);
        },
        error: (error: any) => {
          console.error('Error fetching or parsing sheet:', error);
          reject(error);
        }
      });
    });
  }
}
