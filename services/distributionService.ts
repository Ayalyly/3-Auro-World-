import { InventoryItem } from '../types';
import { FirebaseService } from './firebaseService';

/**
 * Service handling the distribution of rewards (Auro Coins and items) 
 * to character slots in both online and offline modes.
 */
export class DistributionService {
  private firebaseService: FirebaseService;

  constructor(firebaseService: FirebaseService) {
    this.firebaseService = firebaseService;
  }

  /**
   * Distributes rewards to a specific character slot.
   * @param slotId The ID of the character slot to receive rewards.
   * @param coins Number of Auro Coins to distribute.
   * @param items List of inventory items to distribute.
   * @param appMode Current application mode ('online' or 'offline').
   */
  public async distributeRewards(
    slotId: string,
    coins: number,
    items: InventoryItem[],
    appMode: 'online' | 'offline'
  ): Promise<void> {
    try {
      if (appMode === 'online') {
        const data = await this.firebaseService.loadCharacterDetail(slotId);
        if (data) {
          const charData = data.char;
          const userObj = data.user;
          const msgs = data.msgs || [];

          // Update Auro Coins
          userObj.auroCoins = (userObj.auroCoins || 0) + coins;

          // Separate furniture from regular items
          const furniture = items.filter(i => i.isFurniture);
          const regular = items.filter(i => !i.isFurniture);

          // Update inventories
          userObj.inventory = [...(userObj.inventory || []), ...regular];
          userObj.furnitureInventory = [...(userObj.furnitureInventory || []), ...furniture];

          // Save back to Firebase
          await this.firebaseService.saveCharacterToWorld(slotId, charData, userObj, msgs);
        }
      } else {
        // Offline mode: Update LocalStorage
        const saved = localStorage.getItem(`save_${slotId}`);
        if (saved) {
          const d = JSON.parse(saved);
          
          // Update Auro Coins
          d.user.auroCoins = (d.user.auroCoins || 0) + coins;

          // Separate furniture from regular items
          const furniture = items.filter(i => i.isFurniture);
          const regular = items.filter(i => !i.isFurniture);

          // Update inventories
          d.user.inventory = [...(d.user.inventory || []), ...regular];
          d.user.furnitureInventory = [...(d.user.furnitureInventory || []), ...furniture];

          // Save back to LocalStorage
          localStorage.setItem(`save_${slotId}`, JSON.stringify(d));
        }
      }
    } catch (e) {
      console.error("DistributionService Error:", e);
      throw e;
    }
  }
}
